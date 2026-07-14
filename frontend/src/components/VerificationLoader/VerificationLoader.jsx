/**
 * VerificationLoader.jsx
 *
 * Professional light-themed loading screen shown while the backend processes
 * the uploaded document.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, ScanLine, QrCode, ArrowLeftRight,
  Database, ShieldCheck, CheckCircle2,
} from 'lucide-react'
import { PHASE } from '../../hooks/useDocumentExtraction'

/* ─── Step definitions ───────────────────────────────────────────────────── */
const STEPS = [
  {
    id:       'upload',
    label:    'Uploading document',
    sublabel: 'Sending file to the verification server',
    Icon:     Upload,
    phase:    PHASE.UPLOADING,
    color:    '#4f46e5',   // indigo-600
  },
  {
    id:       'ocr',
    label:    'Extracting OCR text',
    sublabel: 'Scanning document with Llama OCR',
    Icon:     ScanLine,
    phase:    PHASE.PROCESSING,
    color:    '#3b82f6',   // blue-500
  },
  {
    id:       'qr',
    label:    'Reading Secure QR',
    sublabel: 'Decoding UIDAI encrypted QR payload',
    Icon:     QrCode,
    phase:    PHASE.PROCESSING,
    color:    '#8b5cf6',   // violet-500
  },
  {
    id:       'compare',
    label:    'Comparing OCR with QR',
    sublabel: 'Cross-validating extracted fields',
    Icon:     ArrowLeftRight,
    phase:    PHASE.PROCESSING,
    color:    '#d946ef',   // fuchsia-500
  },
  {
    id:       'database',
    label:    'Checking Database',
    sublabel: 'Verifying against known records',
    Icon:     Database,
    phase:    PHASE.PROCESSING,
    color:    '#10b981',   // emerald-500
  },
  {
    id:       'trust',
    label:    'Calculating Trust Score',
    sublabel: 'Scoring document authenticity',
    Icon:     ShieldCheck,
    phase:    PHASE.PROCESSING,
    color:    '#059669',   // emerald-600
  },
]

const PROCESSING_STEPS = STEPS.filter((s) => s.phase === PHASE.PROCESSING)
const STEP_DURATION_MS = 2500   // time per processing step

/* ─── Circular progress SVG ─────────────────────────────────────────────── */
const RADIUS   = 44
const CIRC     = 2 * Math.PI * RADIUS   // ≈ 276.5

function CircularRing({ progress, color }) {
  const offset = CIRC * (1 - Math.min(progress, 100) / 100)

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-36 h-36 drop-shadow-md"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="glow-light" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track circle */}
      <circle
        cx="50" cy="50" r={RADIUS}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth="6"
      />

      {/* Tick marks around the ring */}
      {Array.from({ length: 36 }).map((_, i) => {
        const angle = (i * 10 * Math.PI) / 180
        const x1 = 50 + (RADIUS + 3.5) * Math.cos(angle)
        const y1 = 50 + (RADIUS + 3.5) * Math.sin(angle)
        const x2 = 50 + (RADIUS + 6.5) * Math.cos(angle)
        const y2 = 50 + (RADIUS + 6.5) * Math.sin(angle)
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#e2e8f0"
            strokeWidth="0.75"
          />
        )
      })}

      {/* Progress arc */}
      <motion.circle
        cx="50" cy="50" r={RADIUS}
        fill="none"
        stroke="url(#ring-gradient)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        filter="url(#glow-light)"
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Rotating leading dot */}
      <motion.circle
        cx={50 + RADIUS}
        cy={50}
        r="3.5"
        fill="#10b981"
        style={{ transformOrigin: '50px 50px' }}
        animate={{ rotate: [0, 360] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
      />
    </svg>
  )
}

/* ─── Single step row ────────────────────────────────────────────────────── */
function StepRow({ step, status }) {
  const isDone    = status === 'done'
  const isActive  = status === 'active'
  const isPending = status === 'pending'

  return (
    <motion.div
      layout
      className={`
        flex items-center gap-3.5 px-4 py-3 rounded-xl border transition-all duration-300
        ${isActive  ? 'bg-indigo-50/80 border-indigo-100 shadow-sm' : 'border-transparent bg-transparent'}
      `}
    >
      {/* Icon / status indicator */}
      <div className={`
        w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border transition-all duration-300
        ${isDone    ? 'bg-emerald-50 border-emerald-100' : ''}
        ${isActive  ? '' : ''}
        ${isPending ? 'bg-gray-50 border-gray-100' : ''}
      `}
        style={isActive ? { background: `${step.color}10`, borderColor: `${step.color}30` } : {}}
      >
        {isDone ? (
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 animate-scale-up" />
        ) : isActive ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          >
            <step.Icon className="w-4 h-4" style={{ color: step.color }} />
          </motion.div>
        ) : (
          <step.Icon className="w-4 h-4 text-gray-300" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold leading-tight transition-colors duration-300
          ${isDone    ? 'text-gray-400 line-through decoration-gray-300' : ''}
          ${isActive  ? 'text-indigo-950' : ''}
          ${isPending ? 'text-gray-400' : ''}
        `}>
          {step.label}
        </p>
        {isActive && (
          <motion.p
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] text-gray-500 mt-0.5 leading-tight"
          >
            {step.sublabel}
          </motion.p>
        )}
      </div>

      {/* Right: indicator dot */}
      {isDone && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"
        />
      )}
      {isActive && (
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: step.color }}
        />
      )}
      {isPending && (
        <div className="w-1.5 h-1.5 rounded-full bg-gray-200 flex-shrink-0" />
      )}
    </motion.div>
  )
}

/* ─── Main export ────────────────────────────────────────────────────────── */
export default function VerificationLoader({ phase, uploadProgress }) {
  const [processingIdx, setProcessingIdx] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (phase !== PHASE.PROCESSING) {
      setProcessingIdx(0)
      return
    }

    timerRef.current = setInterval(() => {
      setProcessingIdx((i) => Math.min(i + 1, PROCESSING_STEPS.length - 1))
    }, STEP_DURATION_MS)

    return () => clearInterval(timerRef.current)
  }, [phase])

  const activeStepIdx = phase === PHASE.UPLOADING
    ? 0
    : 1 + processingIdx

  const overallProgress = (() => {
    if (phase === PHASE.UPLOADING) {
      return (uploadProgress / 100) * (100 / STEPS.length)
    }
    return Math.min(((activeStepIdx + 0.5) / STEPS.length) * 100, 98)
  })()

  const currentStep = STEPS[activeStepIdx]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1,  y: 0  }}
      exit={{   opacity: 0, y: -10  }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full space-y-6"
      role="status"
      aria-label={`Verification in progress: ${currentStep.label}`}
      aria-live="polite"
    >
      {/* ── Top: ring + label ─────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-5 pt-2">

        {/* Circular ring */}
        <div className="relative">
          <CircularRing progress={overallProgress} />

          {/* Centre text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.span
                key={Math.round(overallProgress)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1   }}
                exit={{   opacity: 0, scale: 0.8  }}
                transition={{ duration: 0.2 }}
                className="text-2xl font-black text-indigo-950 tabular-nums"
              >
                {Math.round(overallProgress)}%
              </motion.span>
            </AnimatePresence>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              complete
            </span>
          </div>
        </div>

        {/* Current step headline */}
        <div className="text-center space-y-1">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStep.id}
              initial={{ opacity: 0, y: 6  }}
              animate={{ opacity: 1, y: 0  }}
              exit={{   opacity: 0, y: -6  }}
              transition={{ duration: 0.25 }}
              className="text-base font-bold text-indigo-950 flex items-center justify-center gap-0.5"
            >
              {currentStep.label}
              <Ellipsis />
            </motion.p>
          </AnimatePresence>
          <p className="text-xs text-gray-500">{currentStep.sublabel}</p>
        </div>

        {/* Linear progress bar */}
        <div className="w-full max-w-xs h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #4f46e5, #10b981)',
            }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── Step checklist ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-indigo-50/60 bg-indigo-50/15 p-2 space-y-0.5">
        {STEPS.map((step, i) => {
          const status =
            i < activeStepIdx  ? 'done'    :
            i === activeStepIdx ? 'active'  :
                                  'pending'
          return <StepRow key={step.id} step={step} status={status} />
        })}
      </div>
    </motion.div>
  )
}

/* ─── Animated "..." suffix ──────────────────────────────────────────────── */
function Ellipsis() {
  return (
    <span className="inline-flex gap-px ml-0.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="text-indigo-600 font-extrabold"
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            repeat: Infinity,
            duration: 1.2,
            delay: i * 0.25,
            ease: 'easeInOut',
          }}
        >
          .
        </motion.span>
      ))}
    </span>
  )
}
