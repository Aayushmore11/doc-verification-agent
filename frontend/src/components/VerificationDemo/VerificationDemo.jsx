/**
 * VerificationDemo.jsx
 *
 * The interactive demo section on the landing page.
 * This component is the "controller" — it owns no async logic itself.
 * It delegates to:
 *   useDocumentExtraction()  — for API state machine
 *   <UploadBox>              — for file selection + preview
 *   <UploadProgress>         — for in-flight progress/spinner
 *   <VerificationResult>     — for the structured API response
 *
 * ─── User flow ────────────────────────────────────────────────────────────
 *   1. User selects document type (Aadhaar / PAN / Passport / DL)
 *   2. User drops or picks an image in UploadBox
 *   3. User clicks "Run Verification"
 *   4. UploadProgress shows byte-transfer progress, then AI shimmer
 *   5. VerificationResult renders the structured API response
 *   6. User clicks "Verify Another Document" → everything resets
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScanLine, ChevronDown, Shield, AlertCircle, LayoutDashboard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import UploadBox          from '../UploadBox/UploadBox'
import VerificationLoader from '../VerificationLoader/VerificationLoader'
import VerificationResult from '../VerificationResult/VerificationResult'
import { useDocumentExtraction, PHASE } from '../../hooks/useDocumentExtraction'

/* ─── Document type config ───────────────────────────────────────────────── */
const DOCUMENT_TYPES = [
  { value: 'aadhaar',  label: 'Aadhaar Card',   hint: 'Front side with photo and QR code' },
  { value: 'pan',      label: 'PAN Card',        hint: 'Front side of the card' },
  { value: 'passport', label: 'Passport',        hint: 'Bio-data page (page 2)' },
  { value: 'dl',       label: 'Driving Licence', hint: 'Front side of the licence' },
]

/* ─── Document type dropdown ─────────────────────────────────────────────── */
function DocTypeSelector({ selected, onChange, disabled }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        id="demo-doc-type"
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                   border border-slate-700 bg-slate-800/60 hover:bg-slate-800
                   hover:border-slate-600 text-sm font-medium text-slate-200
                   transition-all duration-200 focus:outline-none
                   focus-visible:ring-2 focus-visible:ring-blue-500
                   disabled:opacity-40 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected.label}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -8, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0,  scaleY: 1   }}
            exit={{   opacity: 0, y: -8, scaleY: 0.9  }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ transformOrigin: 'top' }}
            className="absolute z-30 top-full mt-2 inset-x-0 rounded-xl border border-slate-700
                       bg-slate-800 shadow-xl shadow-black/40 overflow-hidden"
          >
            {DOCUMENT_TYPES.map((doc) => (
              <li
                key={doc.value}
                role="option"
                aria-selected={selected.value === doc.value}
                onClick={() => { onChange(doc); setOpen(false) }}
                className={`px-4 py-3 cursor-pointer transition-colors text-sm
                  ${selected.value === doc.value
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                <span className="font-medium">{doc.label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{doc.hint}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Inline error banner ────────────────────────────────────────────────── */
function ErrorBanner({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30
                 bg-red-500/8 text-sm text-red-300"
    >
      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold mb-0.5">Verification failed</p>
        <p className="text-xs text-red-400/80 leading-relaxed">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex-shrink-0 text-xs font-semibold text-red-300 hover:text-white
                   underline underline-offset-2 transition-colors"
      >
        Retry
      </button>
    </motion.div>
  )
}

/* ─── Main exported section ──────────────────────────────────────────────── */
export default function VerificationDemo() {
  const navigate = useNavigate()

  /* Document type selection */
  const [selectedDoc, setSelectedDoc] = useState(DOCUMENT_TYPES[0])

  /* The image file chosen in UploadBox */
  const [file, setFile] = useState(null)

  /* All API state */
  const {
    submit, reset,
    phase, uploadProgress,
    result, error,
    isIdle, isBusy, isSuccess, isError,
  } = useDocumentExtraction()

  /* ── Event handlers ─────────────────────────────────────────────────── */

  /* Called by UploadBox when a valid file is selected */
  const handleFileSelect = useCallback((f) => {
    setFile(f)
  }, [])

  /* Called by UploadBox when the user removes the file */
  const handleFileClear = useCallback(() => {
    setFile(null)
  }, [])

  /* Doc type change: also clear any previous file and results */
  const handleDocChange = useCallback((doc) => {
    setSelectedDoc(doc)
    setFile(null)
    reset()
  }, [reset])

  /* "Run Verification" clicked */
  const handleSubmit = useCallback(async () => {
    if (!file) return
    await submit(file)
  }, [file, submit])

  /* "Verify Another Document" from the result panel */
  const handleReset = useCallback(() => {
    setFile(null)
    reset()
  }, [reset])

  /* ── Derived UI state ───────────────────────────────────────────────── */
  const canSubmit  = !!file && isIdle
  const showUpload = isIdle || isError  // show UploadBox when idle or after error

  return (
    <section
      id="kyc-portal"
      className="relative min-h-screen bg-slate-950 hero-bg dot-grid overflow-hidden flex flex-col justify-center"
      aria-labelledby="demo-heading"
    >
      {/* Background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[800px] h-[600px] rounded-full bg-blue-700/8 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">

        {/* Page heading */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <h1 id="demo-heading" className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
            <span className="gradient-text">Document Verification</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Upload your document — get extracted fields, quality checks,
            and a trust score in seconds.
          </p>
        </div>

        {/* Demo card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mx-auto"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60
                          backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40">

            {/* Card header */}
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-800 bg-slate-900/80">
              <ScanLine className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-slate-200">KYC Verification Portal</span>
              <span className="text-xs text-slate-600">/ New Submission</span>
              {/* Live indicator */}
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-500">Connected</span>
              </div>
            </div>

            {/* Card body */}
            <div className="p-6 space-y-5">

              {/* Document type selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Document Type
                </label>
                <DocTypeSelector
                  selected={selectedDoc}
                  onChange={handleDocChange}
                  disabled={isBusy || isSuccess}
                />
              </div>

              {/* ── Content area: transitions between upload / progress / result */}
              <AnimatePresence mode="wait">

                {/* ── RESULT STATE ───────────────────────────────────── */}
                {isSuccess && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0  }}
                    exit={{   opacity: 0, y: -8  }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <VerificationResult result={result} onReset={handleReset} />

                    {/* Dashboard CTA */}
                    <motion.button
                      id="goto-dashboard-btn"
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="w-full flex items-center justify-center gap-2.5
                                 py-3.5 rounded-xl border border-blue-500/30
                                 bg-blue-500/8 hover:bg-blue-500/15
                                 text-sm font-semibold text-blue-400 hover:text-blue-300
                                 transition-all duration-200 focus:outline-none
                                 focus-visible:ring-2 focus-visible:ring-blue-500"
                      whileTap={{ scale: 0.98 }}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      View Full Dashboard
                    </motion.button>
                  </motion.div>
                )}

                {/* ── PROGRESS STATE ───────────────────────────────────── */}
                {isBusy && (
                  <motion.div
                    key="progress"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0  }}
                    exit={{   opacity: 0         }}
                    transition={{ duration: 0.25 }}
                  >
                    <VerificationLoader phase={phase} uploadProgress={uploadProgress} />
                  </motion.div>
                )}

                {/* ── UPLOAD / IDLE / ERROR STATE ──────────────────────── */}
                {showUpload && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0  }}
                    exit={{   opacity: 0, y: -8  }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* UploadBox */}
                    <UploadBox
                      id="demo-upload-box"
                      label={selectedDoc.hint}
                      hint="JPG, PNG, WEBP — max 10 MB"
                      maxSizeMB={10}
                      onFileSelect={handleFileSelect}
                      onClear={handleFileClear}
                      disabled={isBusy}
                    />

                    {/* Inline error banner */}
                    {isError && (
                      <ErrorBanner
                        message={error}
                        onRetry={() => { reset(); setFile(null) }}
                      />
                    )}

                    {/* Footer row */}
                    <div className="flex items-center justify-between gap-4">
                      {/* Privacy note */}
                      <p className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Shield className="w-3 h-3 flex-shrink-0" />
                        Sent over TLS · not stored permanently
                      </p>

                      {/* Submit button */}
                      <motion.button
                        id="demo-verify-btn"
                        type="button"
                        disabled={!canSubmit}
                        onClick={handleSubmit}
                        className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3
                                   text-sm font-semibold rounded-xl transition-all duration-200
                                   focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                   disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-800
                                   disabled:text-slate-500 disabled:border disabled:border-slate-700
                                   enabled:bg-blue-600 enabled:hover:bg-blue-500 enabled:text-white
                                   enabled:btn-glow"
                        whileTap={canSubmit ? { scale: 0.97 } : {}}
                      >
                        <ScanLine className="w-4 h-4" />
                        {file ? 'Run Verification' : 'Upload Document First'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
