/**
 * Metrics helper utilities for analytics computations.
 *
 * Provides safe arithmetic and common metric calculations.
 */

/**
 * Safe division — returns 0 when divisor is 0.
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} [decimals=2] - digits after the decimal point
 * @returns {number}
 */
export function safeDivide(numerator, denominator, decimals = 2) {
  if (!denominator || denominator === 0) return 0;
  return parseFloat((numerator / denominator).toFixed(decimals));
}

/**
 * Compute a percentage rate.
 * @param {number} part
 * @param {number} total
 * @param {number} [decimals=1]
 * @returns {number} percentage 0–100
 */
export function rate(part, total, decimals = 1) {
  return safeDivide(part * 100, total, decimals);
}

/**
 * Count occurrences of each value for a given key in an array of objects.
 * @param {Array<Object>} items
 * @param {string} key
 * @returns {Array<{label: string, count: number}>}
 */
export function countByField(items, key) {
  const map = {};
  for (const item of items) {
    const val = item[key] ?? 'unknown';
    map[val] = (map[val] || 0) + 1;
  }
  return Object.entries(map).map(([label, count]) => ({ label, count }));
}

/**
 * Compute the average of an array of numbers.
 * @param {number[]} values
 * @param {number} [decimals=2]
 * @returns {number|null} null when array is empty
 */
export function average(values, decimals = 2) {
  if (!values || values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return safeDivide(sum, values.length, decimals);
}

/**
 * Compute the median of an array of numbers.
 * @param {number[]} values
 * @returns {number|null} null when array is empty
 */
export function median(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Compute difference in hours between two dates.
 * @param {Date|string} start
 * @param {Date|string} end
 * @returns {number}
 */
export function diffHours(start, end) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms / (1000 * 60 * 60);
}
