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

/* ─────────────────────────────────────────────────────────────────────────
 * getLoanRequiredDocs
 *
 * GET /loan-types/{loan_type}/required-docs
 *
 * Fetches the list of document types required for a given loan type.
 * This is called when the user selects a loan type in the UI so we can
 * dynamically render the correct upload slots.
 *
 * @param {string} loanType  - One of: "personal_loan" | "car_loan" |
 *                             "tractor_loan" | "cv_loan" | "msme_loan"
 * @returns {Promise<{ loan_type: string, required_docs: string[] }>}
 *
 * Example response:
 *   { "loan_type": "car_loan", "required_docs": ["aadhaar","pan","voter_id"] }
 * ─────────────────────────────────────────────────────────────────────── */
export async function getLoanRequiredDocs(loanType) {
  const { data } = await api.get(`/loan-types/${loanType}/required-docs`)
  return data
}

/* ─────────────────────────────────────────────────────────────────────────
 * extractLoanDocuments
 *
 * POST /extract-documents  (multipart/form-data)
 *
 * Sends multiple documents for a specific loan type to the backend for
 * OCR, LLM extraction, cross-checking, and trust scoring.
 *
 * ⚠️  IMPORTANT — positional pairing:
 *   The server matches files[i] to doc_types[i] by array position.
 *   We must append doc_types and files in the exact same order.
 *   We achieve this by iterating docTypes and appending both in one loop.
 *
 * @param {string}   loanType          - e.g. "car_loan"
 * @param {string[]} docTypes          - e.g. ["aadhaar","pan","voter_id"]
 * @param {File[]}   files             - File objects, SAME order as docTypes
 * @param {Function} onUploadProgress  - Axios progress callback (optional)
 * @returns {Promise<LoanVerificationResult>}
 *
 * LoanVerificationResult shape (mirrors FastAPI response):
 * {
 *   loan_type:        string,
 *   documents:        { [docType]: { parsed, image_quality, ocr } },
 *   cross_checks:     { qr_verification, identity_comparison },
 *   combined_identity:{ full_name, date_of_birth, aadhaar_number, ... },
 *   verification_result: { status, verification_score, matched_fields,
 *                          mismatched_fields },
 *   trust_score:      number,
 *   ocr_confidence:   number,
 *   risk_flags:       string[],
 * }
 * ─────────────────────────────────────────────────────────────────────── */
export async function extractLoanDocuments(loanType, docTypes, files, onUploadProgress) {
  /* Build the multipart body step-by-step */
  const formData = new FormData()

  /* Step 1: add the loan type as a plain string field */
  formData.append('loan_type', loanType)

  /*
   * Step 2: add doc_types and files together in one loop so their
   * array positions always match — the backend pairs them positionally.
   * Both keys are repeated (same key, multiple values) per FastAPI's
   * List[str] / List[UploadFile] multipart convention.
   */
  docTypes.forEach((docType, idx) => {
    formData.append('doc_types', docType)   // repeated key → List[str] server-side
    formData.append('files', files[idx])    // repeated key → List[UploadFile] server-side
  })

  const { data } = await api.post('/extract-documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,          // Axios fires this as bytes are sent
    timeout: 180_000,          // 3 min — OCR + LLM across multiple docs
  })

  return data
}
