/**
 * src/utils/constants.js
 *
 * Application-wide constants.
 *
 * ✅ Use here:  static values that appear in more than one file
 * ❌ Avoid:    secrets, environment vars (use .env for those)
 */

/** KYC document types accepted by the backend */
export const DOCUMENT_TYPES = {
  AADHAAR: 'aadhaar',
  PAN:     'pan',
  PASSPORT: 'passport',
  DRIVING_LICENSE: 'driving_license',
}

/** Human-readable labels for document types (for dropdowns / UI) */
export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPES.AADHAAR]:         'Aadhaar Card',
  [DOCUMENT_TYPES.PAN]:             'PAN Card',
  [DOCUMENT_TYPES.PASSPORT]:        'Passport',
  [DOCUMENT_TYPES.DRIVING_LICENSE]: 'Driving License',
}

/** Verification status codes returned by the API */
export const VERIFICATION_STATUS = {
  PENDING:  'pending',
  VERIFIED: 'verified',
  FAILED:   'failed',
  REVIEW:   'manual_review',
}

/** Routes — single source of truth, avoids magic strings in <Link> */
export const ROUTES = {
  HOME:       '/',
  VERIFY:     '/verify',
  DASHBOARD:  '/dashboard',
  RESULTS:    '/results/:id',
  NOT_FOUND:  '*',
}
