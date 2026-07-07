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
