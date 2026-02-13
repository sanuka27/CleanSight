/**
 * Shared report status constants.
 */

export const REPORT_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  RESOLVED: 'resolved',
};

/** Valid status transition map. */
export const STATUS_TRANSITIONS = {
  [REPORT_STATUS.PENDING]: [REPORT_STATUS.ASSIGNED],
  [REPORT_STATUS.ASSIGNED]: [REPORT_STATUS.RESOLVED],
  [REPORT_STATUS.RESOLVED]: [],
};

/** All valid statuses as an array. */
export const ALL_STATUSES = Object.values(REPORT_STATUS);

/**
 * Check if a status transition is valid.
 * @param {string} current
 * @param {string} next
 * @returns {boolean}
 */
export function isValidTransition(current, next) {
  return STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

export default REPORT_STATUS;
