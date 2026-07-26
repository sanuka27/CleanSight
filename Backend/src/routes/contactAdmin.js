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

/**
 * @openapi
 * /api/admin/contact/messages:
 *   get:
 *     summary: List contact messages (admin only)
 *     description: |
 *       Returns a paginated list of contact form submissions with optional filtering
 *       by status or search query. Requires admin authentication via `x-admin-key` header
 *       or a valid admin Bearer token.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *       - AdminKey: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         description: Filter by message status
 *         schema: { type: string, enum: [new, read, replied] }
 *       - name: q
 *         in: query
 *         description: Search term for name, email, or message content
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated contact message list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 totalPages: { type: integer }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ContactMessage' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * /api/admin/contact/messages/{id}:
 *   patch:
 *     summary: Update contact message status (admin only)
 *     description: Updates the status of a specific contact message to `new`, `read`, or `replied`.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *       - AdminKey: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: MongoDB ObjectId of the contact message
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, read, replied]
 *                 example: read
 *     responses:
 *       200:
 *         description: Message status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ContactMessage' }
 *       400:
 *         description: Invalid message ID
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         description: Invalid status value
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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
