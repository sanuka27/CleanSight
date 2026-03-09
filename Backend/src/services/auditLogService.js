import AuditLog from '../models/AuditLog.js';

/**
 * Log an admin action to the audit trail.
 *
 * This function is intentionally silent on failure — audit logging
 * must never crash the main request handler.
 *
 * @param {object} options
 * @param {import('express').Request} options.req  - Express request (for ip/userAgent)
 * @param {object}  options.actor                  - req.adminUser (set by adminOnly middleware)
 * @param {string}  options.action                 - AuditLog.action enum value
 * @param {string}  options.entityType             - 'report' | 'document' | 'settings' | 'user'
 * @param {string}  options.entityId               - Mongo _id string or firebaseUid
 * @param {object}  [options.metadata={}]          - Any extra context (statusFrom, statusTo, etc.)
 */
export async function logAdminAction({ req, actor, action, entityType, entityId, metadata = {} }) {
  try {
    const ip =
      (req?.headers['x-forwarded-for']?.split(',')[0]?.trim()) ||
      req?.ip ||
      null;

    await AuditLog.create({
      actorUid:   actor?.firebaseUid || 'system',
      actorEmail: actor?.email       || null,
      actorRole:  actor?.role        || 'admin',
      action,
      entityType,
      entityId:   String(entityId),
      metadata,
      ip,
      userAgent:  req?.headers['user-agent'] || null,
    });
  } catch (err) {
    console.warn('[AuditLog] Failed to write audit log entry:', err?.message);
  }
}

export default logAdminAction;
