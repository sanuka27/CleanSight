/**
 * Middleware: validate analytics query parameters.
 *
 * Accepts `preset` (7d | 30d | 90d) OR explicit `from` / `to` ISO dates.
 * Rejects invalid date formats with 400 and sets safe defaults.
 */

const VALID_PRESETS = ['7d', '30d', '90d'];

/**
 * Returns true if `str` can be parsed into a valid Date.
 * @param {string} str
 * @returns {boolean}
 */
function isValidISODate(str) {
  const d = new Date(str);
  return !isNaN(d.getTime());
}

/**
 * Express middleware — mutates `req.query` to ensure safe defaults.
 */
export function validateAnalyticsQuery(req, res, next) {
  const { from, to, preset } = req.query;

  // If explicit dates are given, validate them
  if (from || to) {
    if (from && !isValidISODate(from)) {
      return res.status(400).json({
        success: false,
        message: `Invalid 'from' date format: "${from}". Use ISO-8601 (e.g. 2025-01-01).`,
      });
    }
    if (to && !isValidISODate(to)) {
      return res.status(400).json({
        success: false,
        message: `Invalid 'to' date format: "${to}". Use ISO-8601 (e.g. 2025-01-31).`,
      });
    }
    if (from && to && new Date(from) > new Date(to)) {
      return res.status(400).json({
        success: false,
        message: "'from' date must be before 'to' date.",
      });
    }
  }

  // Validate preset if provided
  if (preset && !VALID_PRESETS.includes(preset)) {
    return res.status(400).json({
      success: false,
      message: `Invalid preset "${preset}". Allowed values: ${VALID_PRESETS.join(', ')}.`,
    });
  }

  // Set safe default if nothing is provided
  if (!from && !to && !preset) {
    req.query.preset = '7d';
  }

  next();
}

export default validateAnalyticsQuery;
