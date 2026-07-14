/**
 * UploadBox.jsx
 *
 * Fully self-contained, reusable file-upload dropzone.
 * All state and logic live in `useFileUpload` — this component is pure view.
 *
 * ─── Props ────────────────────────────────────────────────────────────────
 * label        {string}   Visible label above the box          "Upload Document"
 * hint         {string}   Caption below the icon                "JPG, PNG, WEBP up to 10 MB"
 * maxSizeMB    {number}   Max file size in MB                  10
 * accept       {string}   MIME filter for the <input>          "image/*"
 * onFileSelect {fn}       Callback with the File on success    optional
 * onClear      {fn}       Callback when the file is removed    optional
 * disabled     {boolean}  Disables all interaction             false
 * className    {string}   Extra classes on the root element    ""
 * id           {string}   HTML id for e2e / a11y               "upload-box"
 *
 * ─── States ───────────────────────────────────────────────────────────────
 * idle     → Prompt to drag or pick
 * dragging → User is hovering with a file
 * preview  → Valid file accepted, image preview shown
 * error    → Validation failed, error message shown
 *
 * ─── Usage example ────────────────────────────────────────────────────────
 * <UploadBox
 *   label="Aadhaar Card (Front)"
 *   hint="JPG or PNG, max 10 MB"
 *   maxSizeMB={10}
 *   onFileSelect={(file) => console.log(file)}
 * />
 */

import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FolderOpen, X, AlertCircle,
  CheckCircle2, ImageIcon, RefreshCw, FileImage,
} from 'lucide-react'
import { useFileUpload, UPLOAD_STATE } from '../../hooks/useFileUpload'
import { formatFileSize, truncate } from '../../utils/formatters'

/* ─── Shared animation variants ─────────────────────────────────────────── */
const FADE_SCALE = {
  initial:  { opacity: 0, scale: 0.96 },
  animate:  { opacity: 1, scale: 1    },
  exit:     { opacity: 0, scale: 0.96 },
  transition: { duration: 0.2, ease: 'easeOut' },
}

const FADE_UP = {
  initial:  { opacity: 0, y: 10 },
  animate:  { opacity: 1, y: 0  },
  exit:     { opacity: 0, y: -6 },
  transition: { duration: 0.22, ease: 'easeOut' },
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-components — each renders one visual state of the dropzone
   ══════════════════════════════════════════════════════════════════════════ */

/* ── 1. Idle state ─────────────────────────────────────────────────────── */
function IdlePanel({ hint, openPicker, disabled }) {
  return (
    <motion.div
      key="idle"
      {...FADE_SCALE}
      className="flex flex-col items-center justify-center gap-5 py-12 px-6 text-center select-none"
    >
      {/* Upload icon with rotating ring on hover */}
      <div className="relative group">
        {/* Outer pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full bg-slate-700/40"
          animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
        />
        <div className="relative w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center transition-colors group-hover:border-blue-500/40 group-hover:bg-slate-800/80">
          <Upload
            className="w-7 h-7 text-slate-500 transition-colors group-hover:text-blue-400"
            strokeWidth={1.5}
          />
        </div>
      </div>

      {/* Text */}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-300">
          Drag &amp; drop your image here
        </p>
        <p className="text-xs text-slate-600">or</p>
      </div>

      {/* Choose File button */}
      <motion.button
        id="upload-choose-file"
        type="button"
        onClick={disabled ? undefined : openPicker}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white
                   bg-blue-600 hover:bg-blue-500 rounded-xl transition-all duration-200
                   disabled:opacity-40 disabled:cursor-not-allowed btn-glow focus:outline-none
                   focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                   focus-visible:ring-offset-slate-900"
        whileTap={disabled ? {} : { scale: 0.97 }}
      >
        <FolderOpen className="w-4 h-4" />
        Choose File
      </motion.button>

      {/* Format hint */}
      <p className="text-xs text-slate-600 leading-relaxed">{hint}</p>
    </motion.div>
  )
}

/* ── 2. Dragging state ─────────────────────────────────────────────────── */
function DraggingPanel() {
  return (
    <motion.div
      key="dragging"
      {...FADE_SCALE}
      className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center select-none"
    >
      {/* Bouncing icon */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 0.75, ease: 'easeInOut' }}
        className="w-16 h-16 rounded-full bg-blue-500/15 border-2 border-blue-500/60
                   flex items-center justify-center shadow-lg shadow-blue-500/20"
      >
        <Upload className="w-7 h-7 text-blue-400" strokeWidth={1.5} />
      </motion.div>

      <div className="space-y-1">
        <p className="text-base font-bold text-blue-300 tracking-tight">
          Drop it here!
        </p>
        <p className="text-xs text-blue-400/60">Release to upload your image</p>
      </div>
    </motion.div>
  )
}

/* ── 3. Preview state ──────────────────────────────────────────────────── */
function PreviewPanel({ file, previewUrl, onClear, openPicker }) {
  return (
    <motion.div
      key="preview"
      {...FADE_UP}
      className="p-4 space-y-3"
    >
      {/* Image preview */}
      <div
        className="relative w-full overflow-hidden rounded-xl bg-slate-800 aspect-[16/9]"
      >
        <motion.img
          src={previewUrl}
          alt={`Preview of ${file.name}`}
          className="w-full h-full object-contain"
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />

        {/* Dark gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none" />

        {/* Top-right remove button */}
        <motion.button
          id="upload-remove-btn"
          type="button"
          onClick={onClear}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full
                     bg-slate-900/80 hover:bg-red-500/80 border border-slate-700 hover:border-red-500/60
                     flex items-center justify-center text-slate-400 hover:text-white
                     transition-all duration-200 backdrop-blur-sm
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          whileHover={{ scale: 1.1 }}
          whileTap={  { scale: 0.92 }}
          aria-label="Remove image"
        >
          <X className="w-3.5 h-3.5" />
        </motion.button>

        {/* Bottom-left: file type badge */}
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5
                         px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-sm
                         border border-slate-700/60 text-[10px] font-semibold
                         text-emerald-400 uppercase tracking-wider">
          <CheckCircle2 className="w-3 h-3" />
          {file.type.split('/')[1]?.toUpperCase() ?? 'IMAGE'}
        </span>
      </div>

      {/* File metadata row */}
      <div className="flex items-center justify-between gap-3 px-1">
        {/* Filename + size */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <FileImage className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p
              className="text-xs font-medium text-slate-200 truncate leading-tight"
              title={file.name}
            >
              {truncate(file.name, 32)}
            </p>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>

        {/* Change file link */}
        <motion.button
          id="upload-change-btn"
          type="button"
          onClick={openPicker}
          className="flex-shrink-0 inline-flex items-center gap-1.5
                     text-xs font-medium text-blue-400 hover:text-blue-300
                     transition-colors focus:outline-none"
          whileHover={{ x: -1 }}
          aria-label="Choose a different file"
        >
          <RefreshCw className="w-3 h-3" />
          Change
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ── 4. Error state ────────────────────────────────────────────────────── */
function ErrorPanel({ error, onRetry }) {
  return (
    <motion.div
      key="error"
      {...FADE_SCALE}
      className="flex flex-col items-center justify-center gap-5 py-12 px-6 text-center select-none"
    >
      {/* Error icon — pop in with a spring */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1,   opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.05 }}
        className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30
                   flex items-center justify-center"
      >
        <AlertCircle className="w-7 h-7 text-red-400" strokeWidth={1.5} />
      </motion.div>

      <div className="space-y-1.5">
        <p className="text-sm font-bold text-red-300">Upload Failed</p>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">{error}</p>
      </div>

      <motion.button
        id="upload-retry-btn"
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold
                   text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700
                   hover:border-slate-600 rounded-xl transition-all duration-200
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        whileTap={{ scale: 0.97 }}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Try Again
      </motion.button>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   UploadBox — the exported reusable component
   ══════════════════════════════════════════════════════════════════════════ */
export default function UploadBox({
  label       = 'Upload Image',
  hint        = 'JPG, PNG, WEBP, GIF — up to 10 MB',
  maxSizeMB   = 10,
  accept      = 'image/*',
  onFileSelect,
  onClear,
  disabled    = false,
  className   = '',
  id          = 'upload-box',
}) {
  const {
    uploadState,
    file,
    previewUrl,
    error,
    isDragging,
    hasPreview,
    hasError,
    inputRef,
    clear,
    openPicker,
    handleInputChange,
    dragHandlers,
    handleKeyDown,
  } = useFileUpload({ accept, maxSizeMB, onFileSelect, onClear })

  /* ── Dynamic border + background classes per state ─────────────────── */
  const borderClass = (() => {
    if (isDragging)  return 'border-blue-500   bg-blue-500/5  shadow-[0_0_30px_rgba(59,130,246,0.15)]'
    if (hasError)    return 'border-red-500/50 bg-red-500/5'
    if (hasPreview)  return 'border-slate-700  bg-slate-900/60'
    return 'border-slate-700/70 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60'
  })()

  return (
    <div id={id} className={`w-full ${className}`}>

      {/* ── Optional visible label ──────────────────────────────────── */}
      {label && (
        <label
          htmlFor={`${id}-input`}
          className="block text-sm font-semibold text-slate-300 mb-2"
        >
          {label}
        </label>
      )}

      {/* ── Dropzone container ─────────────────────────────────────── */}
      <motion.div
        {...dragHandlers}
        onKeyDown={disabled ? undefined : handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={`${label} dropzone — press Enter or Space to open file picker`}
        aria-disabled={disabled}
        animate={
          isDragging
            ? { scale: 1.015 }
            : hasError
            ? { x: [0, -7, 7, -5, 5, -3, 3, 0] }   /* shake on error */
            : { scale: 1, x: 0 }
        }
        transition={
          hasError
            ? { duration: 0.45, ease: 'easeInOut' }
            : { duration: 0.18, ease: 'easeOut'    }
        }
        className={`
          relative w-full rounded-2xl border-2 border-dashed
          transition-colors duration-200 overflow-hidden outline-none
          focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          focus-visible:ring-offset-slate-950
          ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
          ${borderClass}
        `}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* ── State panels with smooth transitions ───────────────── */}
        <AnimatePresence mode="wait" initial={false}>
          {hasPreview ? (
            <PreviewPanel
              key={UPLOAD_STATE.PREVIEW}
              file={file}
              previewUrl={previewUrl}
              onClear={clear}
              openPicker={openPicker}
            />
          ) : isDragging ? (
            <DraggingPanel key={UPLOAD_STATE.DRAGGING} />
          ) : hasError ? (
            <ErrorPanel
              key={UPLOAD_STATE.ERROR}
              error={error}
              onRetry={clear}
            />
          ) : (
            <IdlePanel
              key={UPLOAD_STATE.IDLE}
              hint={hint}
              openPicker={openPicker}
              disabled={disabled}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
