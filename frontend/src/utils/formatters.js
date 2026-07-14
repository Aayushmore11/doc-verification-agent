/**
 * src/utils/formatters.js
 *
 * Pure, side-effect-free formatting functions.
 *
 * Keep this file framework-agnostic — no React imports.
 * Import and use in any component or hook.
 */

/**
 * Truncate a string to a maximum length and append an ellipsis.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 50) {
  if (!str || str.length <= maxLength) return str
  return `${str.slice(0, maxLength)}…`
}

/**
 * Format a numeric confidence score (0–1) as a percentage string.
 * @param {number} score  e.g. 0.9342
 * @param {number} decimals
 * @returns {string}  e.g. "93.42%"
 */
export function formatConfidence(score, decimals = 2) {
  if (score == null) return 'N/A'
  return `${(score * 100).toFixed(decimals)}%`
}

/**
 * Format an ISO date string to a human-readable local date.
 * @param {string} isoString
 * @returns {string}
 */
export function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Convert bytes to a readable file size string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}
