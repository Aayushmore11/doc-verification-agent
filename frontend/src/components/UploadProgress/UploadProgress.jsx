/**
 * UploadProgress.jsx
 *
 * Visual feedback panel shown while the document is in-flight.
 * Renders two distinct visual modes driven by `phase`:
 *
 *   "uploading"   → Determinate progress bar (0-100%, known from Axios)
 *   "processing"  → Indeterminate animated shimmer (waiting for AI response)
 *
 * Why two modes?
 *   Once all bytes have arrived at the server, Axios stops reporting
 *   progress.  The server then runs OCR + QR + LLM inference (1-15 s).
 *   A frozen progress bar at 100% looks broken.  The shimmer honestly
 *   communicates "still working, just not on your end anymore."
 *
 * Props:
 *   phase     {string}  'uploading' | 'processing'
 *   progress  {number}  0-100 (only used in uploading phase)
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Upload, BrainCircuit, Loader2 } from 'lucide-react'
import { PHASE } from '../../hooks/useDocumentExtraction'

/* ─── Shimmer animation for the indeterminate bar ────────────────────────── */
const shimmerVariants = {
  animate: {
    x: ['-100%', '200%'],
    transition: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' },
  },
}

export default function UploadProgress({ phase, progress }) {
  const isUploading  = phase === PHASE.UPLOADING
  const isProcessing = phase === PHASE.PROCESSING

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0  }}
        exit={{   opacity: 0, y: -6  }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4"
        role="status"
        aria-live="polite"
        aria-label={isUploading ? `Uploading: ${progress}%` : 'Processing document'}
      >
        {/* ── Icon + Title row ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Spinning icon */}
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            ${isUploading  ? 'bg-blue-500/10 border border-blue-500/20'   : ''}
            ${isProcessing ? 'bg-violet-500/10 border border-violet-500/20' : ''}
          `}>
            {isUploading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              >
                <Upload className="w-5 h-5 text-blue-400" strokeWidth={1.75} />
              </motion.div>
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
              >
                <Loader2 className="w-5 h-5 text-violet-400" strokeWidth={1.75} />
              </motion.div>
            )}
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-200 leading-tight">
              {isUploading  ? 'Uploading document…'       : 'Running AI analysis…'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {isUploading
                ? 'Sending your file to the verification server'
                : 'OCR extraction · QR decode · LLM field parsing'}
            </p>
          </div>

          {/* Progress percentage (uploading only) */}
          {isUploading && (
            <motion.span
              key={progress}
              initial={{ opacity: 0.4, scale: 0.9 }}
              animate={{ opacity: 1,   scale: 1   }}
              className="text-sm font-bold text-blue-400 tabular-nums flex-shrink-0"
              aria-hidden="true"
            >
              {progress}%
            </motion.span>
          )}
        </div>

        {/* ── Progress track ───────────────────────────────────────────── */}
        <div
          className="relative w-full h-1.5 rounded-full bg-slate-800 overflow-hidden"
          aria-hidden="true"
        >
          {isUploading ? (
            /* Determinate fill — width driven by upload progress */
            <motion.div
              className="absolute left-0 top-0 bottom-0 rounded-full bg-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          ) : (
            /* Indeterminate shimmer — signals AI is thinking */
            <div className="absolute inset-0 bg-gradient-to-r from-violet-800/40 via-violet-600/40 to-violet-800/40 rounded-full">
              <motion.div
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-violet-400/70 to-transparent rounded-full"
                variants={shimmerVariants}
                animate="animate"
              />
            </div>
          )}
        </div>

        {/* ── Processing step indicators ───────────────────────────────── */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-6 pt-1"
          >
            {[
              { label: 'OCR',        delay: 0    },
              { label: 'QR Decode',  delay: 0.3  },
              { label: 'AI Parse',   delay: 0.6  },
              { label: 'Trust Score',delay: 0.9  },
            ].map(({ label, delay }) => (
              <div key={label} className="flex items-center gap-1.5">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-violet-500"
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.4, delay, ease: 'easeInOut' }}
                />
                <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">
                  {label}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
