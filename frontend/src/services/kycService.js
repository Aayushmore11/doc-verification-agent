/**
 * src/services/kycService.js
 *
 * All KYC-related API calls.  Every function uses the shared Axios
 * instance (api.js) so auth headers and base URL are set once.
 *
 * Functions return unwrapped `response.data` — callers never
 * touch the raw Axios response object.
 */

import api from './api'

/* ─────────────────────────────────────────────────────────────────────────
 * extractDocument
 *
 * POST /extract-document
 *
 * Sends a single image file as multipart/form-data.
 * The FastAPI endpoint expects the field name to be "file".
 *
 * Why not JSON?
 *   Binary file data cannot be sent as JSON.  multipart/form-data is the
 *   standard for file uploads and lets the browser handle chunking.
 *
 * @param {File}     file              - The image File object from UploadBox
 * @param {Function} onUploadProgress  - Axios progress callback
 *                                       receives (progressEvent) where
 *                                       progressEvent.progress is 0-1
 * @returns {Promise<ExtractionResult>}
 *
 * ExtractionResult shape (mirrors FastAPI response exactly):
 * {
 *   raw_text:            string,
 *   ocr_confidence:      number,           // 0-100
 *   image_quality: {
 *     width:             number,
 *     height:            number,
 *     good_resolution:   boolean,
 *     blur_score:        number,
 *     is_blurry:         boolean,
 *     metadata_present:  boolean,
 *     government_text_present?: boolean,   // Aadhaar only
 *     uidai_present?:    boolean,          // Aadhaar only
 *     pan_header_present?: boolean,        // PAN only
 *   },
 *   trust_score:         number,           // 0-100
 *   qr_data:             object | null,
 *   comparison:          object | null,
 *   risk_flags:          string[],
 *   parsed_data: {
 *     document_type:     'aadhaar' | 'pan card' | 'unknown',
 *     aadhaar_number?:   string,
 *     pan_card_number?:  string,
 *     date_of_birth?:    string,           // YYYY-MM-DD
 *     full_name?:        string,
 *     // …any other LLM-extracted fields
 *   },
 *   payload_length:      number | null,
 *   payload_preview:     string | null,
 *   verification_result: object,
 * }
 * ─────────────────────────────────────────────────────────────────────── */
export async function extractDocument(aadhaarFile, panFile, onUploadProgress) {
  /* Build the multipart body — field name MUST match FastAPI parameter */
  const formData = new FormData()
  formData.append('aadhaar', aadhaarFile)
  formData.append('pan', panFile)

  const { data } = await api.post('/extract-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,       // Axios calls this while bytes are in-flight
    timeout: 120_000,       // 2 min — AI inference can be slow on first call
  })

  return data
}

/* ─────────────────────────────────────────────────────────────────────────
 * Legacy stubs — kept for future use, not yet wired to real endpoints
 * ─────────────────────────────────────────────────────────────────────── */

/**
 * Fetch verification result by session ID.
 * @param {string} sessionId
 */
export async function getVerificationResult(sessionId) {
  const { data } = await api.get(`/kyc/result/${sessionId}`)
  return data
}

/* ─────────────────────────────────────────────────────────────────────────
 * submitElectricityBill
 *
 * Sends the Electricity Bill image file and the previously extracted
 * Aadhaar data to the backend for verification.
 *
 * @param {File}   file        - The Electricity Bill image file
 * @param {object} aadhaarData - The aadhaar_data returned with the fallback
 * @param {Function} [onUploadProgress] - Axios progress callback (optional)
 * @returns {Promise<object>}
 * ─────────────────────────────────────────────────────────────────────── */
export async function submitElectricityBill(file, aadhaarData, onUploadProgress) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('aadhaar_data', JSON.stringify(aadhaarData))

  const { data } = await api.post('/verify-address-proof', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
    timeout: 120_000,
  })
  return data
}
