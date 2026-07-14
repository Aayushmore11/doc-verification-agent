/**
 * src/hooks/useKycVerification.js
 *
 * Custom hook that encapsulates the document verification workflow.
 *
 * Why custom hooks?
 *  - Move async logic + loading/error state OUT of components.
 *  - Keep components declarative and easy to read.
 *  - Reuse the same logic across multiple components without prop-drilling.
 *
 * Usage:
 *   const { verify, result, loading, error } = useKycVerification()
 */

import { useState, useCallback } from 'react'
import { verifyDocument } from '../services/kycService'

export function useKycVerification() {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const verify = useCallback(async (formData) => {
    setLoading(true)
    setError(null)
    try {
      const data = await verifyDocument(formData)
      setResult(data)
      return data
    } catch (err) {
      setError(err?.response?.data?.message || 'Verification failed. Please try again.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { verify, result, loading, error, reset }
}
