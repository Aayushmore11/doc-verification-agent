/**
 * src/utils/validators.js
 *
 * Client-side validation helpers for KYC form fields.
 * These validate BEFORE an API call to give instant user feedback.
 *
 * All functions return { valid: boolean, message: string }.
 */

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE_MB = 10

/**
 * Validate a file upload for document submission.
 * @param {File} file
 * @returns {{ valid: boolean, message: string }}
 */
export function validateDocumentFile(file) {
  if (!file) {
    return { valid: false, message: 'Please select a file.' }
  }
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return { valid: false, message: 'Unsupported file type. Use JPG, PNG, WEBP, or PDF.' }
  }
  const sizeMB = file.size / (1024 * 1024)
  if (sizeMB > MAX_FILE_SIZE_MB) {
    return { valid: false, message: `File too large. Max size is ${MAX_FILE_SIZE_MB} MB.` }
  }
  return { valid: true, message: '' }
}

/**
 * Validate an Aadhaar number (12 digits, no spaces).
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function validateAadhaar(value) {
  const cleaned = value.replace(/\s/g, '')
  if (!/^\d{12}$/.test(cleaned)) {
    return { valid: false, message: 'Aadhaar number must be exactly 12 digits.' }
  }
  return { valid: true, message: '' }
}

/**
 * Validate an Indian PAN number.
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePAN(value) {
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.toUpperCase())) {
    return { valid: false, message: 'Invalid PAN format (e.g. ABCDE1234F).' }
  }
  return { valid: true, message: '' }
}
