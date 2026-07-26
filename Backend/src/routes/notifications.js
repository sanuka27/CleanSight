/**
 * Notification Routes
 *
 * POST /api/notifications/fcm-token        – register a device FCM token
 * DELETE /api/notifications/fcm-token      – unregister (logout / permission revoked)
 * GET  /api/notifications/preferences      – get notification preferences
 * PATCH /api/notifications/preferences     – update notification preferences
 */

import express from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @openapi
 * /api/notifications/fcm-token:
 *   post:
 *     summary: Register a device FCM token
 *     description: |
 *       Registers a Firebase Cloud Messaging (FCM) device token for the authenticated user.
 *       Safe to call multiple times — duplicate tokens are automatically deduplicated.
 *       A maximum of 10 tokens are stored per user; the oldest is evicted when the limit is reached.
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device registration token
 *                 example: fXyzAbc123...
 *     responses:
 *       200:
 *         description: FCM token registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: FCM token registered }
 *       400:
 *         description: Token missing or invalid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Unregister a device FCM token
 *     description: Removes a specific FCM token from the user's registered tokens. Typically called on logout or when notification permission is revoked.
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 example: fXyzAbc123...
 *     responses:
 *       200:
 *         description: FCM token unregistered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: FCM token unregistered }
 *       400:
 *         description: Token missing
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /api/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     description: Returns the authenticated user's push and email notification preferences.
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/NotificationPreferences' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     summary: Update notification preferences
 *     description: Updates push and/or email notification preferences for the authenticated user.
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               push: { type: boolean, example: true }
 *               email: { type: boolean, example: false }
 *     responses:
 *       200:
 *         description: Preferences updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/NotificationPreferences' }
 *       400:
 *         description: No valid fields provided
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/* ------------------------------------------------------------------
 * POST /api/notifications/fcm-token
 * Register a device FCM token for the authenticated user.
 * Safe to call multiple times — $addToSet prevents duplicates.
 * ------------------------------------------------------------------ */
router.post(
  '/fcm-token',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ success: false, message: 'FCM token is required' });
    }

    const MAX_TOKENS_PER_USER = 10;

    // Atomically add the token (deduplicated by $addToSet).
    // If the user already has MAX_TOKENS_PER_USER tokens, remove the oldest one first.
    const user = await User.findOne({ firebaseUid: req.user.firebaseUid });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    if (!user.fcmTokens.includes(token.trim())) {
      if (user.fcmTokens.length >= MAX_TOKENS_PER_USER) {
        // Evict the oldest token (first in array)
        user.fcmTokens.shift();
      }
      user.fcmTokens.push(token.trim());
      await user.save();
    }

    res.json({ success: true, message: 'FCM token registered' });
  })
);

/* ------------------------------------------------------------------
 * DELETE /api/notifications/fcm-token
 * Remove a specific FCM token (e.g. on logout or permission revoked).
 * ------------------------------------------------------------------ */
router.delete(
  '/fcm-token',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'FCM token is required' });
    }

    await User.updateOne(
      { firebaseUid: req.user.firebaseUid },
      { $pull: { fcmTokens: token.trim() } }
    );

    res.json({ success: true, message: 'FCM token unregistered' });
  })
);

/* ------------------------------------------------------------------
 * GET /api/notifications/preferences
 * ------------------------------------------------------------------ */
router.get(
  '/preferences',
  verifyToken,
  asyncHandler(async (req, res) => {
    const user = await User.findOne(
      { firebaseUid: req.user.firebaseUid },
      'notificationPreferences'
    ).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    res.json({
      success: true,
      data: user.notificationPreferences ?? { push: true, email: true },
    });
  })
);

/* ------------------------------------------------------------------
 * PATCH /api/notifications/preferences
 * Body: { push?: boolean, email?: boolean }
 * ------------------------------------------------------------------ */
router.patch(
  '/preferences',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { push, email } = req.body;
    const update = {};

    if (typeof push === 'boolean') update['notificationPreferences.push'] = push;
    if (typeof email === 'boolean') update['notificationPreferences.email'] = email;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one of: push (boolean), email (boolean)',
      });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.user.firebaseUid },
      { $set: update },
      { new: true, select: 'notificationPreferences' }
    ).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    res.json({ success: true, data: user.notificationPreferences });
  })
);

export default router;
