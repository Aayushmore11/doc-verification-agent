/**
 * Home.jsx — Light-themed KYC Verification Portal
 *
 * Sections (top → bottom):
 *   Navbar  →  Hero + Features  →  Upload Card  →  How It Works  →  Footer
 *
 * Upload states managed inline:
 *   idle      → dashed upload area (cloud icon + choose file)
 *   preview   → image thumbnail + "Start Verification" CTA
 *   busy      → full-screen dark processing overlay (VerificationLoader)
 *   success   → compact result card + "View Full Dashboard" button
 *   error     → inline error banner + retry
 */

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, LayoutDashboard, History, ChevronDown,
  Upload, Cloud, FolderOpen, X, CheckCircle2,
  AlertCircle, ScanLine, ArrowRight, Lock,
  Cpu, Zap, FileImage, RotateCcw, User,
  Zap as ZapIcon, Lightbulb, FileCheck2, AlertTriangle,
} from 'lucide-react'

import Navbar                 from '../components/Navbar/Navbar'
import Footer                 from '../components/Footer/Footer'
import { useFileUpload }      from '../hooks/useFileUpload'
import { useDocumentExtraction, PHASE } from '../hooks/useDocumentExtraction'
import { formatFileSize }     from '../utils/formatters'
import VerificationLoader     from '../components/VerificationLoader/VerificationLoader'


/* ══════════════════════════════════════════════════════════════════════════
   HERO
   ══════════════════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <div className="text-center mb-14">
      {/* Trust badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                   bg-emerald-50 border border-emerald-200 mb-6"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-xs font-semibold text-emerald-700 tracking-wide">
          Secure. Compliant. Trusted.
        </span>
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.08 }}
        className="text-4xl sm:text-5xl font-black tracking-tight text-indigo-950 leading-tight mb-4"
      >
        AI-Powered KYC<br />
        <span className="gradient-text-green">Verification</span>
      </motion.h1>

      {/* Sub-heading */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="text-gray-500 text-base max-w-md mx-auto leading-relaxed"
      >
        Upload your Aadhaar document to extract details, verify authenticity,
        and get a trust score in seconds.
      </motion.p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   FEATURE CARDS ROW
   ══════════════════════════════════════════════════════════════════════════ */
const FEATURES = [
  {
    icon: ShieldCheck,
    bg:   'bg-indigo-700',
    title: 'Bank-Grade Security',
    desc:  'Your data is encrypted and protected',
  },
  {
    icon: Cpu,
    bg:   'bg-emerald-600',
    title: 'AI-Powered Accuracy',
    desc:  'OCR + QR + Database intelligence',
  },
  {
    icon: Zap,
    bg:   'bg-violet-600',
    title: 'Instant Results',
    desc:  'Get trust score and verification instantly',
  },
]

function FeatureCards() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.22 }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14 max-w-5xl mx-auto"
    >
      {FEATURES.map(({ icon: Icon, bg, title, desc }) => (
        <div
          key={title}
          className="card-white flex items-center gap-3 p-4"
        >
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 shadow-md`}>
            <Icon className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   UPLOAD AREA — light themed, 3 states
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Idle: drop zone ── */
function DropZone({ title, openPicker, dragHandlers, isDragging, handleKeyDown }) {
  return (
    <motion.div
      {...dragHandlers}
      onKeyDown={handleKeyDown}
      onClick={openPicker}
      tabIndex={0}
      role="button"
      aria-label={`${title} area — press Enter to open file picker`}
      animate={isDragging ? { scale: 1.015 } : { scale: 1 }}
      transition={{ duration: 0.15 }}
      className={`
        w-full rounded-2xl border-2 border-dashed transition-all duration-200
        flex flex-col items-center justify-center py-10 px-6 gap-4 cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
        ${isDragging
          ? 'border-indigo-400 bg-indigo-50/60'
          : 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-300 hover:bg-indigo-50/50'}
      `}
    >
      {/* Cloud icon */}
      <div className={`
        w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-200
        ${isDragging ? 'bg-indigo-100' : 'bg-indigo-50 border border-indigo-100'}
      `}>
        <Cloud className={`w-7 h-7 transition-colors ${isDragging ? 'text-indigo-500' : 'text-indigo-400'}`} strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div className="text-center space-y-1">
        <p className="text-lg font-bold text-gray-800">{title}</p>
        <p className="text-sm text-gray-500">
          {isDragging ? 'Drop it here!' : 'Drag & drop your file here or click to browse'}
        </p>
      </div>

      {/* Choose File button */}
      <motion.button
        type="button"
        onClick={(e) => { e.stopPropagation(); openPicker() }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white
                   bg-indigo-700 hover:bg-indigo-800 shadow-md shadow-indigo-200 btn-glow
                   transition-all duration-200 focus:outline-none"
        whileTap={{ scale: 0.97 }}
      >
        <Upload className="w-4 h-4" />
        Choose File
      </motion.button>

      <p className="text-xs text-gray-400">JPG, PNG, JPEG — Max 10MB</p>
    </motion.div>
  )
}

/* ── Preview state: shows thumbnail ── */
function FilePreview({ file, previewUrl, onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Thumbnail */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 aspect-[16/8]">
        <img
          src={previewUrl}
          alt="Document preview"
          className="w-full h-full object-contain"
        />
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove file"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white border border-gray-200
                     shadow-sm hover:bg-red-50 hover:border-red-200 flex items-center justify-center
                     text-gray-500 hover:text-red-500 transition-all duration-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        {/* Accepted badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1
                        rounded-lg bg-white/90 border border-emerald-200 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="w-3 h-3" />
          Ready to verify
        </div>
      </div>

      {/* File meta row */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100
                        flex items-center justify-center flex-shrink-0">
          <FileImage className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
          <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
        </div>
        <button type="button" onClick={onClear}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
          Change
        </button>
      </div>
    </motion.div>
  )
}

/* ── Error state ── */
function UploadError({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200"
    >
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-700">Verification failed</p>
        <p className="text-xs text-red-500 mt-0.5 leading-relaxed">{message}</p>
      </div>
      <button type="button" onClick={onRetry}
              className="text-xs font-semibold text-red-600 hover:text-red-800 underline">
        Retry
      </button>
    </motion.div>
  )
}

/* ── Success summary ── */
function SuccessSummary({ result, onReset, onDashboard }) {
  const score = result?.trust_score ?? 0
  const docType = result?.parsed_data?.document_type ?? '—'
  const name = result?.parsed_data?.full_name ?? result?.parsed_data?.name ?? '—'

  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 55 ? 'text-amber-500' : 'text-red-500'
  const scoreBg    = score >= 80 ? 'bg-emerald-50 border-emerald-200' : score >= 55 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  const verdict    = score >= 80 ? 'Verified' : score >= 55 ? 'Manual Review' : 'Rejected'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Verdict banner */}
      <div className={`flex items-center justify-between gap-4 p-5 rounded-2xl border ${scoreBg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${scoreBg}`}>
            <CheckCircle2 className={`w-6 h-6 ${scoreColor}`} />
          </div>
          <div>
            <p className={`text-base font-black ${scoreColor}`}>{verdict}</p>
            <p className="text-xs text-gray-500">
              {docType.toUpperCase()} · {name}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-black tabular-nums ${scoreColor}`}>
            {score}<span className="text-lg text-gray-400">/100</span>
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Trust Score</p>
        </div>
      </div>

      {/* Risk flags */}
      {result?.risk_flags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.risk_flags.map((f) => (
            <span key={f}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg
                         bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">
              <AlertCircle className="w-3 h-3" /> {f}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onReset}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200
                           bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50
                           hover:border-gray-300 transition-all duration-200">
          <RotateCcw className="w-4 h-4" />
          Verify Another
        </button>
        <button
          id="home-dashboard-btn"
          type="button"
          onClick={onDashboard}
          className="flex items-center justify-center gap-2 py-3 rounded-xl
                     bg-indigo-700 hover:bg-indigo-800 text-sm font-bold text-white
                     shadow-md shadow-indigo-200 btn-glow transition-all duration-200"
        >
          <LayoutDashboard className="w-4 h-4" />
          View Dashboard
        </button>
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ELECTRICITY BILL UPLOAD CARD (fallback flow)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * ElectricityBillDropZone — reuses the same visual language as DropZone
 * but with amber/orange accent colours to visually distinguish it.
 */
function ElectricityBillDropZone({ openAadhaarPicker, dragHandlers, isDragging, handleKeyDown }) {
  return (
    <motion.div
      {...dragHandlers}
      onKeyDown={handleKeyDown}
      onClick={openAadhaarPicker}
      tabIndex={0}
      role="button"
      aria-label="Upload Electricity Bill — press Enter to open file picker"
      animate={isDragging ? { scale: 1.015 } : { scale: 1 }}
      transition={{ duration: 0.15 }}
      className={`
        w-full rounded-2xl border-2 border-dashed transition-all duration-200
        flex flex-col items-center justify-center py-12 px-6 gap-4 cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
        ${isDragging
          ? 'border-amber-400 bg-amber-50/60'
          : 'border-amber-200 bg-amber-50/30 hover:border-amber-300 hover:bg-amber-50/50'}
      `}
    >
      {/* Icon */}
      <div className={`
        w-18 h-18 rounded-full flex items-center justify-center transition-colors duration-200
        ${isDragging ? 'bg-amber-100' : 'bg-amber-50 border border-amber-100'}
      `} style={{ width: 72, height: 72 }}>
        <Lightbulb
          className={`w-8 h-8 transition-colors ${isDragging ? 'text-amber-500' : 'text-amber-400'}`}
          strokeWidth={1.5}
        />
      </div>

      {/* Text */}
      <div className="text-center space-y-1">
        <p className="text-lg font-bold text-gray-800">Upload Electricity Bill</p>
        <p className="text-sm text-gray-500">
          {isDragging ? 'Drop it here!' : 'Drag & drop your file here or click to browse'}
        </p>
      </div>

      {/* Browse File button */}
      <motion.button
        type="button"
        id="bill-choose-file"
        onClick={(e) => { e.stopPropagation(); openAadhaarPicker() }}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white
                   bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-200
                   transition-all duration-200 focus:outline-none"
        whileTap={{ scale: 0.97 }}
      >
        <Upload className="w-4 h-4" />
        Browse File
      </motion.button>

      <p className="text-xs text-gray-400">JPG, PNG, JPEG — Max 10 MB</p>
    </motion.div>
  )
}

/**
 * ElectricityBillCard — the full card that appears beneath the Aadhaar card
 * when the backend returns NEED_ADDRESS_PROOF.
 */
function ElectricityBillCard({
  billFile, billPreview, billError, hasBillPreview,
  isDragging, inputRef, accept,
  openAadhaarPicker, handleInputChange, dragHandlers, handleKeyDown,
  onClear, onSubmit,
  isBusy, submitError,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="card-white p-6 sm:p-8 border-l-4 border-amber-400"
    >
      {/* Hidden file input for bill */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 mb-5 rounded-xl bg-amber-50 border border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Additional Document Required</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Secure QR could not be decoded from your Aadhaar.<br />
            Please upload your <span className="font-semibold">Electricity Bill</span> to continue verification.
          </p>
        </div>
      </div>

      {/* Drop zone / preview area */}
      <AnimatePresence mode="wait">
        {hasBillPreview ? (
          <motion.div
            key="bill-preview"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Thumbnail */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 aspect-[16/8]">
              <img
                src={billPreview}
                alt="Electricity bill preview"
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove bill"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white border border-gray-200
                           shadow-sm hover:bg-red-50 hover:border-red-200 flex items-center justify-center
                           text-gray-500 hover:text-red-500 transition-all duration-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1
                              rounded-lg bg-white/90 border border-amber-200 text-xs font-semibold text-amber-700">
                <CheckCircle2 className="w-3 h-3" />
                Ready to submit
              </div>
            </div>

            {/* File meta */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100
                              flex items-center justify-center flex-shrink-0">
                <FileImage className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{billFile?.name}</p>
                <p className="text-xs text-gray-400">{billFile ? `${(billFile.size / 1024).toFixed(1)} KB` : ''}</p>
              </div>
              <button type="button" onClick={onClear}
                      className="text-xs text-amber-500 hover:text-amber-700 font-medium transition-colors">
                Change
              </button>
            </div>

            {/* Submit button */}
            <motion.button
              type="button"
              id="bill-submit-btn"
              onClick={onSubmit}
              disabled={isBusy}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl
                         text-base font-bold text-white bg-amber-500 hover:bg-amber-600
                         shadow-lg shadow-amber-200 transition-all duration-200
                         disabled:opacity-60 disabled:cursor-not-allowed"
              whileTap={{ scale: 0.98 }}
            >
              {isBusy ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <FileCheck2 className="w-5 h-5" />
                  Submit Electricity Bill
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="bill-dropzone"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <ElectricityBillDropZone
              openAadhaarPicker={openAadhaarPicker}
              dragHandlers={dragHandlers}
              isDragging={isDragging}
              handleKeyDown={handleKeyDown}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation error */}
      {billError && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{billError}</p>
        </div>
      )}

      {/* API submit error */}
      {submitError && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{submitError}</p>
        </div>
      )}

      {/* Privacy note */}
      <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-400">
        <Lock className="w-3.5 h-3.5" />
        Your data is encrypted and secure. We never store your documents.
      </div>
    </motion.div>
  )
}

function UploadCard() {
  const navigate = useNavigate()

  const {
    file: aadhaarFile,
  previewUrl: aadhaarPreview,
  error: aadhaarFileError,

  isDragging: aadhaarDragging,
  hasPreview: hasAadhaarPreview,
  hasError: hasAadhaarError,
  isIdle: isAadhaarIdle,

  inputRef: aadhaarInputRef,
  accept: aadhaarAccept,

  clear: clearAadhaar,

  openPicker: openAadhaarPicker,
  handleInputChange: handleAadhaarInputChange,

  dragHandlers: aadhaarDragHandlers,
  handleKeyDown: aadhaarHandleKeyDown,

} = useFileUpload({
  maxSizeMB: 10,
  accept: ".jpg,.jpeg,.png",
  allowedTypes: [
    "image/jpeg",
    "image/jpg",
    "image/png",
  ],
})

/* ───────────────── PAN Upload State ───────────────── */

const {
  file: panFile,
  previewUrl: panPreview,
  error: panFileError,

  isDragging: panDragging,
  hasPreview: hasPanPreview,
  hasError: hasPanError,
  isIdle: isPanIdle,

  inputRef: panInputRef,
  accept: panAccept,

  clear: clearPan,

  openPicker: openPanPicker,
  handleInputChange: handlePanInputChange,

  dragHandlers: panDragHandlers,
  handleKeyDown: panHandleKeyDown,

} = useFileUpload({
  maxSizeMB: 10,
  accept: ".jpg,.jpeg,.png",
  allowedTypes: [
    "image/jpeg",
    "image/jpg",
    "image/png",
  ],
})

  /* ──── Aadhaar API extraction state ──────────────────────────────────── */
  const {
    submit, submitBill, reset: apiReset,
    phase, uploadProgress,
    result, error: apiError,
    isBusy, isSuccess, isError: isApiError,
    isNeedAddressProof,
  } = useDocumentExtraction()

  /* ──── Electricity bill file state (only active on NEED_ADDRESS_PROOF) ─── */
  const {
    file:              billFile,
    previewUrl:        billPreview,
    error:             billFileError,
    isDragging:        billIsDragging,
    hasPreview:        hasBillPreview,
    hasError:          hasBillFileError,
    inputRef:          billInputRef,
    accept:            billAccept,
    clear:             clearBill,
    openPicker:        openBillPicker,
    handleInputChange: handleBillInputChange,
    dragHandlers:      billDragHandlers,
    handleKeyDown:     handleBillKeyDown,
  } = useFileUpload({
    maxSizeMB: 10,
    accept: '.jpg,.jpeg,.png',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    customErrorMsg: 'Unsupported file format. Please upload a JPG or PNG image of your Electricity Bill.'
  })

  /* Electricity bill submission state */
  const [billSubmitting, setBillSubmitting] = useState(false)
  const [billSubmitError, setBillSubmitError] = useState(null)

  /* ──── Handlers ───────────────────────────────────────────────────────── */
  const handleVerify = useCallback(async () => {
    if (!aadhaarFile || !panFile) return
    await submit(aadhaarFile, panFile)
  }, [aadhaarFile, panFile, submit])

  const handleReset = useCallback(() => {
    clearAadhaar()
    clearPan()
    apiReset()
    clearBill()
    setBillSubmitError(null)
  }, [clearAadhaar, clearPan, apiReset, clearBill])

  const handleDashboard = useCallback(() => {
    navigate('/dashboard', { state: { result } })
  }, [navigate, result])

  /** Submit the electricity bill to the backend */
  const handleBillSubmit = useCallback(async () => {
    if (!billFile) return
    setBillSubmitting(true)
    setBillSubmitError(null)
    try {
      const data = await submitBill(billFile, result?.parsed_data || result?.aadhaar_data)
      navigate('/dashboard', { state: { result: data } })
    } catch (err) {
      setBillSubmitError(err?.message ?? 'Submission failed. Please try again.')
    } finally {
      setBillSubmitting(false)
    }
  }, [billFile, result, submitBill, navigate])

  /* ──── Visibility flags ──────────────────────────────────────────────────── */
  const canVerify = hasAadhaarPreview && hasPanPreview && !isBusy

  return (
    /* Wrapper so both cards stack vertically with a gap */
    <div className="space-y-4">

      {/* ──── UPLOAD CARDS ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card-white p-6 sm:p-8"
          >
            <SuccessSummary
              result={result}
              onReset={handleReset}
              onDashboard={handleDashboard}
            />
          </motion.div>
        ) : isNeedAddressProof ? (
          /* — Documents accepted but QR failed: show locked state — */
          <motion.div
            key="need-proof"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card-white p-6 flex items-center gap-4 py-4"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200
                            flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">Aadhaar + PAN Uploaded Successfully</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Aadhaar QR could not be decoded. Please complete verification below.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Start Over
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="uploads"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Side-by-side Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Aadhaar */}
              <div className="card-white p-6 flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Aadhaar Card</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Mandatory document for identity verification</p>
                </div>
                <input
                  ref={aadhaarInputRef}
                  type="file"
                  accept={aadhaarAccept}
                  onChange={handleAadhaarInputChange}
                  className="sr-only"
                  aria-hidden="true"
                />
                <div className="flex-1 flex flex-col justify-center">
                  {hasAadhaarPreview ? (
                    <FilePreview
                      file={aadhaarFile}
                      previewUrl={aadhaarPreview}
                      onClear={clearAadhaar}
                    />
                  ) : (
                    <DropZone
                      title="Upload Aadhaar"
                      openPicker={openAadhaarPicker}
                      dragHandlers={aadhaarDragHandlers}
                      isDragging={aadhaarDragging}
                      handleKeyDown={aadhaarHandleKeyDown}
                    />
                  )}
                </div>
                {hasAadhaarError && aadhaarFileError && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-[11px] text-red-600">{aadhaarFileError}</p>
                  </div>
                )}
              </div>

              {/* Card 2: PAN */}
              <div className="card-white p-6 flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800">PAN Card</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Mandatory document for tax verification</p>
                </div>
                <input
                  ref={panInputRef}
                  type="file"
                  accept={panAccept}
                  onChange={handlePanInputChange}
                  className="sr-only"
                  aria-hidden="true"
                />
                <div className="flex-1 flex flex-col justify-center">
                  {hasPanPreview ? (
                    <FilePreview
                      file={panFile}
                      previewUrl={panPreview}
                      onClear={clearPan}
                    />
                  ) : (
                    <DropZone
                      title="Upload PAN"
                      openPicker={openPanPicker}
                      dragHandlers={panDragHandlers}
                      isDragging={panDragging}
                      handleKeyDown={panHandleKeyDown}
                    />
                  )}
                </div>
                {hasPanError && panFileError && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-[11px] text-red-600">{panFileError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Verify CTA Box */}
            <div className="card-white p-6 flex flex-col items-center">
              <motion.button
                type="button"
                id="home-verify-btn"
                disabled={!canVerify}
                onClick={handleVerify}
                className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-xl
                           text-base font-bold text-white transition-all duration-200
                           ${canVerify 
                             ? 'bg-indigo-700 hover:bg-indigo-800 shadow-lg shadow-indigo-200 btn-glow' 
                             : 'bg-gray-300 cursor-not-allowed opacity-60'}`}
                whileTap={canVerify ? { scale: 0.98 } : {}}
              >
                <ScanLine className="w-5 h-5" />
                Start Verification
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Lock className="w-3.5 h-3.5" />
                Your data is encrypted and secure. We never store your documents.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing overlay — full screen light glassmorphic modal */}
      <AnimatePresence>
        {isBusy && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-50/65 backdrop-blur-[8px]"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md bg-white/95 rounded-2xl border border-indigo-100/80
                         shadow-2xl overflow-hidden backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-indigo-50/80 bg-indigo-50/15">
                <ScanLine className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-indigo-950">
                  Document Verification Agent
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="text-xs font-semibold text-indigo-400">Processing</span>
                </div>
              </div>
              <div className="p-5">
                <VerificationLoader phase={phase} uploadProgress={uploadProgress} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──── ELECTRICITY BILL CARD (only when NEED_ADDRESS_PROOF) ────────── */}
      <AnimatePresence>
        {isNeedAddressProof && (
          <ElectricityBillCard
            billFile={billFile}
            billPreview={billPreview}
            billError={hasBillFileError ? billFileError : null}
            hasBillPreview={hasBillPreview}
            isDragging={billIsDragging}
            inputRef={billInputRef}
            accept={billAccept}
            openAadhaarPicker={openBillPicker}
            handleInputChange={handleBillInputChange}
            dragHandlers={billDragHandlers}
            handleKeyDown={handleBillKeyDown}
            onClear={clearBill}
            onSubmit={handleBillSubmit}
            isBusy={billSubmitting}
            submitError={billSubmitError}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS
   ══════════════════════════════════════════════════════════════════════════ */
const HOW_STEPS = [
  { num: 1, icon: Upload,       bg: 'bg-indigo-700', title: 'Upload Document',  desc: 'Upload your Aadhaar card image'             },
  { num: 2, icon: Cpu,          bg: 'bg-emerald-600', title: 'AI Processing',    desc: 'OCR, QR decoding & quality checks'          },
  { num: 3, icon: ScanLine,     bg: 'bg-blue-600',    title: 'Verify & Match',   desc: 'Cross-check with database'                  },
  { num: 4, icon: CheckCircle2, bg: 'bg-emerald-600', title: 'Get Results',      desc: 'View trust score & verification status'     },
]

function HowItWorks() {
  return (
    <div className="mt-14 mb-8">
      <h2 className="text-center text-2xl font-black text-indigo-950 mb-1">How It Works</h2>
      <div className="flex justify-center mb-8">
        <div className="h-1 w-10 rounded-full bg-indigo-600" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {HOW_STEPS.map(({ num, icon: Icon, bg, title, desc }, i) => (
          <div key={title} className="flex flex-col items-center text-center gap-3 relative">
            {/* Arrow connector */}
            {i < HOW_STEPS.length - 1 && (
              <div className="hidden sm:flex absolute top-7 left-[60%] items-center">
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </div>
            )}

            {/* Icon circle */}
            <div className="relative">
              <div className={`w-16 h-16 rounded-full ${bg} flex items-center justify-center
                              shadow-lg`}>
                <Icon className="w-7 h-7 text-white" strokeWidth={1.75} />
              </div>
              {/* Step number badge */}
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border-2
                              border-indigo-200 flex items-center justify-center">
                <span className="text-[9px] font-black text-indigo-700">{num}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-800">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



/* ══════════════════════════════════════════════════════════════════════════
   HOME PAGE
   ══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <div className="min-h-screen page-bg light-dot-grid">
      <Navbar />

      <main className="w-full px-4 sm:px-8 pt-28 pb-8">

        {/* Hero — centred, tightly capped */}
        <div className="max-w-2xl mx-auto">
          <Hero />
        </div>

        {/* Feature cards — a bit wider for 3-col breathing room */}
        <div className="max-w-5xl mx-auto">
          <FeatureCards />
        </div>

        {/* Upload card — compact focal point */}
        <div className="max-w-xl mx-auto mb-14">
          <UploadCard />
        </div>

        {/* How It Works */}
        <div className="max-w-5xl mx-auto">
          <HowItWorks />
        </div>

      </main>

      <Footer />
    </div>
  )
}
