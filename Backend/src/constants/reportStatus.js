/**
 * Shared report status constants.
 * 
 * Report Lifecycle:
 *   pending -> verified -> assigned -> in_progress -> resolved
 *              \-> rejected (at any point before resolved)
 */

export const REPORT_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
};

/** 
 * Valid status transition map.
 * Each status maps to an array of valid next statuses.
 */
export const STATUS_TRANSITIONS = {
  [REPORT_STATUS.PENDING]: [REPORT_STATUS.VERIFIED, REPORT_STATUS.ASSIGNED, REPORT_STATUS.REJECTED],
  [REPORT_STATUS.VERIFIED]: [REPORT_STATUS.ASSIGNED, REPORT_STATUS.REJECTED],
  [REPORT_STATUS.ASSIGNED]: [REPORT_STATUS.IN_PROGRESS, REPORT_STATUS.RESOLVED, REPORT_STATUS.REJECTED],
  [REPORT_STATUS.IN_PROGRESS]: [REPORT_STATUS.RESOLVED, REPORT_STATUS.REJECTED],
  [REPORT_STATUS.RESOLVED]: [], // Terminal state
  [REPORT_STATUS.REJECTED]: [], // Terminal state
};

/** All valid statuses as an array. */
export const ALL_STATUSES = Object.values(REPORT_STATUS);

/** Active statuses (not terminal). */
export const ACTIVE_STATUSES = [
  REPORT_STATUS.PENDING,
  REPORT_STATUS.VERIFIED,
  REPORT_STATUS.ASSIGNED,
  REPORT_STATUS.IN_PROGRESS,
];

/** Terminal statuses. */
export const TERMINAL_STATUSES = [
  REPORT_STATUS.RESOLVED,
  REPORT_STATUS.REJECTED,
];

/**
 * Check if a status transition is valid.
 * @param {string} current - Current status
 * @param {string} next - Target status
 * @returns {boolean}
 */
export function isValidTransition(current, next) {
  return STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

/**
 * Check if a status is terminal (no further transitions allowed).
 * @param {string} status
 * @returns {boolean}
 */
export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Check if a status is active (can transition to other states).
 * @param {string} status
 * @returns {boolean}
 */
export function isActiveStatus(status) {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Get valid next statuses for a given current status.
 * @param {string} current
 * @returns {string[]}
 */
export function getValidNextStatuses(current) {
  return STATUS_TRANSITIONS[current] ?? [];
}

export default REPORT_STATUS;
