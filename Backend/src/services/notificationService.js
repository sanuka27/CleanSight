/**
 * Notification Service
 *
 * Handles push (Firebase Cloud Messaging) and email (Resend / Nodemailer)
 * notifications for report status change events AND report submission confirmations.
 *
 * STRATEGY
 * ─────────
 * Both channels are attempted independently. A failure in one (e.g. the user
 * has no FCM token, or the email provider is misconfigured) does NOT block the
 * other. Errors are logged, not re-thrown, so a notification failure can never
 * break the status-update response that triggered it.
 *
 * CONFIGURATION (see .env.example)
 * ─────────────
 *  EMAIL_PROVIDER=resend | nodemailer        (default: none — email disabled)
 *  RESEND_API_KEY=re_xxxxx                   (required when provider=resend)
 *  EMAIL_FROM=notifications@yourdomain.com
 *  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS  (required when provider=nodemailer)
 *  NOTIFICATIONS_ENABLED=true                (master kill-switch, default: true)
 */

import admin from 'firebase-admin';
import logger from '../config/logger.js';

// ── Email provider (lazy-loaded so missing config only warns, not crashes) ───

let emailSend = null; // (payload) => Promise<void>

async function initEmailProvider() {
  if (emailSend) return; // already initialised

  const provider = process.env.EMAIL_PROVIDER?.toLowerCase();

  if (!provider || provider === 'none') {
    // Email disabled — no-op
    emailSend = async () => {};
    return;
  }

  if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      logger.warn('[notify] EMAIL_PROVIDER=resend but RESEND_API_KEY is not set. Email disabled.');
      emailSend = async () => {};
      return;
    }
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);
      emailSend = async ({ to, subject, html }) => {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'CleanSight <notifications@cleansight.app>',
          to,
          subject,
          html,
        });
      };
      logger.info('[notify] Email provider: Resend ✓');
    } catch (err) {
      logger.error('[notify] Failed to initialise Resend', { error: err.message });
      emailSend = async () => {};
    }
    return;
  }

  if (provider === 'nodemailer') {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      logger.warn('[notify] EMAIL_PROVIDER=nodemailer but SMTP_HOST/SMTP_USER/SMTP_PASS are missing. Email disabled.');
      emailSend = async () => {};
      return;
    }

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      emailSend = async ({ to, subject, html }) => {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || `CleanSight <${user}>`,
          to,
          subject,
          html,
        });
      };
      logger.info('[notify] Email provider: Nodemailer (SMTP) ✓');
    } catch (err) {
      logger.error('[notify] Failed to initialise Nodemailer', { error: err.message });
      emailSend = async () => {};
    }
    return;
  }

  logger.warn(`[notify] Unknown EMAIL_PROVIDER — email disabled`, { provider });
  emailSend = async () => {};
}

// ── Status metadata ───────────────────────────────────────────────────────────

const STATUS_META = {
  submitted: {
    title: '📥 Report received — thank you!',
    body: "We've received your waste report and our team will review it shortly. You'll be notified as it progresses.",
    emoji: '📥',
    color: '#6366f1', // Indigo
    bgColor: '#eef2ff',
  },
  verified: {
    title: '✅ Your report is verified',
    body: 'CleanSight staff reviewed your report and confirmed it. A volunteer will be assigned soon.',
    emoji: '✅',
    color: '#10b981', // Emerald
    bgColor: '#ecfdf5',
  },
  assigned: {
    title: '🙋 Volunteer assigned',
    body: 'A CleanSight volunteer has claimed your report and is preparing for cleanup.',
    emoji: '🙋',
    color: '#3b82f6', // Blue
    bgColor: '#eff6ff',
  },
  in_progress: {
    title: '🚛 Cleanup in progress',
    body: 'The volunteer is actively cleaning up the site you reported. We will notify you once it is resolved!',
    emoji: '🚛',
    color: '#f59e0b', // Amber
    bgColor: '#fffbeb',
  },
  resolved: {
    title: '🎉 Report resolved!',
    body: 'Great news — the waste you reported has been completely cleaned up. Thank you for making your community better!',
    emoji: '🎉',
    color: '#10b981',
    bgColor: '#ecfdf5',
  },
  rejected: {
    title: 'ℹ️ Report not actioned',
    body: 'After review, your report could not be actioned at this time. Please see the app for more details.',
    emoji: 'ℹ️',
    color: '#6b7280', // Gray
    bgColor: '#f9fafb',
  },
};

// ── FCM Push Notification ─────────────────────────────────────────────────────

async function sendPushNotification({ fcmToken, status, reportId, reportTitle }) {
  if (!fcmToken) return;

  const meta = STATUS_META[status];
  if (!meta) return;

  try {
    const messaging = admin.messaging();
    await messaging.send({
      token: fcmToken,
      notification: {
        title: meta.title,
        body: meta.body,
      },
      data: {
        reportId: String(reportId),
        status,
        click_action: 'OPEN_REPORT',
      },
      webpush: {
        notification: {
          title: meta.title,
          body: meta.body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: `report-${reportId}`, // replaces previous notification for same report
          data: { reportId: String(reportId), status },
        },
        fcmOptions: {
          link: `/reports/${reportId}`,
        },
      },
    });
  } catch (err) {
    // FCM token may be stale — log but don't crash
    if (err.code === 'messaging/registration-token-not-registered') {
      logger.warn('[notify] Stale FCM token — consider pruning', { reportId });
    } else {
      logger.error('[notify] FCM send failed', { error: err.message, reportId, status });
    }
  }
}

// ── Email Notification ────────────────────────────────────────────────────────

function buildEmailHtml({ status, reportTitle, reportId, userName }) {
  const meta = STATUS_META[status];
  const appUrl = process.env.CLIENT_URL || 'http://localhost:8080';
  const reportUrl = `${appUrl}/reports/${reportId}`;
  const displayTitle = reportTitle || `Report #${String(reportId).slice(-6).toUpperCase()}`;

  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${meta.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
    body, table, td, p, a, h1, h2, h3 { font-family: 'Outfit', -apple-system, 'Segoe UI', sans-serif; }
    .hover-btn:hover { opacity: 0.9; }
    
    /* Default (Light) Styles */
    .bg-body { background-color: #f4f5f7; }
    .bg-card { background-color: #ffffff; }
    .text-main { color: #111827; }
    .text-muted { color: #4b5563; }
    
    /* Dark Mode Overrides */
    @media (prefers-color-scheme: dark) {
      body, .bg-body { background-color: #0f172a !important; }
      .bg-card { background-color: #1e293b !important; }
      .bg-hero { background-color: #0f172a !important; border-color: #334155 !important; }
      .bg-report-card { background-color: #0f172a !important; border-color: #334155 !important; }
      .bg-footer { background-color: #0f172a !important; border-color: #1e293b !important; }
      .text-main { color: #f8fafc !important; }
      .text-muted { color: #94a3b8 !important; }
      .text-sub { color: #64748b !important; }
      .border-box { border-color: #334155 !important; }
      .shadow-box { box-shadow: 0 4px 24px rgba(0,0,0,0.4) !important; }
    }
    
    @media (max-width: 600px) {
      .sm-w-full { width: 100% !important; }
      .sm-p-4 { padding: 16px !important; }
      .sm-px-6 { padding-left: 24px !important; padding-right: 24px !important; }
      .sm-pt-6 { padding-top: 24px !important; }
    }
  </style>
</head>
<body class="bg-body" style="margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #f4f5f7;">
  <table class="sm-w-full bg-body" align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f4f5f7;">
    <tr>
      <td align="center" class="sm-p-4" style="padding: 40px 16px;">
        <table class="sm-w-full bg-card shadow-box" width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); overflow: hidden;">
          
          <!-- Header Branding -->
          <tr>
            <td align="center" style="padding: 40px 0 24px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" valign="middle" width="40" height="40" style="background-color: #10b981; border-radius: 12px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">
                    <img src="https://api.iconify.design/lucide:leaf.svg?color=white" width="24" height="24" alt="Logo" style="display: block; border: 0;" />
                  </td>
                  <td style="padding-left: 12px;">
                    <h2 class="text-main" style="margin: 0; font-size: 26px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">
                      <span style="color: #10b981;">Clean</span>Sight
                    </h2>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Hero Section -->
          <tr>
            <td align="center" class="sm-px-6" style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td class="bg-hero border-box" align="center" style="padding: 32px; background-color: ${meta.bgColor}; border-radius: 16px; border: 1px solid ${meta.color}30;">
                    <div style="font-size: 56px; line-height: 1; margin-bottom: 20px;">${meta.emoji}</div>
                    <h1 class="text-main" style="margin: 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">
                      ${meta.title}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td class="sm-px-6 sm-pt-6" style="padding: 40px 40px 24px;">
              <p class="text-muted" style="margin: 0 0 16px; font-size: 16px; line-height: 26px; color: #4b5563;">
                Hi ${userName || 'there'},
              </p>
              <p class="text-muted" style="margin: 0 0 32px; font-size: 16px; line-height: 26px; color: #4b5563;">
                ${meta.body}
              </p>

              <!-- Report Card Details -->
              <table class="bg-report-card border-box" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 24px;">
                    <p class="text-sub" style="margin: 0 0 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">
                      Report Reference
                    </p>
                    <p class="text-main" style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
                      ${displayTitle}
                    </p>
                    <p class="text-sub" style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">
                      ID: #${String(reportId).slice(-8).toUpperCase()}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td class="sm-px-6" align="center" style="padding: 16px 40px 48px;">
              <a href="${reportUrl}" class="hover-btn" style="display: inline-block; padding: 16px 36px; background-color: ${meta.color}; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px ${meta.color}40; transition: all 0.2s;">
                View Report Details
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="bg-footer" style="padding: 32px 40px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
              <p class="text-main" style="margin: 0 0 12px; font-size: 15px; font-weight: 500; color: #374151;">
                Keep making a difference! 🌍
              </p>
              <p class="text-sub" style="margin: 0; font-size: 13px; line-height: 22px; color: #9ca3af;">
                You're receiving this because you submitted a waste report on <a href="${appUrl}" style="color: #10b981; text-decoration: none; font-weight: 500;">CleanSight</a>.<br>
                © ${new Date().getFullYear()} CleanSight. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

async function sendEmailNotification({ email, userName, status, reportId, reportTitle }) {
  if (!email) return;

  const meta = STATUS_META[status];
  if (!meta) return;

  await initEmailProvider();

  try {
    await emailSend({
      to: email,
      subject: meta.title,
      html: buildEmailHtml({ status, reportTitle, reportId, userName }),
    });
  } catch (err) {
    logger.error('[notify] Email send failed', { error: err.message, status });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send both push and email notifications for a report status change.
 * Safe to call without awaiting — all errors are caught internally.
 *
 * @param {object} opts
 * @param {string}  opts.status       - New report status
 * @param {string}  opts.reportId     - Report MongoDB ObjectId (as string)
 * @param {string}  [opts.reportTitle] - Human-readable report title
 * @param {string}  [opts.fcmToken]   - User's FCM device token
 * @param {string}  [opts.email]      - User's email address
 * @param {string}  [opts.userName]   - User's display name
 */
export async function notifyStatusChange({
  status,
  reportId,
  reportTitle,
  fcmToken,
  email,
  userName,
}) {
  // Master kill-switch
  if (process.env.NOTIFICATIONS_ENABLED === 'false') return;

  // Only notify on meaningful status changes
  if (!STATUS_META[status]) return;

  // Fire both channels concurrently — failures are isolated
  await Promise.allSettled([
    sendPushNotification({ fcmToken, status, reportId, reportTitle }),
    sendEmailNotification({ email, userName, status, reportId, reportTitle }),
  ]);
}

/**
 * Send a submission confirmation email to the citizen who just filed a report.
 * No push notification is sent here — this is email-only.
 * Safe to call without awaiting — all errors are caught internally.
 *
 * @param {object} opts
 * @param {string}  opts.reportId     - Report MongoDB ObjectId (as string)
 * @param {string}  [opts.reportTitle] - Human-readable report title / description snippet
 * @param {string}  [opts.email]      - Citizen's email address
 * @param {string}  [opts.userName]   - Citizen's display name
 */
export async function notifyReportSubmitted({
  reportId,
  reportTitle,
  email,
  userName,
}) {
  // Master kill-switch
  if (process.env.NOTIFICATIONS_ENABLED === 'false') return;
  if (!email) return;

  await sendEmailNotification({
    email,
    userName,
    status: 'submitted',
    reportId,
    reportTitle,
  });
}
