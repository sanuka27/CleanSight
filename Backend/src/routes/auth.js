import express from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ROLES, SELF_ASSIGNABLE_ROLES } from '../constants/roles.js';
import { authRateLimit, meRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────────────

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email);
}

function validateName(name) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 50;
}

function validatePhone(phone) {
  if (!phone) return true; // Optional
  const phoneRegex = /^[\d\s\-\+\(\)]{6,20}$/;
  return phoneRegex.test(phone);
}

function validateAvatar(avatar) {
  if (!avatar) return true; // Optional
  try {
    new URL(avatar);
    return true;
  } catch {
    return false;
  }
}

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: |
 *       Creates a MongoDB user profile linked to the authenticated Firebase UID.
 *       Must be called after the user has signed up via Firebase Authentication.
 *       If a profile already exists for this UID the existing record is returned (idempotent).
 *       **Rate limited:** 10 requests per 15 minutes per IP.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, role]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               role:
 *                 type: string
 *                 enum: [citizen, volunteer]
 *                 example: citizen
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: User registered successfully }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/UserProfile' }
 *       200:
 *         description: User already registered (idempotent)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: User already registered }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/UserProfile' }
 *       400:
 *         description: Validation error (invalid name, email, or role)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Email already in use by another account
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Register a new user (create MongoDB profile)
// ─────────────────────────────────────────────────────────────────────
router.post('/register', authRateLimit, verifyToken, asyncHandler(async (req, res) => {
  const { name, email, role } = req.body;
  const { firebaseUid } = req.user;

  // Validate required fields
  if (!name || !validateName(name)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid name (2-50 characters)',
    });
  }

  if (!email || !validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address',
    });
  }

  // Validate role input — only citizen and volunteer are self-assignable
  if (!role) {
    return res.status(400).json({
      success: false,
      message: 'Please select a role to complete registration',
    });
  }

  if (!SELF_ASSIGNABLE_ROLES.includes(role)) {
    console.warn(`Role escalation attempt by UID: ${firebaseUid}, attempted role: ${role}`);
    return res.status(400).json({
      success: false,
      message: `Invalid role selection. Valid roles: ${SELF_ASSIGNABLE_ROLES.join(', ')}`,
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists with this Firebase UID
  const existingUser = await User.findOne({ firebaseUid });
  if (existingUser) {
    return res.status(200).json({
      success: true,
      message: 'User already registered',
      data: {
        user: {
          id: existingUser._id,
          firebaseUid: existingUser.firebaseUid,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          createdAt: existingUser.createdAt,
        },
      },
    });
  }

  // Check if email is already taken by another account
  const emailTaken = await User.findOne({ email: normalizedEmail });
  if (emailTaken) {
    // If the email belongs to the same Firebase UID, treat as already registered.
    if (emailTaken.firebaseUid === firebaseUid) {
      return res.status(200).json({
        success: true,
        message: 'User already registered',
        data: {
          user: {
            id: emailTaken._id,
            firebaseUid: emailTaken.firebaseUid,
            name: emailTaken.name,
            email: emailTaken.email,
            role: emailTaken.role,
            createdAt: emailTaken.createdAt,
          },
        },
      });
    }

    const tokenEmail = req.user?.email ? req.user.email.toLowerCase().trim() : '';
    if (!tokenEmail || tokenEmail !== emailTaken.email) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Re-link the profile to the new Firebase UID (e.g., Firebase user deleted/recreated)
    emailTaken.firebaseUid = firebaseUid;
    emailTaken.name = name.trim();
    emailTaken.email = normalizedEmail;

    if (SELF_ASSIGNABLE_ROLES.includes(emailTaken.role) && SELF_ASSIGNABLE_ROLES.includes(role)) {
      emailTaken.role = role;
    }

    await emailTaken.save();

    return res.status(200).json({
      success: true,
      message: 'User re-linked successfully',
      data: {
        user: {
          id: emailTaken._id,
          firebaseUid: emailTaken.firebaseUid,
          name: emailTaken.name,
          email: emailTaken.email,
          role: emailTaken.role,
          createdAt: emailTaken.createdAt,
        },
      },
    });
  }

  // Create user in MongoDB
  const user = await User.create({
    firebaseUid,
    name: name.trim(),
    email: normalizedEmail,
    role,
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    },
  });
}));

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: |
 *       Returns the full profile of the authenticated user.
 *       Updates the `lastActiveAt` timestamp on each call.
 *       **Rate limited:** stricter per-IP limit to protect sensitive data.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/UserProfile' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Account suspended
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string, example: Account suspended }
 *                 suspended: { type: boolean, example: true }
 *                 suspendedReason: { type: string }
 *       404:
 *         description: User profile not found — registration required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string }
 *                 needsRegistration: { type: boolean, example: true }
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
// ─────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Get current user profile
// ─────────────────────────────────────────────────────────────────────
router.get('/me', meRateLimit, verifyToken, asyncHandler(async (req, res) => {
  const { firebaseUid } = req.user;

  const user = await User.findOne({ firebaseUid }).select('-__v');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User profile not found. Please complete registration.',
      needsRegistration: true,
    });
  }

  // Check if suspended
  if (user.isSuspended) {
    return res.status(403).json({
      success: false,
      message: 'Account suspended',
      suspended: true,
      suspendedReason: user.suspendedReason,
    });
  }

  // Update last active timestamp
  user.lastActiveAt = new Date();
  await user.save();

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        isVerified: user.isVerified,
        reportsSubmitted: user.reportsSubmitted,
        cleanupsCompleted: user.cleanupsCompleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
  });
}));

/**
 * @openapi
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     description: |
 *       Updates one or more of the authenticated user's editable fields:
 *       `name`, `phone`, `avatar`. Only the provided fields are changed.
 *       Suspended accounts cannot update their profile.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Jane Doe
 *               phone:
 *                 type: string
 *                 nullable: true
 *                 example: "+1-555-123-4567"
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://example.com/avatar.jpg
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Profile updated successfully }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/UserProfile' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string, example: Validation failed }
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field: { type: string }
 *                       message: { type: string }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Account suspended
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// ─────────────────────────────────────────────────────────────────────
// PUT /api/auth/profile
// Update user profile
// ─────────────────────────────────────────────────────────────────────
router.put('/profile', verifyToken, asyncHandler(async (req, res) => {
  const { firebaseUid } = req.user;
  const { name, phone, avatar } = req.body;

  // Validate inputs
  const errors = [];
  if (name !== undefined && !validateName(name)) {
    errors.push({ field: 'name', message: 'Name must be 2-50 characters' });
  }
  if (phone !== undefined && !validatePhone(phone)) {
    errors.push({ field: 'phone', message: 'Invalid phone number format' });
  }
  if (avatar !== undefined && !validateAvatar(avatar)) {
    errors.push({ field: 'avatar', message: 'Avatar must be a valid URL' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  const user = await User.findOne({ firebaseUid });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (user.isSuspended) {
    return res.status(403).json({
      success: false,
      message: 'Cannot update profile while account is suspended',
    });
  }

  // Update allowed fields
  if (name !== undefined) user.name = name.trim();
  if (phone !== undefined) user.phone = phone ? phone.trim() : null;
  if (avatar !== undefined) user.avatar = avatar || null;

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
      },
    },
  });
}));

/**
 * @openapi
 * /api/auth/check:
 *   get:
 *     summary: Check if user profile exists
 *     description: |
 *       Lightweight onboarding-gate check. Returns whether a MongoDB profile
 *       exists for the authenticated Firebase UID without returning the full
 *       profile. Used by the frontend to redirect new users to the registration flow.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Check result returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 exists: { type: boolean, example: true }
 *                 needsRegistration: { type: boolean, example: false }
 *                 role:
 *                   type: string
 *                   enum: [citizen, volunteer, staff, admin]
 *                   nullable: true
 *                 isSuspended: { type: boolean, example: false }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// ─────────────────────────────────────────────────────────────────────
// GET /api/auth/check
// Quick check if user exists in DB (for onboarding flow)
// ─────────────────────────────────────────────────────────────────────
router.get('/check', verifyToken, asyncHandler(async (req, res) => {
  const { firebaseUid } = req.user;

  const user = await User.findOne({ firebaseUid }).select('_id role isSuspended');

  if (!user) {
    return res.json({
      success: true,
      exists: false,
      needsRegistration: true,
    });
  }

  res.json({
    success: true,
    exists: true,
    role: user.role,
    isSuspended: user.isSuspended || false,
  });
}));

export default router;
