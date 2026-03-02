import { Router } from 'express';
import ContactMessage from '../models/ContactMessage.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { adminOnly } from '../middleware/adminAuth.js';

const router = Router();

// ── Validation helpers ──────────────────────────────────────────
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function validateContact(body) {
  const errors = {};
  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  const message = (body.message ?? '').trim();

  if (!name || name.length < 2) errors.name = 'Name must be at least 2 characters.';
  else if (name.length > 80) errors.name = 'Name cannot exceed 80 characters.';

  if (!email) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Please provide a valid email address.';
  else if (email.length > 120) errors.email = 'Email cannot exceed 120 characters.';

  if (!message || message.length < 5) errors.message = 'Message must be at least 5 characters.';
  else if (message.length > 2000) errors.message = 'Message cannot exceed 2000 characters.';

  return { name, email, message, errors };
}

// ── POST /api/contact ───────────────────────────────────────────
// Public — rate-limited: 10 requests per 15 minutes per IP.
router.post(
  '/',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many messages. Please wait and try again.' }),
  async (req, res) => {
    try {
      const { name, email, message, errors } = validateContact(req.body);

      if (Object.keys(errors).length > 0) {
        return res.status(422).json({ success: false, errors });
      }

      const doc = await ContactMessage.create({
        name,
        email,
        message,
        ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null,
        userAgent: req.headers['user-agent'] || null,
      });

      return res.status(201).json({
        ok: true,
        id: doc._id,
        message: 'Message received. We will get back to you soon!',
      });
    } catch (err) {
      // Mongoose validation errors
      if (err.name === 'ValidationError') {
        const errors = {};
        for (const [field, detail] of Object.entries(err.errors)) {
          errors[field] = detail.message;
        }
        return res.status(422).json({ success: false, errors });
      }

      console.error('Contact submit error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// ── GET /api/admin/contact-messages ─────────────────────────────
// Admin-only — paginated list with filters.
router.get(
  '/admin/messages',
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

// ── PATCH /api/admin/contact-messages/:id ───────────────────────
// Admin-only — update message status.
router.patch(
  '/admin/messages/:id',
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
