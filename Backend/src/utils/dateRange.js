/**
 * Date range utility for analytics query parameters.
 *
 * Parses `from`, `to`, and `preset` (7d / 30d / 90d) query params
 * and returns a UTC date range { from: Date, to: Date }.
 */

const PRESET_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/**
 * Parse a date-range from query parameters.
 *
 * Priority: explicit `from`/`to` > `preset` > default (7d).
 *
 * @param {{ from?: string, to?: string, preset?: string }} query
 * @returns {{ from: Date, to: Date }}
 */
export function parseDateRange(query = {}) {
  const { from, to, preset } = query;

  // If both explicit dates are provided, use them
  if (from && to) {
    return {
      from: startOfDayUTC(new Date(from)),
      to: endOfDayUTC(new Date(to)),
    };
  }

  // Determine days from preset (fallback: 7d)
  const days = PRESET_DAYS[preset] || PRESET_DAYS['7d'];

  const now = new Date();
  return {
    from: startOfDayUTC(subtractDays(now, days)),
    to: endOfDayUTC(now),
  };
}

/**
 * Subtract `n` days from a date.
 * @param {Date} date
 * @param {number} n
 * @returns {Date}
 */
function subtractDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

/**
 * Return the start of the day in UTC (00:00:00.000).
 * @param {Date} date
 * @returns {Date}
 */
function startOfDayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Return the end of the day in UTC (23:59:59.999).
 * @param {Date} date
 * @returns {Date}
 */
function endOfDayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export { PRESET_DAYS, startOfDayUTC, endOfDayUTC, subtractDays };
