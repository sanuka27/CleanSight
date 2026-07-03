/**
 * Contact Admin Routes
 *
 * Mounted exclusively at /api/admin/contact in server.js.
 * These endpoints are not exposed under the public /api/contact namespace.
 *
 * GET  /api/admin/contact/messages        — paginated list with filters
 * PATCH /api/admin/contact/messages/:id  — update message status
 */

import { Router } from 'express';
import ContactMessage from '../models/ContactMessage.js';
import { adminOnly } from '../middleware/adminAuth.js';

const router = Router();

// ── GET /api/admin/contact/messages ─────────────────────────────
// Admin-only — paginated list with filters.
router.get(
  '/messages',
  adminOnly,
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};
      if (req.query.status && ['new', 'read', 'replied'].includes(req.query.status)) {
        filter.status = req.query.status;
      }
      if (req.query.q) {
        const q = req.query.q.trim();
        if (q) {
          filter.$or = [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
            { message: { $regex: q, $options: 'i' } },
          ];
        }
      }

      const [total, messages] = await Promise.all([
        ContactMessage.countDocuments(filter),
        ContactMessage.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      return res.json({
        success: true,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data: messages,
      });
    } catch (err) {
      console.error('Admin list contact messages error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// ── PATCH /api/admin/contact/messages/:id ───────────────────────
// Admin-only — update message status.
router.patch(
  '/messages/:id',
  adminOnly,
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!status || !['new', 'read', 'replied'].includes(status)) {
        return res.status(422).json({
          success: false,
          message: 'Status must be one of: new, read, replied.',
        });
      }

      const doc = await ContactMessage.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      );

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Message not found.' });
      }

      return res.json({ success: true, data: doc });
    } catch (err) {
      if (err.kind === 'ObjectId') {
        return res.status(400).json({ success: false, message: 'Invalid message ID.' });
      }
      console.error('Admin patch contact message error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

export default router;
