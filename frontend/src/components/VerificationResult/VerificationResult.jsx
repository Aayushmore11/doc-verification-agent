/**
 * VerificationResult.jsx
 *
 * Renders the structured response from POST /extract-document.
 * Each section maps directly to a top-level key in the API response.
 *
 * Layout (top → bottom):
 *   ① Status banner  — trust score + overall verdict
 *   ② Parsed fields  — document type, name, IDs, DOB from parsed_data
 *   ③ Image quality  — resolution, blur score, metadata flags
 *   ④ Risk flags     — array of human-readable warnings (if any)
 *   ⑤ QR comparison  — OCR vs QR field match (if QR present)
 *   ⑥ Raw text       — collapsible raw OCR output
 *
 * Props:
 *   result   {object}  The full API response object
 *   onReset  {fn}      Called when user clicks "Verify Another Document"
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, RotateCcw,
  ScanLine, ImageIcon, ShieldAlert,
  QrCode, FileText, User, Calendar, Hash
} from 'lucide-react'
import { formatConfidence, formatDate } from '../../utils/formatters'

/* ─── Trust score → verdict mapping ─────────────────────────────────────── */
function getTrustVerdict(score) {
  if (score >= 80) return { label: 'Verified',      color: 'emerald', Icon: CheckCircle2  }
  if (score >= 55) return { label: 'Manual Review', color: 'amber',   Icon: AlertTriangle }
  return              { label: 'Rejected',       color: 'red',     Icon: XCircle      }
}

/* ─── Small helpers ──────────────────────────────────────────────────────── */
const Section = ({ title, icon: Icon, iconColor = 'text-blue-400', children }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/80">
      <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.75} />
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
    </div>
    <div className="p-4">{children}</div>
  </div>
)

const Field = ({ label, value }) => {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-800/60 last:border-0">
      <span className="text-xs text-slate-500 flex-shrink-0 mt-px">{label}</span>
      <span className="text-xs font-medium text-slate-200 text-right break-all">{String(value)}</span>
    </div>
  )
}

const BoolBadge = ({ value, trueLabel = 'Yes', falseLabel = 'No' }) => (
  <span className={`
    inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase
    ${value
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : 'bg-red-500/10 text-red-400 border border-red-500/20'}
  `}>
    {value ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
    {value ? trueLabel : falseLabel}
  </span>
)

/* ═══════════════════════════════════════════════════════════════════════════
   VerificationResult
   ═══════════════════════════════════════════════════════════════════════════ */
export default function VerificationResult({ result, onReset }) {
  const [rawExpanded, setRawExpanded] = useState(false)

  if (!result) return null

  const {
    trust_score,
    ocr_confidence,
    image_quality,
    parsed_data,
    risk_flags,
    qr_data,
    comparison,
    raw_text,
    verification_result,
  } = result

  const verdict = getTrustVerdict(trust_score ?? 0)
  const VERDICT_STYLES = {
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', score: 'text-emerald-400', icon: 'text-emerald-400' },
    amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-300',   score: 'text-amber-400',   icon: 'text-amber-400'   },
    red:     { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-300',     score: 'text-red-400',     icon: 'text-red-400'     },
  }
  const vs = VERDICT_STYLES[verdict.color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      {/* ① Status banner ──────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${vs.bg} ${vs.border}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${vs.bg} border ${vs.border} flex items-center justify-center flex-shrink-0`}>
              <verdict.Icon className={`w-5 h-5 ${vs.icon}`} />
            </div>
            <div>
              <p className={`text-base font-bold ${vs.text}`}>{verdict.label}</p>
              <p className="text-xs text-slate-500">
                {parsed_data?.document_type
                  ? `${parsed_data.document_type.toUpperCase()} · `
                  : ''}
                OCR confidence {formatConfidence((ocr_confidence ?? 0) / 100)}
              </p>
            </div>
          </div>

          {/* Trust score dial */}
          <div className="text-right">
            <p className={`text-3xl font-black tabular-nums ${vs.score}`}>
              {trust_score ?? '—'}
              <span className="text-lg font-semibold text-slate-600">/100</span>
            </p>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Trust Score</p>
          </div>
        </div>
      </div>

      {/* ② Parsed document fields ─────────────────────────────────────── */}
      {parsed_data && (
        <Section title="Extracted Fields" icon={ScanLine} iconColor="text-blue-400">
          <div className="space-y-0">
            <Field label="Document Type"  value={parsed_data.document_type?.toUpperCase()} />
            <Field label="Full Name"      value={parsed_data.full_name} />
            <Field label="Aadhaar Number" value={parsed_data.aadhaar_number} />
            <Field label="PAN Number"     value={parsed_data.pan_card_number} />
            <Field label="Date of Birth"  value={parsed_data.date_of_birth ? formatDate(parsed_data.date_of_birth) : null} />
            <Field label="Gender"         value={parsed_data.gender} />
            <Field label="Father's Name"  value={parsed_data.father_name} />
            <Field label="Address"        value={parsed_data.address} />
            {/* Render any extra LLM-extracted keys dynamically */}
            {Object.entries(parsed_data)
              .filter(([k]) => ![
                'document_type','full_name','aadhaar_number','pan_card_number',
                'date_of_birth','gender','father_name','address','raw_text'
              ].includes(k))
              .map(([k, v]) => (
                <Field key={k} label={k.replace(/_/g, ' ')} value={typeof v === 'object' ? JSON.stringify(v) : v} />
              ))}
          </div>
        </Section>
      )}

      {/* ③ Image quality ─────────────────────────────────────────────── */}
      {image_quality && (
        <Section title="Image Quality" icon={ImageIcon} iconColor="text-sky-400">
          <div className="grid grid-cols-2 gap-3">
            {/* Resolution */}
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Resolution</p>
              <p className="text-sm font-semibold text-slate-200">
                {image_quality.width} × {image_quality.height}
              </p>
              <div className="mt-1.5">
                <BoolBadge value={image_quality.good_resolution} trueLabel="Good" falseLabel="Low" />
              </div>
            </div>

            {/* Blur */}
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Clarity</p>
              <p className="text-sm font-semibold text-slate-200">
                {image_quality.blur_score?.toFixed(1)} score
              </p>
              <div className="mt-1.5">
                <BoolBadge value={!image_quality.is_blurry} trueLabel="Sharp" falseLabel="Blurry" />
              </div>
            </div>

            {/* Metadata */}
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">EXIF Metadata</p>
              <BoolBadge value={image_quality.metadata_present} trueLabel="Present" falseLabel="Missing" />
            </div>

            {/* Document-specific flags */}
            {image_quality.uidai_present !== undefined && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">UIDAI Text</p>
                <BoolBadge value={image_quality.uidai_present} trueLabel="Found" falseLabel="Missing" />
              </div>
            )}
            {image_quality.government_text_present !== undefined && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Govt. Text</p>
                <BoolBadge value={image_quality.government_text_present} trueLabel="Found" falseLabel="Missing" />
              </div>
            )}
            {image_quality.pan_header_present !== undefined && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">PAN Header</p>
                <BoolBadge value={image_quality.pan_header_present} trueLabel="Found" falseLabel="Missing" />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ④ Risk flags ────────────────────────────────────────────────── */}
      {risk_flags && risk_flags.length > 0 && (
        <Section title="Risk Flags" icon={ShieldAlert} iconColor="text-amber-400">
          <ul className="space-y-2">
            {risk_flags.map((flag) => (
              <li
                key={flag}
                className="flex items-center gap-2.5 text-xs text-amber-300 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                {flag}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ⑤ QR comparison ─────────────────────────────────────────────── */}
      {comparison && (
        <Section title="OCR vs QR Comparison" icon={QrCode} iconColor="text-violet-400">
          <div className="space-y-0">
            {Object.entries(comparison).map(([k, v]) => (
              <Field
                key={k}
                label={k.replace(/_/g, ' ')}
                value={typeof v === 'boolean' ? (v ? '✓ Match' : '✗ Mismatch') : String(v)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* ⑥ Raw OCR text (collapsible) ────────────────────────────────── */}
      {raw_text && (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setRawExpanded((e) => !e)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-slate-900/80
                       hover:bg-slate-900 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Raw OCR Text</span>
            </div>
            {rawExpanded
              ? <ChevronUp   className="w-4 h-4 text-slate-600" />
              : <ChevronDown className="w-4 h-4 text-slate-600" />
            }
          </button>

          {rawExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{   height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <pre className="px-4 py-3 text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap break-all font-mono bg-slate-950 max-h-48 overflow-y-auto">
                {raw_text}
              </pre>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Reset button ────────────────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                   border border-slate-700 hover:border-slate-600
                   text-sm font-medium text-slate-400 hover:text-slate-200
                   bg-slate-900/40 hover:bg-slate-800/60
                   transition-all duration-200 focus:outline-none
                   focus-visible:ring-2 focus-visible:ring-slate-500"
        whileTap={{ scale: 0.98 }}
        id="result-reset-btn"
      >
        <RotateCcw className="w-4 h-4" />
        Verify Another Document
      </motion.button>
    </motion.div>
  )
}
