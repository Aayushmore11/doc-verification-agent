/**
 * useDocumentExtraction.js
 *
 * State machine hook that orchestrates the full document extraction flow:
 *
 *   idle  ──►  uploading  ──►  processing  ──►  success
 *                │                  │
 *                └──────────────────┴──►  error
 *
 * States:
 *   idle        No file submitted yet
 *   uploading   File bytes are being sent to the server (0-100% known)
 *   processing  File arrived; AI OCR + QR + LLM running (indeterminate wait)
 *   success     Response received and stored
 *   error       Network error or 4xx/5xx from the API
 *
 * Separation of concerns:
 *   - This hook owns ALL async logic, loading states, and error handling.
 *   - The component (VerificationDemo) stays fully declarative.
 *   - extractDocument() in kycService.js owns the raw HTTP call.
 *
 * Usage:
 *   const {
 *     submit, reset,
 *     phase, uploadProgress,
 *     result, error,
 *     isIdle, isUploading, isProcessing, isSuccess, isError,
 *   } = useDocumentExtraction()
 *
 *   await submit(file)   // triggers the full flow
 *   reset()              // returns to idle, clears result/error
 */

import { useState, useCallback, useRef } from 'react'
import { extractDocument, submitElectricityBill } from '../services/kycService'

/* ─── Phase constants ────────────────────────────────────────────────────── */
export const PHASE = Object.freeze({
  IDLE:               'idle',
  UPLOADING:          'uploading',
  PROCESSING:         'processing',
  SUCCESS:            'success',
  ERROR:              'error',
  /** Backend decoded QR failed — caller must collect address proof */
  NEED_ADDRESS_PROOF: 'need_address_proof',
})

export function useDocumentExtraction() {
  const [phase,          setPhase]          = useState(PHASE.IDLE)
  const [uploadProgress, setUploadProgress] = useState(0)    // 0-100
  const [result,         setResult]         = useState(null)
  const [error,          setError]          = useState(null)

  /*
   * abortRef lets us cancel in-flight requests if the user navigates
   * away or resets while a request is pending.
   */
  const abortRef = useRef(null)

  /* ── submit ───────────────────────────────────────────────────────────
   *
   * Main entry point.  Call this with the File from UploadBox.
   *
   * Step 1 — uploading:
   *   Set phase to UPLOADING and wire the Axios onUploadProgress callback.
   *   Axios fires this callback as chunks are sent.  When progress reaches
   *   100%, Axios transitions from send to waiting for the response — but
   *   the server is still running OCR/AI, so we switch to PROCESSING.
   *
   * Step 2 — processing:
   *   At progress === 1 (100%), switch to PROCESSING to show an
   *   indeterminate spinner.  This models the server-side AI latency.
   *
   * Step 3 — success or error:
   *   When the Promise resolves, store the response.  On any rejection,
   *   extract a human-readable message and store it.
   * ─────────────────────────────────────────────────────────────────── */
  const submit = useCallback(async (aadhaarFile, panFile) => {
    if (!aadhaarFile || !panFile) return

    /* Cancel any previous in-flight request */
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    /* ── Phase: uploading ─────────────────────────────────────────── */
    setPhase(PHASE.UPLOADING)
    setUploadProgress(0)
    setResult(null)
    setError(null)

    try {
      /*
       * onUploadProgress is called by Axios as TCP packets are sent.
       * progressEvent.progress is a 0-1 float (Axios >= 1.1.0).
       * We convert it to 0-100 integer for the progress bar.
       */
      const onUploadProgress = (progressEvent) => {
        const pct = Math.round((progressEvent.progress ?? 0) * 100)
        setUploadProgress(pct)

        /*
         * Once all bytes have been sent (100%), the server starts
         * processing.  Switch to the indeterminate phase immediately
         * so the UI doesn't freeze on "100%" while AI inference runs.
         */
        if (pct >= 100) {
          setPhase(PHASE.PROCESSING)
        }
      }

      /* ── Actual API call ──────────────────────────────────────── */
      const data = await extractDocument(aadhaarFile, panFile, onUploadProgress)

      if (controller.signal.aborted) return

      /* ── Fallback: QR could not be decoded ────────────────────── */
      if (data?.status === 'NEED_ADDRESS_PROOF') {
        setResult(data)
        setPhase(PHASE.NEED_ADDRESS_PROOF)
        return
      }

      /* ── Phase: success ───────────────────────────────────────── */
      setResult(data)
      setPhase(PHASE.SUCCESS)

      try {
        const score = data?.trust_score ?? 0
        const status = score >= 80 ? 'Verified' : score >= 55 ? 'Manual Review' : 'Rejected'
        const historyItem = {
          id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          fileName: `${aadhaarFile.name} + ${panFile.name}`,
          fileSize: aadhaarFile.size + panFile.size,
          result: data,
          status: status
        }
        const rawHistory = window.localStorage.getItem('kyc_history')
        const history = rawHistory ? JSON.parse(rawHistory) : []
        history.unshift(historyItem)
        window.localStorage.setItem('kyc_history', JSON.stringify(history))
      } catch (e) {
        console.error('[History] Failed to save verification to history:', e)
      }
    } catch (err) {
      if (controller.signal.aborted) return  // intentional cancel → ignore

      /* ── Phase: error ─────────────────────────────────────────── */
      const message = extractErrorMessage(err)
      setError(message)
      setPhase(PHASE.ERROR)
    }
  }, [])

  /* ── submitBill ───────────────────────────────────────────────────────
   *
   * Submits the Electricity Bill along with the extracted Aadhaar data.
   * Uses the same uploading/processing flow and updates the hook's states.
   * ─────────────────────────────────────────────────────────────────── */
  const submitBill = useCallback(async (billFile, aadhaarData) => {
    if (!billFile) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setPhase(PHASE.UPLOADING)
    setUploadProgress(0)
    setError(null)

    try {
      const onUploadProgress = (progressEvent) => {
        const pct = Math.round((progressEvent.progress ?? 0) * 100)
        setUploadProgress(pct)
        if (pct >= 100) {
          setPhase(PHASE.PROCESSING)
        }
      }

      const data = await submitElectricityBill(billFile, aadhaarData, onUploadProgress)

      if (controller.signal.aborted) return

      const mergedData = {
        ...data,
        parsed_data: {
          ...aadhaarData,
          document_type: 'aadhaar'
        },
        pan_data: result?.pan_data,
        identity_comparison: result?.identity_comparison,
        aadhaar_ocr_confidence: result?.ocr_confidence ?? 90
      }

      setResult(mergedData)
      setPhase(PHASE.SUCCESS)

      try {
        const score = mergedData.trust_score ?? 0
        const status = score >= 80 ? 'Verified' : score >= 55 ? 'Manual Review' : 'Rejected'
        const historyItem = {
          id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          fileName: billFile.name,
          fileSize: billFile.size,
          result: mergedData,
          status: status
        }
        const rawHistory = window.localStorage.getItem('kyc_history')
        const history = rawHistory ? JSON.parse(rawHistory) : []
        history.unshift(historyItem)
        window.localStorage.setItem('kyc_history', JSON.stringify(history))
      } catch (e) {
        console.error('[History] Failed to save verification to history:', e)
      }

      return mergedData
    } catch (err) {
      if (controller.signal.aborted) return
      const message = extractErrorMessage(err)
      setError(message)
      setPhase(PHASE.ERROR)
      throw err
    }
  }, [result])

  /* ── reset: go back to idle ─────────────────────────────────────────── */
  const reset = useCallback(() => {
    abortRef.current?.abort()
    setPhase(PHASE.IDLE)
    setUploadProgress(0)
    setResult(null)
    setError(null)
  }, [])

  /* ── Derived booleans ───────────────────────────────────────────────── */
  const isIdle             = phase === PHASE.IDLE
  const isUploading        = phase === PHASE.UPLOADING
  const isProcessing       = phase === PHASE.PROCESSING
  const isSuccess          = phase === PHASE.SUCCESS
  const isError            = phase === PHASE.ERROR
  const isNeedAddressProof = phase === PHASE.NEED_ADDRESS_PROOF
  const isBusy             = isUploading || isProcessing

  return {
    /* Actions */
    submit,
    submitBill,
    reset,

    /* State */
    phase,
    uploadProgress,
    result,
    error,

    /* Derived flags */
    isIdle,
    isUploading,
    isProcessing,
    isSuccess,
    isError,
    isNeedAddressProof,
    isBusy,
  }
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Extract the most useful error message from an Axios error.
 * Priority: server detail string > server message > network error > fallback
 *
 * FastAPI raises HTTPException with:
 *   { detail: string | { status, message } }
 */
function extractErrorMessage(err) {
  const detail = err?.response?.data?.detail

  if (typeof detail === 'string') return detail

  if (detail && typeof detail === 'object') {
    return detail.message || detail.status || JSON.stringify(detail)
  }

  if (err?.response?.status) {
    const status = err.response.status
    if (status === 400) return 'The document could not be processed. Please upload a clearer image.'
    if (status === 413) return 'File is too large for the server. Try a smaller image.'
    if (status === 422) return 'Invalid request format. Please try again.'
    if (status >= 500) return 'Server error. The backend may be starting up — retry in a moment.'
  }

  if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Make sure the FastAPI backend is running on port 8000.'
  }

  return err?.message || 'An unexpected error occurred. Please try again.'
}
