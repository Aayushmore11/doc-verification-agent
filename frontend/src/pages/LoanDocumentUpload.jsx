/**
 * LoanDocumentUpload.jsx — Loan-Type-Based Document Verification Page
 *
 * Route: /loan-verify
 *
 * This is a completely self-contained page. It does NOT touch or depend on any
 * component or state from the existing Aadhaar+PAN flow (/extract-document).
 *
 * User journey:
 *   1. Select loan type  →  GET /loan-types/{type}/required-docs
 *   2. Upload one file per required document type
 *   3. Click "Submit for Verification"  →  POST /extract-documents
 *   4. See full verification results (per-doc fields, identity comparison,
 *      verification status, trust score, risk flags)
 *
 * State machine (uiPhase):
 *   idle         — nothing selected yet
 *   loading_docs — fetching required-docs list from backend
 *   ready        — upload slots rendered, waiting for files + submit
 *   submitting   — POST in-flight (OCR + LLM running on server)
 *   success      — results panel shown
 *   error        — error banner shown
 */

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, Upload, CheckCircle2, XCircle, AlertTriangle,
  Loader2, FileText, ShieldCheck, User,
  AlertCircle, RefreshCw,
  CreditCard, Fingerprint, BookOpen, Plane,
} from 'lucide-react'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer/Footer'
import { getLoanRequiredDocs, extractLoanDocuments } from '../services/kycService'

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & LOOKUP MAPS
   ═══════════════════════════════════════════════════════════════════════════ */

/** All supported loan types with their user-facing labels */
const LOAN_TYPES = [
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'car_loan',      label: 'Car Loan' },
  { value: 'tractor_loan',  label: 'Tractor Loan' },
  { value: 'cv_loan',       label: 'Commercial Vehicle Loan' },
  { value: 'msme_loan',     label: 'MSME Loan' },
]

/** Friendly display labels for each document type */
const DOC_LABELS = {
  aadhaar:  'Aadhaar Card',
  pan:      'PAN Card',
  voter_id: 'Voter ID Card',
  passport: 'Passport',
}

/** Icon component for each document type */
const DOC_ICONS = {
  aadhaar:  Fingerprint,
  pan:      CreditCard,
  voter_id: BookOpen,
  passport: Plane,
}

/** MIME types accepted by all upload slots */
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,application/pdf'

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */

/** Safe deep-get — avoids null crashes on nested response paths */
const get = (obj, path, fallback = null) =>
  path.split('.').reduce((acc, k) => (acc != null ? acc[k] : fallback), obj) ?? fallback

/** Format a value for display — null/undefined/empty string → em-dash */
const fmt = (val) => (val != null && val !== '' ? String(val) : '—')

/** Convert bytes to a human-readable string */
const formatBytes = (bytes) => {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

/**
 * Extract a user-friendly error message from an Axios error.
 * Mirrors the same helper in useDocumentExtraction.js.
 */
function extractErrorMessage(err) {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') {
    return detail.message || detail.status || JSON.stringify(detail)
  }
  if (err?.response?.status) {
    const s = err.response.status
    if (s === 400) return 'The server rejected the request. Check that all documents are valid images.'
    if (s === 413) return 'One or more files are too large. Please upload smaller images.'
    if (s === 422) return 'Invalid request format — please try again.'
    if (s >= 500) return 'Server error — the backend may still be starting up. Retry in a moment.'
  }
  if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Make sure the FastAPI backend is running on port 8000.'
  }
  return err?.message || 'An unexpected error occurred. Please try again.'
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   Defined inline here, following the Dashboard.jsx / Home.jsx convention
   of keeping everything in one file for self-contained pages.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── VerificationStatusBadge ──────────────────────────────────────────────
 * Shows VERIFIED / REVIEW / REJECTED with matching colours and icon
 * ─────────────────────────────────────────────────────────────────────── */
function VerificationStatusBadge({ status }) {
  const styles = {
    VERIFIED: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', Icon: CheckCircle2 },
    REVIEW:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500',   Icon: AlertTriangle },
    REJECTED: { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     dot: 'bg-red-500',     Icon: XCircle },
  }
  const s = styles[status] || styles.REVIEW
  const { Icon } = s
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${s.bg} ${s.border} ${s.text}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      <Icon className="w-4 h-4" />
      {status}
    </span>
  )
}

/* ── TrustScoreRing ───────────────────────────────────────────────────────
 * Circular SVG progress ring showing the 0-100 trust score.
 * Colour: green ≥80 / amber ≥55 / red <55
 * ─────────────────────────────────────────────────────────────────────── */
function TrustScoreRing({ score }) {
  const radius = 40
  const circ   = 2 * Math.PI * radius
  const pct    = Math.min(Math.max(Number(score) || 0, 0), 100)
  const offset = circ - (pct / 100) * circ
  const color  = pct >= 80 ? '#059669' : pct >= 55 ? '#d97706' : '#dc2626'

  return (
    <div className="flex flex-col items-center gap-1 relative">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      {/* Centred score text overlaid on the ring */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-slate-800">{pct}</span>
        <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Trust</span>
      </div>
    </div>
  )
}

/* ── DocResultCard ────────────────────────────────────────────────────────
 * Accordion card for one document's extracted fields + quality warnings.
 * Expanded by default so the user sees everything at first glance.
 * ─────────────────────────────────────────────────────────────────────── */
function DocResultCard({ docType, docData }) {
  const [expanded, setExpanded] = useState(true)
  const Icon = DOC_ICONS[docType] || FileText
  const parsed  = docData?.parsed  || {}
  const quality = docData?.image_quality || {}

  /* Build rows from every non-null key in parsed */
  const fieldRows = Object.entries(parsed).filter(([, v]) => v != null && v !== '')

  /* Collect image quality warnings */
  const warnings = []
  if (quality.is_blurry)         warnings.push('Image is blurry')
  if (!quality.good_resolution)  warnings.push('Low resolution')
  if (!quality.metadata_present) warnings.push('No EXIF metadata')

  return (
    <div className="card-white overflow-hidden">
      {/* Clickable header — toggles expanded state */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Icon className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="font-bold text-slate-800">{DOC_LABELS[docType] || docType}</span>
        </div>
        <div className="flex items-center gap-2">
          {warnings.length > 0 && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-slate-100">
              {/* Extracted fields in a 2-column grid */}
              {fieldRows.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fieldRows.map(([key, value]) => (
                    <div key={key} className="bg-slate-50 rounded-xl px-4 py-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm font-semibold text-slate-800 break-all">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400 italic">No fields extracted.</p>
              )}

              {/* Quality warnings as pill tags */}
              {warnings.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {warnings.map(w => (
                    <span key={w} className="inline-flex items-center gap-1.5 text-xs font-medium
                                             text-amber-700 bg-amber-50 border border-amber-200
                                             px-3 py-1 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── MatchPill ────────────────────────────────────────────────────────────
 * Small pill showing match/mismatch for a single compared field.
 * ─────────────────────────────────────────────────────────────────────── */
function MatchPill({ label, matched }) {
  if (matched == null) return null
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold
                      px-2.5 py-0.5 rounded-full border
      ${matched
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-red-50 border-red-200 text-red-700'}`}>
      {matched ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  )
}

/* ── IdentityComparisonPanel ──────────────────────────────────────────────
 * Shows pairwise cross-document identity results.
 * Border turns red if overall_mismatch_detected === true.
 * ─────────────────────────────────────────────────────────────────────── */
function IdentityComparisonPanel({ crossChecks }) {
  const comparison = get(crossChecks, 'identity_comparison', {})
  const mismatch   = get(comparison, 'overall_mismatch_detected', false)
  const pairwise   = get(comparison, 'pairwise', {})

  return (
    <div className={`card-white p-5 border-2 ${mismatch ? 'border-red-300' : 'border-emerald-200'}`}>
      {/* Header with overall status badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-slate-800">Identity Comparison</span>
        </div>
        {mismatch ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold
                           text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
            <XCircle className="w-3.5 h-3.5" />
            Mismatch Detected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold
                           text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Identity Consistent
          </span>
        )}
      </div>

      {/* One row per document pair */}
      <div className="space-y-3">
        {Object.entries(pairwise).map(([pair, pairResult]) => {
          const [a, b] = pair.split('_vs_')
          const score  = pairResult?.identity_score

          return (
            <div key={pair} className="bg-slate-50 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {DOC_LABELS[a] || a} vs {DOC_LABELS[b] || b}
                </span>
                {score != null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                    ${score >= 0.8 ? 'bg-emerald-100 text-emerald-700'
                    : score >= 0.5 ? 'bg-amber-100 text-amber-700'
                    :                'bg-red-100 text-red-700'}`}>
                    {Math.round(score * 100)}%
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <MatchPill label="Name" matched={pairResult?.name_match} />
                <MatchPill label="DOB"  matched={pairResult?.dob_match}  />
              </div>
            </div>
          )
        })}
        {Object.keys(pairwise).length === 0 && (
          <p className="text-sm text-slate-400 italic">
            Only one document — no cross-comparison available.
          </p>
        )}
      </div>
    </div>
  )
}

/* ── RiskFlagsList ────────────────────────────────────────────────────────
 * Renders the risk_flags[] array. Returns null when the array is empty
 * so it takes up no space.
 * ─────────────────────────────────────────────────────────────────────── */
function RiskFlagsList({ flags }) {
  if (!flags || flags.length === 0) return null
  return (
    <div className="card-white p-5 border-2 border-amber-200">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <span className="font-bold text-slate-800">Risk Flags</span>
        <span className="ml-auto text-xs font-bold text-amber-700
                         bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          {flags.length}
        </span>
      </div>
      <ul className="space-y-2">
        {flags.map((flag, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
            {flag}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── UploadSlot ───────────────────────────────────────────────────────────
 * A single file-upload drop zone for one required document type.
 *
 * States:
 *   empty   — dashed border, "click or drag" prompt
 *   filled  — green border, shows filename + size + checkmark
 *
 * Supports both click-to-browse and drag-and-drop.
 * ─────────────────────────────────────────────────────────────────────── */
function UploadSlot({ docType, file, onChange }) {
  const inputRef = useRef(null)
  const Icon = DOC_ICONS[docType] || FileText

  /* Handle file drop */
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const dropped = e.dataTransfer?.files?.[0]
    if (dropped) onChange(docType, dropped)
  }, [docType, onChange])

  const handleDragOver = (e) => e.preventDefault()

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Upload ${DOC_LABELS[docType] || docType}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      className={`relative rounded-2xl border-2 border-dashed cursor-pointer
                  transition-all duration-200 select-none
        ${file
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50'}`}
    >
      {/* Hidden native file input — we drive it via the div above */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0]
          if (picked) onChange(docType, picked)
        }}
        /* Reset so the same file can be re-picked after removal */
        onClick={(e) => { e.stopPropagation(); e.target.value = null }}
      />

      <div className="flex items-center gap-4 px-5 py-4">
        {/* Doc type icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
          ${file ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
          <Icon className={`w-5 h-5 ${file ? 'text-emerald-600' : 'text-indigo-600'}`} />
        </div>

        {/* Label and file info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-700">{DOC_LABELS[docType] || docType}</p>
          {file ? (
            <p className="text-xs text-emerald-600 font-medium truncate mt-0.5">
              {file.name} · {formatBytes(file.size)}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">Click to browse or drag &amp; drop</p>
          )}
        </div>

        {/* Right-side status icon */}
        {file
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          : <Upload       className="w-5 h-5 text-slate-300     shrink-0" />
        }
      </div>
    </div>
  )
}

/* ── LoadingOverlay ───────────────────────────────────────────────────────
 * Shown while POST /extract-documents is in-flight.
 * Uses an animated indeterminate bar since server-side latency is variable.
 * ─────────────────────────────────────────────────────────────────────── */
function LoadingOverlay({ loanLabel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="card-white p-10 flex flex-col items-center gap-6 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
      <div>
        <p className="font-bold text-slate-800 text-lg">Verifying your documents…</p>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          OCR, QR decoding, and AI cross-checking for{' '}
          <span className="font-semibold text-slate-700">{loanLabel}</span>.
          This typically takes 10–30 seconds.
        </p>
      </div>
      {/* Animated indeterminate progress bar */}
      <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-indigo-500 rounded-full"
          animate={{ x: ['-100%', '250%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          style={{ width: '40%' }}
        />
      </div>
    </motion.div>
  )
}

/* ── ErrorBanner ──────────────────────────────────────────────────────────
 * Inline red alert with the error message and an optional retry button.
 * ─────────────────────────────────────────────────────────────────────── */
function ErrorBanner({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-red-50 border border-red-200 p-5 flex items-start gap-4"
    >
      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-red-700 text-sm">Verification failed</p>
        <p className="text-sm text-red-600 mt-1 break-words">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 flex items-center gap-1.5 text-sm font-semibold
                     text-red-600 hover:text-red-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LoanDocumentUpload() {
  const navigate = useNavigate()

  /* ── Page-level state ─────────────────────────────────────────────────
   *
   * uiPhase:       Controls which panel the user sees at any moment
   * selectedLoan:  The loan type value string (e.g. "car_loan")
   * requiredDocs:  Doc-type strings returned by GET /required-docs
   * uploadedFiles: { [docType]: File } — one slot per required doc
   * result:        Full response from POST /extract-documents
   * error:         Human-readable error message (null = no error)
   * ─────────────────────────────────────────────────────────────────── */
  const [uiPhase,       setUiPhase]       = useState('idle')
  const [selectedLoan,  setSelectedLoan]  = useState('')
  const [requiredDocs,  setRequiredDocs]  = useState([])
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [result,        setResult]        = useState(null)
  const [error,         setError]         = useState(null)

  /* Derived: the friendly label for the selected loan type */
  const selectedLoanLabel =
    LOAN_TYPES.find(l => l.value === selectedLoan)?.label || ''

  /* Derived: submit is only enabled when ALL doc slots have a file */
  const allSlotsFilled =
    requiredDocs.length > 0 &&
    requiredDocs.every(doc => uploadedFiles[doc] instanceof File)

  /* ── handleLoanChange ─────────────────────────────────────────────────
   *
   * Fired when the user picks a loan type from the dropdown.
   * Resets all dependent state and fetches the required-docs list.
   * ─────────────────────────────────────────────────────────────────── */
  const handleLoanChange = useCallback(async (loanType) => {
    /* Always reset child state when loan type changes */
    setSelectedLoan(loanType)
    setRequiredDocs([])
    setUploadedFiles({})
    setResult(null)
    setError(null)

    if (!loanType) { setUiPhase('idle'); return }

    /* Fetch required doc types for this loan */
    setUiPhase('loading_docs')
    try {
      const response = await getLoanRequiredDocs(loanType)
      setRequiredDocs(response.required_docs || [])
      setUiPhase('ready')
    } catch (err) {
      setError(extractErrorMessage(err))
      setUiPhase('error')
    }
  }, [])

  /* ── handleFileChange ─────────────────────────────────────────────────
   *
   * Fired by UploadSlot when the user picks or drops a file.
   * Stores the File object keyed by its docType.
   * ─────────────────────────────────────────────────────────────────── */
  const handleFileChange = useCallback((docType, file) => {
    setUploadedFiles(prev => ({ ...prev, [docType]: file }))
  }, [])

  /* ── handleSubmit ─────────────────────────────────────────────────────
   *
   * Builds the ordered doc_types + files arrays (positional pairing)
   * and calls extractLoanDocuments. requiredDocs[] is the canonical order.
   * ─────────────────────────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    if (!allSlotsFilled || uiPhase === 'submitting') return

    /* Use requiredDocs as the source of truth for ordering */
    const orderedDocTypes = requiredDocs
    const orderedFiles    = requiredDocs.map(dt => uploadedFiles[dt])

    setUiPhase('submitting')
    setError(null)
    setResult(null)

    try {
      const data = await extractLoanDocuments(
        selectedLoan,
        orderedDocTypes,
        orderedFiles,
        /* onUploadProgress — omitted; indeterminate bar covers server latency */
      )
      setResult(data)
      setUiPhase('success')

      /* ── Save to history (localStorage) ─────────────────────────────
       *
       * Mirrors the exact same pattern used in useDocumentExtraction.js
       * so both flows' results appear in the unified History view.
       *
       * Two extra optional fields (loanType, docTypes) let History.jsx
       * render a "Loan Type" badge for these entries while remaining
       * fully backwards-compatible with old records that lack them.
       * ─────────────────────────────────────────────────────────────── */
      try {
        const score  = data?.trust_score ?? 0
        /* Derive status using the same thresholds as the old flow */
        const status = score >= 80 ? 'Verified' : score >= 55 ? 'Manual Review' : 'Rejected'

        /* Build a human-readable fileName that lists every uploaded file */
        const fileNameStr = orderedFiles.map(f => f.name).join(' + ')
        const totalSize   = orderedFiles.reduce((acc, f) => acc + (f.size ?? 0), 0)

        const historyItem = {
          id:        `ver_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date().toISOString(),
          fileName:  fileNameStr,    // e.g. "aadhaar.jpg + pan.jpg + voter.jpg"
          fileSize:  totalSize,      // sum of all uploaded file sizes in bytes
          status,                    // "Verified" | "Manual Review" | "Rejected"
          result:    data,           // full /extract-documents response blob
          /* Optional loan-specific fields — old records simply won't have these */
          loanType:  selectedLoan,   // e.g. "car_loan"
          docTypes:  orderedDocTypes,// e.g. ["aadhaar", "pan", "voter_id"]
        }

        const rawHistory = window.localStorage.getItem('kyc_history')
        const history    = rawHistory ? JSON.parse(rawHistory) : []
        history.unshift(historyItem)   // newest first
        window.localStorage.setItem('kyc_history', JSON.stringify(history))
      } catch (e) {
        /* History save is non-critical — log but don't surface to the user */
        console.error('[History] Failed to save loan verification to history:', e)
      }
    } catch (err) {
      setError(extractErrorMessage(err))
      setUiPhase('error')
    }
  }, [allSlotsFilled, uiPhase, requiredDocs, uploadedFiles, selectedLoan])

  /* ── handleReset ──────────────────────────────────────────────────────
   * Lets the user try again with new files after seeing results or errors.
   * ─────────────────────────────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    setUploadedFiles({})
    setResult(null)
    setError(null)
    setUiPhase('ready')
  }, [])

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen page-bg light-dot-grid">
      <Navbar />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">

          {/* ── Page header ───────────────────────────────────────────────
           * Note: "Back to Home" button removed — this IS the homepage now.
           * ─────────────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600
                              flex items-center justify-center shadow-lg shadow-indigo-200/60">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-black text-indigo-950 tracking-tight">
                Loan Document Verification
              </h1>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Select your loan type, upload the required documents, and get an instant
              AI-powered identity verification report.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">

            {/* ── FORM PANEL (idle / loading_docs / ready / error) ───── */}
            {(['idle', 'loading_docs', 'ready', 'error'].includes(uiPhase)) && (
              <motion.div
                key="loan-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >

                {/* ── STEP 1: Loan type dropdown ────────────────────── */}
                <div className="card-white p-6">
                  <label
                    htmlFor="loan-type-select"
                    className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3"
                  >
                    Step 1 — Select Loan Type
                  </label>

                  <div className="relative">
                    <select
                      id="loan-type-select"
                      value={selectedLoan}
                      onChange={(e) => handleLoanChange(e.target.value)}
                      disabled={uiPhase === 'loading_docs'}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white
                                 px-4 py-3 pr-10 text-sm font-semibold text-slate-800
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500
                                 focus:border-indigo-300 disabled:opacity-50
                                 disabled:cursor-not-allowed cursor-pointer transition-colors
                                 hover:border-indigo-300"
                    >
                      <option value="">— Choose a loan type —</option>
                      {LOAN_TYPES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>

                    {/* Custom right-side icon (spinner or chevron) */}
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      {uiPhase === 'loading_docs'
                        ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                      }
                    </div>
                  </div>

                  {uiPhase === 'loading_docs' && (
                    <p className="text-xs text-indigo-500 font-medium mt-2 animate-pulse">
                      Fetching required documents for {selectedLoanLabel}…
                    </p>
                  )}
                </div>

                {/* ── STEP 2: Upload slots (shown when docs are ready) ─ */}
                {(uiPhase === 'ready' ||
                  (uiPhase === 'error' && requiredDocs.length > 0)) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="card-white p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Step 2 — Upload Required Documents
                      </label>
                      {/* Progress counter */}
                      <span className="text-xs text-slate-400 font-medium">
                        {requiredDocs.filter(d => uploadedFiles[d]).length}/{requiredDocs.length} uploaded
                      </span>
                    </div>

                    {/* Render one UploadSlot per required doc type */}
                    {requiredDocs.map(docType => (
                      <UploadSlot
                        key={docType}
                        docType={docType}
                        file={uploadedFiles[docType] || null}
                        onChange={handleFileChange}
                      />
                    ))}

                    {/* Show previous submit error inline (retry clears it) */}
                    {uiPhase === 'error' && error && (
                      <ErrorBanner
                        message={error}
                        onRetry={() => { setError(null); setUiPhase('ready') }}
                      />
                    )}

                    {/* ── STEP 3: Submit button ──────────────────────── */}
                    <button
                      id="loan-verify-submit"
                      onClick={handleSubmit}
                      disabled={!allSlotsFilled}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200
                        ${allSlotsFilled
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 btn-glow'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                      {allSlotsFilled
                        ? 'Submit for Verification'
                        : `Upload all ${requiredDocs.length} document${requiredDocs.length !== 1 ? 's' : ''} to continue`}
                    </button>
                  </motion.div>
                )}

                {/* Error banner for doc-fetch failures (no upload slots shown) */}
                {uiPhase === 'error' && requiredDocs.length === 0 && error && (
                  <ErrorBanner
                    message={error}
                    onRetry={() => handleLoanChange(selectedLoan)}
                  />
                )}
              </motion.div>
            )}

            {/* ── LOADING PANEL ─────────────────────────────────────── */}
            {uiPhase === 'submitting' && (
              <LoadingOverlay key="loading" loanLabel={selectedLoanLabel} />
            )}

            {/* ── RESULTS PANEL ─────────────────────────────────────── */}
            {uiPhase === 'success' && result && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >

                {/* Summary card: status badge + trust ring + score chips */}
                <div className="card-white p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Verification Result
                      </p>
                      <VerificationStatusBadge
                        status={get(result, 'verification_result.status', 'REVIEW')}
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Loan type:{' '}
                        <span className="font-semibold text-slate-700">{selectedLoanLabel}</span>
                        &nbsp;·&nbsp;
                        Score:{' '}
                        <span className="font-semibold text-slate-700">
                          {Math.round(get(result, 'verification_result.verification_score', 0))}%
                        </span>
                        &nbsp;·&nbsp;
                        OCR confidence:{' '}
                        <span className="font-semibold text-slate-700">
                          {Math.round(result.ocr_confidence ?? 0)}%
                        </span>
                      </p>

                      {/* Matched / mismatched field chips */}
                      {(() => {
                        const matched    = get(result, 'verification_result.matched_fields', [])
                        const mismatched = get(result, 'verification_result.mismatched_fields', [])
                        return (matched.length > 0 || mismatched.length > 0) ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {matched.map((f, i) => (
                              <span key={`m-${i}`}
                                className="text-[11px] font-semibold text-emerald-700
                                           bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                ✓ {typeof f === 'object' ? f.field : f}
                              </span>
                            ))}
                            {mismatched.map((f, i) => (
                              <span key={`x-${i}`}
                                className="text-[11px] font-semibold text-red-700
                                           bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                ✗ {typeof f === 'object' ? f.field : f}
                              </span>
                            ))}
                          </div>
                        ) : null
                      })()}
                    </div>

                    {/* Trust score ring */}
                    <TrustScoreRing score={result.trust_score} />
                  </div>
                </div>

                {/* Combined identity card */}
                {result.combined_identity && Object.keys(result.combined_identity).length > 0 && (
                  <div className="card-white p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-slate-800">Combined Identity</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(result.combined_identity)
                        .filter(([, v]) => v != null && v !== '')
                        .map(([key, value]) => (
                          <div key={key} className="bg-slate-50 rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                              {key.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm font-semibold text-slate-800 break-all">
                              {fmt(value)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Per-document extraction results */}
                {result.documents && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                      Extracted Document Data
                    </p>
                    {Object.entries(result.documents).map(([docType, docData]) => (
                      <DocResultCard key={docType} docType={docType} docData={docData} />
                    ))}
                  </div>
                )}

                {/* Identity cross-comparison */}
                {result.cross_checks && (
                  <IdentityComparisonPanel crossChecks={result.cross_checks} />
                )}

                {/* Risk flags */}
                <RiskFlagsList flags={result.risk_flags} />

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    id="loan-verify-reset"
                    onClick={handleReset}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                               border border-slate-200 text-sm font-semibold text-slate-600
                               hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Verify Another Batch
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700
                               text-white text-sm font-bold transition-colors shadow-sm"
                  >
                    Back to Home
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  )
}
