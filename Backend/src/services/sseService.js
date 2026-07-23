/**
 * sseService.js
 *
 * Singleton in-memory SSE (Server-Sent Events) broker for the CleanSight
 * admin activity feed.
 *
 * Responsibilities:
 *   - Track every connected admin client (one EventSource per browser tab)
 *   - Broadcast structured activity events to all connected clients
 *   - Send periodic heartbeat comments to keep proxy connections alive
 *
 * Design notes:
 *   - Pure in-memory: no Redis/DB dependency — simplicity wins for a
 *     read-only, ephemeral feed. Server restart drops all clients;
 *     the browser EventSource auto-reconnects.
 *   - Broadcast is fire-and-forget: a broken client write is caught and
 *     the client is evicted immediately, never blocking healthy clients.
 *   - Heartbeat interval: 30 s (well within typical 60 s proxy timeouts).
 */

import { randomUUID } from 'crypto';
import logger from '../config/logger.js';

// Map<uid, Map<clientId, res>>
// A single admin may have multiple tabs open simultaneously.
const clients = new Map();

/** Heartbeat interval reference — kept so tests can clear it. */
let heartbeatInterval = null;

// ─────────────────────────────────────────────────────────────────────────────
// Client Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new SSE client.
 *
 * @param {string} uid       - Firebase UID of the connected admin
 * @param {import('express').Response} res - Express response object
 * @returns {string} clientId - unique ID for this connection
 */
export function addClient(uid, res) {
  const clientId = randomUUID();

  if (!clients.has(uid)) {
    clients.set(uid, new Map());
  }
  clients.get(uid).set(clientId, res);

  logger.info('[SSE] Client connected', { uid, clientId, totalClients: _totalClients() });
  return clientId;
}

/**
 * Remove a specific SSE client connection.
 *
 * @param {string} uid
 * @param {string} clientId
 */
export function removeClient(uid, clientId) {
  const userClients = clients.get(uid);
  if (!userClients) return;

  userClients.delete(clientId);
  if (userClients.size === 0) {
    clients.delete(uid);
  }

  logger.info('[SSE] Client disconnected', { uid, clientId, totalClients: _totalClients() });
}

// ─────────────────────────────────────────────────────────────────────────────
// Broadcasting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Broadcast an activity event to ALL connected admin clients.
 *
 * The event is serialised as a standard SSE frame:
 *   event: <type>\n
 *   data: <json>\n\n
 *
 * @param {ActivityEvent} event
 */
export function broadcast(event) {
  const payload = JSON.stringify(event);
  const frame = `event: ${event.type}\ndata: ${payload}\n\n`;

  for (const [uid, userClients] of clients) {
    for (const [clientId, res] of userClients) {
      try {
        res.write(frame);
      } catch (err) {
        logger.warn('[SSE] Write failed — evicting client', { uid, clientId, error: err.message });
        removeClient(uid, clientId);
      }
    }
  }
}

/**
 * Returns the current number of connected SSE clients across all UIDs.
 */
export function connectedClientCount() {
  return _totalClients();
}

// ─────────────────────────────────────────────────────────────────────────────
// Heartbeat
// ─────────────────────────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Start the heartbeat timer (called once on server startup).
 * Sends a `: heartbeat\n\n` comment to every client every 30 s.
 * SSE comments (lines starting with `:`) are ignored by the browser
 * but keep the TCP connection alive through proxies.
 */
export function startHeartbeat() {
  if (heartbeatInterval) return; // idempotent
  heartbeatInterval = setInterval(() => {
    const comment = ': heartbeat\n\n';
    for (const [uid, userClients] of clients) {
      for (const [clientId, res] of userClients) {
        try {
          res.write(comment);
        } catch (err) {
          logger.warn('[SSE] Heartbeat write failed — evicting client', { uid, clientId });
          removeClient(uid, clientId);
        }
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}

/**
 * Stop the heartbeat timer (useful for clean shutdown / tests).
 */
export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function _totalClients() {
  let n = 0;
  for (const userClients of clients.values()) n += userClients.size;
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory helpers — build well-typed event objects
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @returns {ActivityEvent}
 */
export function makeEvent(type, opts = {}) {
  return {
    id: randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    ...opts,
  };
}
