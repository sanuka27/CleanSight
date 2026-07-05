import { Router } from 'express';
import ContactMessage from '../models/ContactMessage.js';
import { contactRateLimit } from '../middleware/rateLimit.js';

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
  contactRateLimit,
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

export default router;
