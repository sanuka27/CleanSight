import express from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user (create MongoDB profile)
// @access  Protected (requires Firebase token)
router.post('/register', verifyToken, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const { firebaseUid } = req.user;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and email'
      });
    }

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
            createdAt: existingUser.createdAt
          }
        }
      });
    }

    // Create user in MongoDB
    const user = await User.create({
      firebaseUid,
      name,
      email,
      role: role || 'citizen'
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
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Protected (requires Firebase token)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { firebaseUid } = req.user;

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found. Please complete registration.'
      });
    }

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
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching profile'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Protected (requires Firebase token)
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { firebaseUid } = req.user;
    const { name, phone, avatar } = req.body;

    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

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
          phone: user.phone
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating profile'
    });
  }
});

export default router;
