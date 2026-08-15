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
  'all': 3650,
};

/**
 * Parse a date-range from query parameters.
 *
 * Priority: explicit `from`/`to` > `preset` > default (all/7d).
 *
 * @param {{ from?: string, to?: string, preset?: string, range?: string }} query
 * @returns {{ from: Date, to: Date }}
 */
export function parseDateRange(query = {}) {
  const { from, to, preset, range } = query;

  // If both explicit dates are provided, use them
  if (from && to) {
    return {
      from: startOfDayUTC(new Date(from)),
      to: endOfDayUTC(new Date(to)),
    };
  }

  const selectedPreset = preset || range;
  if (selectedPreset === 'all') {
    return {
      from: new Date('2020-01-01T00:00:00.000Z'),
      to: endOfDayUTC(new Date()),
    };
  }

  // Determine days from preset (fallback: 7d)
  const days = PRESET_DAYS[selectedPreset] || PRESET_DAYS['7d'];

  const now = new Date();
  return {
    from: startOfDayUTC(subtractDays(now, days)),
    to: endOfDayUTC(now),
  };
}

/**
 * Resolve date range from query params (alternative interface).
 * Used by admin routes with `range` param instead of `preset`.
 *
 * @param {string} range - '7d' | '30d' | '90d' | 'all' | 'custom'
 * @param {string|Date} from - Start date (ISO string or Date)
 * @param {string|Date} to - End date (ISO string or Date)
 * @returns {{ start: Date, end: Date }}
 */
export function resolveDateRange(range = 'all', from, to) {
  // If explicit from/to provided, use them
  if (from && to) {
    return {
      start: new Date(from),
      end: new Date(to),
    };
  }

  const end = new Date();
  if (range === 'all') {
    return {
      start: new Date('2020-01-01T00:00:00.000Z'),
      end,
    };
  }

  // Otherwise use range preset
  const start = new Date();
  const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
  start.setDate(start.getDate() - days);
  
  return { start, end };
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

/**
 * Get a human-readable date string.
 */
export function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Check if a date string is valid.
 */
export function isValidDateString(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export { PRESET_DAYS, startOfDayUTC, endOfDayUTC, subtractDays };
