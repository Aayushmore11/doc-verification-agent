/**
 * Dashboard.jsx — Document Verification Agent
 *
 * All data paths are mapped to the ACTUAL FastAPI response from /extract-document:
 *
 *  result.raw_text                   — raw OCR string
 *  result.ocr_confidence             — 0-100 float (Tesseract word-level avg)
 *  result.trust_score                — 0-100 int
 *  result.parsed_data                — { document_type, full_name, date_of_birth,
 *                                        gender, address, aadhaar_number,
 *                                        pan_card_number, … }
 *  result.qr_data                    — { version, qr_version, reference_id,
 *                                        full_name, date_of_birth, gender,
 *                                        care_of, city, address, masked_mobile }
 *  result.comparison                 — { comparison: { full_name: {ocr,qr,match},
 *                                        date_of_birth:…, gender:…, address:… },
 *                                        matched_fields, total_fields, match_score }
 *  result.image_quality              — { width, height, good_resolution, blur_score,
 *                                        is_blurry, metadata_present,
 *                                        government_text_present, uidai_present }
 *  result.verification_result        — { status, verification_score,
 *                                        matched_fields:[{field,user_value,database_value,similarity}],
 *                                        mismatched_fields:[…], missing_fields:[…],
 *                                        similarity_scores:{} }
 *  result.risk_flags                 — string[]
 *  result.payload_length             — number | null
 *  result.payload_preview            — string | null
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Download, RefreshCw, ChevronDown,
  CheckCircle2, XCircle, AlertTriangle, Clock,
  Copy, Check, User, FileText, Hash, Calendar,
  MapPin, Phone, ShieldCheck, QrCode, ArrowLeftRight,
  Database, Eye, BarChart2, Activity, Fingerprint,
  ScanLine, TrendingUp, Award, MoreHorizontal,
  Upload, ImageIcon, Gauge, Search,
} from 'lucide-react'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer/Footer'

/* ═══════════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════════ */

/** Safe nested get */
const get = (obj, path, fallback = null) =>
  path.split('.').reduce((acc, k) => (acc != null ? acc[k] : fallback), obj) ?? fallback

/** Format for display — null/undefined → em-dash */
const fmt = (val) => (val != null && val !== '' ? String(val) : '—')

/**
 * Normalise any numeric metric to 0-100.
 * - Already 0-1  → multiply ×100
 * - 0-100        → use as-is
 * - Laplacian blur scores can be 0-∞; we cap at 100 via log scale
 */
const normPct = (val, isLaplacian = false) => {
  if (val == null) return null
  if (isLaplacian) {
    // Laplacian variance: ≥100 = sharp, ≤10 = blurry. Map to 0-100.
    const clamped = Math.min(val, 2000)
    return Math.round((clamped / 2000) * 100)
  }
  if (val <= 1) return Math.round(val * 100)
  return Math.round(Math.min(Number(val), 100))
}

const VERDICT_STYLE = {
  VERIFIED:        { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  REVIEW:          { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  REJECTED:        { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     dot: 'bg-red-500'     },
}

const MATCH_STYLE = {
  match:    { icon: '✅', label: 'Match',    text: 'text-emerald-700', bg: 'bg-emerald-50/80', border: 'border-emerald-200' },
  mismatch: { icon: '❌', label: 'Mismatch', text: 'text-red-600',     bg: 'bg-red-50/80',     border: 'border-red-200'     },
  missing:  { icon: '⚠️', label: 'Missing',  text: 'text-amber-600',   bg: 'bg-amber-50/80',   border: 'border-amber-200'   },
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED UI PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */

function Bone({ w = 'w-full', h = 'h-3', className = '' }) {
  return <div className={`${w} ${h} rounded-md bg-gray-100 animate-pulse ${className}`} />
}

function ConfidenceBadge({ value, isLaplacian = false }) {
  if (value == null) return <Bone w="w-10" h="h-5" className="rounded-full inline-block" />
  const p = normPct(value, isLaplacian)
  const color = p >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : p >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200'
              :            'bg-red-100 text-red-700 border-red-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border tabular-nums ${color}`}>
      {p}%
    </span>
  )
}

function StatusBadge({ value }) {
  if (!value) return <Bone w="w-24" h="h-6" className="rounded-full" />
  const style = VERDICT_STYLE[value.toUpperCase()] ?? VERDICT_STYLE['REVIEW']
  const label = value === 'VERIFIED' ? 'Verified' : value === 'REJECTED' ? 'Rejected' : 'Manual Review'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.border} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
      {label}
    </span>
  )
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false)
  if (!value || value === '—') return null
  return (
    <button type="button" title="Copy"
            onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 p-0.5 rounded text-gray-300 hover:text-indigo-500 focus:outline-none">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

function ValueCell({ value, className = '' }) {
  const display = fmt(value)
  return (
    <span className={`group inline-flex items-center min-w-0 ${className}`}>
      <span className={`text-sm break-words ${display === '—' ? 'text-gray-300' : 'text-gray-800'}`}>{display}</span>
      <CopyBtn value={display !== '—' ? display : null} />
    </span>
  )
}

function ProgressBar({ value, max = 100, color = 'indigo' }) {
  const w = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100))
  const cls = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-400', red: 'bg-red-500', blue: 'bg-blue-500', violet: 'bg-violet-500', cyan: 'bg-cyan-500' }[color] || 'bg-indigo-500'
  return (
    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
      <motion.div className={`h-full rounded-full ${cls}`}
                  initial={{ width: 0 }} animate={{ width: `${w}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }} />
    </div>
  )
}

function Section({ id, title, icon: Icon, iconBg = 'bg-indigo-50', iconColor = 'text-indigo-600', defaultOpen = true, badge, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <motion.div id={id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition-colors text-left focus:outline-none">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.75} />
          </div>
          <span className="text-sm font-bold text-gray-800 truncate">{title}</span>
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function TableHeader({ cols }) {
  return (
    <div className={`grid grid-cols-12 gap-4 px-5 py-2.5 bg-gray-50/80 border-b border-gray-100`}>
      {cols.map(({ label, span, align }) => (
        <span key={label} className={`col-span-${span} text-[10px] font-bold text-gray-400 uppercase tracking-wider ${align === 'right' ? 'text-right' : ''}`}>
          {label}
        </span>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §1  DOCUMENT OVERVIEW
   ═══════════════════════════════════════════════════════════════════ */
function DocumentOverview({ result }) {
  const name    = get(result, 'parsed_data.full_name')
  const docType = get(result, 'parsed_data.document_type')
  const status  = get(result, 'verification_result.status')
  const score   = get(result, 'trust_score')
  const ocrConf = get(result, 'ocr_confidence')

  const ringColor = (score ?? 0) >= 80 ? '#10b981' : (score ?? 0) >= 55 ? '#f59e0b' : '#ef4444'
  const scoreColor = (score ?? 0) >= 80 ? 'text-emerald-600' : (score ?? 0) >= 55 ? 'text-amber-500' : 'text-red-500'
  const CIRC = 2 * Math.PI * 32
  const offset = CIRC * (1 - (score ?? 0) / 100)

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden mb-5">
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" />
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Identity */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-700 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-200">
              <User className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div>
              {name ? <h2 className="text-2xl font-black text-indigo-950">{name}</h2> : <Bone w="w-48" h="h-7" className="mb-2" />}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {docType
                  ? <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 capitalize">{docType}</span>
                  : <Bone w="w-24" h="h-6" className="rounded-lg" />}
                <StatusBadge value={status} />
              </div>
              {ocrConf != null && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                  <ScanLine className="w-3 h-3" /> OCR Confidence: <ConfidenceBadge value={ocrConf} />
                </p>
              )}
            </div>
          </div>
          {/* Trust Score Ring */}
          <div className="text-center flex-shrink-0">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 80 80" className="w-28 h-28 -rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#e0e7ff" strokeWidth="7" />
                {score != null && (
                  <motion.circle cx="40" cy="40" r="32" fill="none" stroke={ringColor} strokeWidth="7"
                                 strokeLinecap="round" strokeDasharray={CIRC}
                                 animate={{ strokeDashoffset: offset }}
                                 initial={{ strokeDashoffset: CIRC }}
                                 transition={{ duration: 1.2, ease: 'easeOut' }} />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {score != null ? <span className={`text-2xl font-black tabular-nums ${scoreColor}`}>{score}</span> : <Bone w="w-10" h="h-6" />}
                <span className="text-[10px] text-gray-400 font-semibold">/100</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 mt-1">Trust Score</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §2  OCR EXTRACTED DATA
   Actual fields: parsed_data.{document_type, full_name, date_of_birth,
   gender, address, aadhaar_number, pan_card_number}
   ═══════════════════════════════════════════════════════════════════ */
const AADHAAR_FIELDS = [
  { key: 'document_type',   label: 'Document Type',   icon: FileText },
  { key: 'full_name',       label: 'Full Name',       icon: User     },
  { key: 'aadhaar_number',  label: 'Aadhaar Number',  icon: Hash     },
  { key: 'date_of_birth',   label: 'Date of Birth',   icon: Calendar },
  { key: 'gender',          label: 'Gender',          icon: User     },
  { key: 'address',         label: 'Address',         icon: MapPin   },
  { key: 'care_of',         label: 'Care Of / S/O',   icon: User     },
  { key: 'phone_number',    label: 'Phone Number',    icon: Phone    },
]

const PAN_FIELDS = [
  { key: 'document_type',   label: 'Document Type',   icon: FileText },
  { key: 'full_name',       label: 'Full Name',       icon: User     },
  { key: 'pan_card_number', label: 'PAN Number',      icon: FileText },
  { key: 'date_of_birth',   label: 'Date of Birth',   icon: Calendar },
]

const BILL_FIELDS = [
  { key: 'consumer_name',   label: 'Consumer Name',   icon: User },
  { key: 'consumer_number', label: 'Consumer Number', icon: Hash },
  { key: 'provider',        label: 'Provider',        icon: FileText },
  { key: 'bill_date',       label: 'Bill Date',       icon: Calendar },
  { key: 'address',         label: 'Address',         icon: MapPin },
  { key: 'city',            label: 'City',            icon: MapPin },
  { key: 'state',           label: 'State',           icon: MapPin },
  { key: 'pincode',         label: 'Pincode',         icon: Hash },
]

function OCRExtractedData({ result }) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('aadhaar')

  const hasBill = result?.electricity_bill != null

  const fields = activeTab === 'aadhaar'
    ? AADHAAR_FIELDS
    : activeTab === 'pan'
      ? PAN_FIELDS
      : BILL_FIELDS

  const data = activeTab === 'aadhaar'
    ? (get(result, 'parsed_data') ?? {})
    : activeTab === 'pan'
      ? (get(result, 'pan_data') ?? {})
      : (get(result, 'electricity_bill') ?? {})

  const ocrConf = activeTab === 'aadhaar'
    ? (get(result, 'aadhaar_ocr_confidence') ?? get(result, 'ocr_confidence'))
    : activeTab === 'pan'
      ? get(result, 'pan_ocr_confidence')
      : null

  const filteredFields = fields.filter(({ key, label }) => {
    if (!search) return true
    const val = String(data[key] ?? '').toLowerCase()
    return label.toLowerCase().includes(search.toLowerCase()) || val.includes(search.toLowerCase())
  })

  const headerBadge = ocrConf != null
    ? <ConfidenceBadge value={ocrConf} />
    : hasBill && activeTab === 'electricity_bill'
      ? <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-amber-50 border-amber-200 text-amber-700">⚡ Bill OCR</span>
      : null

  return (
    <Section id="sec-ocr" title="OCR Extracted Information" icon={ScanLine}
             iconBg="bg-blue-50" iconColor="text-blue-600"
             badge={headerBadge}>
      <div className="px-5 pt-4 pb-1.5 flex gap-2 border-b border-gray-100 bg-gray-50/20">
        <button
          onClick={() => { setActiveTab('aadhaar'); setSearch(''); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'aadhaar'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Aadhaar Card OCR
        </button>
        <button
          onClick={() => { setActiveTab('pan'); setSearch(''); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'pan'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          PAN Card OCR
        </button>
        {hasBill && (
          <button
            onClick={() => { setActiveTab('electricity_bill'); setSearch(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'electricity_bill'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Electricity Bill OCR
          </button>
        )}
      </div>
      {result != null && (
        <div className="px-5 py-3 border-b border-indigo-50/50 bg-indigo-50/5 flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={`Search ${activeTab === 'aadhaar' ? 'Aadhaar' : activeTab === 'pan' ? 'PAN' : 'Electricity Bill'} OCR fields...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-indigo-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
              Clear
            </button>
          )}
        </div>
      )}
      <TableHeader cols={[{ label: 'Field', span: 4 }, { label: 'Extracted Value', span: 6 }, { label: 'Conf.', span: 2, align: 'right' }]} />
      <div className="divide-y divide-gray-50">
        {filteredFields.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">No matching fields found</div>
        ) : (
          filteredFields.map(({ key, label, icon: Icon }) => {
            const val = data[key]
            return (
              <div key={key} className="grid grid-cols-12 gap-4 items-start px-5 py-3 hover:bg-blue-50/20 transition-colors">
                <div className="col-span-4 flex items-center gap-2 pt-0.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3 h-3 text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{label}</span>
                </div>
                <div className="col-span-6">
                  {result == null ? <Bone w="w-40" h="h-3.5" /> : <ValueCell value={val} />}
                </div>
                <div className="col-span-2 flex justify-end">
                  {result == null ? <Bone w="w-10" h="h-5" className="rounded-full" /> : <ConfidenceBadge value={ocrConf} />}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §3  QR DECODED INFO
   Actual fields: qr_data.{version, qr_version, reference_id,
   full_name, date_of_birth, gender, care_of, city, address, masked_mobile}
   ═══════════════════════════════════════════════════════════════════ */
const QR_FIELDS = [
  { key: 'full_name',     label: 'Name',           icon: User     },
  { key: 'date_of_birth', label: 'Date of Birth',  icon: Calendar },
  { key: 'gender',        label: 'Gender',         icon: User     },
  { key: 'care_of',       label: 'Care Of',        icon: User     },
  { key: 'city',          label: 'City',           icon: MapPin   },
  { key: 'address',       label: 'Address',        icon: MapPin   },
  { key: 'masked_mobile', label: 'Masked Mobile',  icon: Phone    },
  { key: 'reference_id',  label: 'Reference ID',   icon: Hash     },
  { key: 'qr_version',    label: 'QR Version',     icon: QrCode   },
  { key: 'version',       label: 'Format Version', icon: FileText },
]

function QRDecodedInfo({ result }) {
  const [search, setSearch] = useState('')
  const qr = get(result, 'qr_data')
  const hasQR = qr != null
  const payloadLen = get(result, 'payload_length')

  const filteredFields = QR_FIELDS.filter(({ key, label }) => {
    if (!search) return true
    const val = String(qr?.[key] ?? '').toLowerCase()
    return label.toLowerCase().includes(search.toLowerCase()) || val.includes(search.toLowerCase())
  })

  return (
    <Section id="sec-qr" title="QR Decoded Information" icon={QrCode}
             iconBg="bg-violet-50" iconColor="text-violet-600"
             badge={
               result != null
                 ? <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${hasQR ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                     {hasQR ? '🔐 QR Decoded' : '❌ Not Detected'}
                   </span>
                 : null
             }>
      {result != null && !hasQR ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-400">QR data not detected.</p>
          <p className="text-xs text-gray-300">Document may not contain a secure Aadhaar QR.</p>
        </div>
      ) : (
        <>
          {result != null && hasQR && (
            <div className="px-5 py-3 border-b border-indigo-50/50 bg-indigo-50/5 flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search QR fields..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-indigo-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
              {search && (
                <button onClick={() => setSearch('')} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                  Clear
                </button>
              )}
            </div>
          )}
          <div className="divide-y divide-gray-50">
            {filteredFields.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">No matching fields found</div>
            ) : (
              filteredFields.map(({ key, label, icon: Icon }) => (
                <div key={key} className="grid grid-cols-12 gap-4 items-start px-5 py-3 hover:bg-violet-50/20 transition-colors">
                  <div className="col-span-4 flex items-center gap-2 pt-0.5">
                    <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3 h-3 text-violet-400" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500">{label}</span>
                  </div>
                  <div className="col-span-8">
                    {result == null ? <Bone w="w-36" h="h-3.5" /> : <ValueCell value={qr?.[key]} />}
                  </div>
                </div>
              ))
            )}
            {payloadLen != null && !search && (
              <div className="grid grid-cols-12 gap-4 items-center px-5 py-3 bg-gray-50/50">
                <div className="col-span-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3 h-3 text-violet-400" />
                  </div>
                  <span className="text-xs font-semibold text-gray-500">Payload Length</span>
                </div>
                <div className="col-span-8">
                  <ValueCell value={payloadLen} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §4  OCR vs QR COMPARISON
   Actual: comparison.comparison.{full_name, date_of_birth, gender, address}
           comparison.matched_fields, .total_fields, .match_score
   ═══════════════════════════════════════════════════════════════════ */
const CMP_FIELDS = [
  { key: 'full_name',     label: 'Name'    },
  { key: 'date_of_birth', label: 'DOB'     },
  { key: 'gender',        label: 'Gender'  },
  { key: 'address',       label: 'Address' },
]

function OCRvsQR({ result }) {
  const isAddressProof = result?.status === 'VERIFIED_WITH_ADDRESS_PROOF'

  // comparison.comparison holds the per-field detail dict
  const cmpRoot = get(result, 'comparison') ?? {}
  const fields  = cmpRoot.comparison ?? {}          // <-- actual nesting
  const matched = cmpRoot.matched_fields             // matched_fields key
  const total   = cmpRoot.total_fields ?? (isAddressProof ? 2 : CMP_FIELDS.length)
  const matchPct = cmpRoot.match_score               // match_score key

  const getStatus = (key) => {
    const f = fields[key]
    if (!f) return 'missing'
    return f.match === true ? 'match' : f.match === false ? 'mismatch' : 'missing'
  }

  const compareFields = isAddressProof
    ? [
        { key: 'full_name', label: 'Name' },
        { key: 'address', label: 'Address' }
      ]
    : CMP_FIELDS;

  return (
    <Section
      id="sec-compare"
      title={isAddressProof ? "Aadhaar vs Electricity Bill Comparison" : "OCR vs QR Comparison"}
      icon={ArrowLeftRight}
      iconBg="bg-amber-50"
      iconColor="text-amber-600"
    >
      <div className="p-5 space-y-2">
        <div className="grid grid-cols-12 gap-3 px-3 mb-2">
          {[
            'Field',
            isAddressProof ? 'Aadhaar Value' : 'OCR Value',
            isAddressProof ? 'Electricity Bill Value' : 'QR Value',
            'Status'
          ].map((h, i) => (
            <span key={h} className={`text-[10px] font-bold text-gray-400 uppercase tracking-wider ${i === 0 ? 'col-span-2' : i === 3 ? 'col-span-2 text-center' : 'col-span-4'}`}>{h}</span>
          ))}
        </div>
        {compareFields.map(({ key, label }) => {
          const f = fields[key] ?? {}
          const status = getStatus(key)
          const style  = MATCH_STYLE[status]
          const val1 = isAddressProof ? f.aadhaar : f.ocr
          const val2 = isAddressProof ? f.electricity_bill : f.qr

          return (
            <div key={key} className={`grid grid-cols-12 gap-3 items-start p-3 rounded-xl border ${style.border} ${style.bg}`}>
              <span className="col-span-2 text-xs font-semibold text-gray-700 pt-0.5">{label}</span>
              <div className="col-span-4">
                {result == null ? <Bone w="w-24" h="h-3" /> : <ValueCell value={val1} className="text-xs" />}
              </div>
              <div className="col-span-4">
                {result == null ? <Bone w="w-24" h="h-3" /> : <ValueCell value={val2} className="text-xs" />}
              </div>
              <div className="col-span-2 flex justify-center pt-0.5">
                {result == null
                  ? <Bone w="w-12" h="h-5" className="rounded-full" />
                  : <span className={`text-[11px] font-bold ${style.text}`}>{style.icon} {style.label}</span>}
              </div>
            </div>
          )
        })}

        {/* Summary */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Matched Fields</p>
              {result == null ? <Bone w="w-12" h="h-6" className="mt-1" /> : (
                <p className="text-xl font-black text-indigo-700">{matched ?? '—'}<span className="text-sm text-gray-400 ml-1">/ {total}</span></p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Match %</p>
              {result == null ? <Bone w="w-12" h="h-6" className="mt-1" /> : (
                <p className={`text-xl font-black ${(matchPct ?? 0) >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>{matchPct ?? '—'}%</p>
              )}
            </div>
          </div>
          {matchPct != null && (
            <div className="flex-1 min-w-32 max-w-40">
              <ProgressBar value={matchPct} color={(matchPct ?? 0) >= 80 ? 'emerald' : (matchPct ?? 0) >= 55 ? 'amber' : 'red'} />
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §4b IDENTITY COMPARISON (Aadhaar ↔ PAN)
   ═══════════════════════════════════════════════════════════════════ */
function IdentityComparison({ result }) {
  const ic = get(result, 'identity_comparison') ?? {}
  const nameMatch = ic.name_match
  const dobMatch = ic.dob_match
  const score = ic.identity_score

  const styleName = MATCH_STYLE[nameMatch === true ? 'match' : nameMatch === false ? 'mismatch' : 'missing']
  const styleDob = MATCH_STYLE[dobMatch === true ? 'match' : dobMatch === false ? 'mismatch' : 'missing']

  const aadhaarName = get(result, 'parsed_data.full_name')
  const panName = get(result, 'pan_data.full_name')
  const aadhaarDob = get(result, 'parsed_data.date_of_birth')
  const panDob = get(result, 'pan_data.date_of_birth')

  return (
    <Section id="sec-identity-compare" title="Identity Comparison (Aadhaar ↔ PAN)" icon={ArrowLeftRight}
             iconBg="bg-indigo-50" iconColor="text-indigo-600">
      <div className="p-5 space-y-2">
        <div className="grid grid-cols-12 gap-3 px-3 mb-2">
          {['Field', 'Aadhaar Value', 'PAN Value', 'Status'].map((h, i) => (
            <span key={h} className={`text-[10px] font-bold text-gray-400 uppercase tracking-wider ${i === 0 ? 'col-span-2' : i === 3 ? 'col-span-2 text-center' : 'col-span-4'}`}>{h}</span>
          ))}
        </div>

        {/* Name Row */}
        <div className={`grid grid-cols-12 gap-3 items-start p-3 rounded-xl border ${styleName.border} ${styleName.bg}`}>
          <span className="col-span-2 text-xs font-semibold text-gray-700 pt-0.5">Full Name</span>
          <div className="col-span-4">
            <ValueCell value={aadhaarName} className="text-xs" />
          </div>
          <div className="col-span-4">
            <ValueCell value={panName} className="text-xs" />
          </div>
          <div className="col-span-2 flex justify-center pt-0.5">
            <span className={`text-[11px] font-bold ${styleName.text}`}>{styleName.icon} {styleName.label}</span>
          </div>
        </div>

        {/* DOB Row */}
        <div className={`grid grid-cols-12 gap-3 items-start p-3 rounded-xl border ${styleDob.border} ${styleDob.bg}`}>
          <span className="col-span-2 text-xs font-semibold text-gray-700 pt-0.5">Date of Birth</span>
          <div className="col-span-4">
            <ValueCell value={aadhaarDob} className="text-xs" />
          </div>
          <div className="col-span-4">
            <ValueCell value={panDob} className="text-xs" />
          </div>
          <div className="col-span-2 flex justify-center pt-0.5">
            <span className={`text-[11px] font-bold ${styleDob.text}`}>{styleDob.icon} {styleDob.label}</span>
          </div>
        </div>

        {/* Score Summary */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Identity Match Score</p>
            {result == null ? <Bone w="w-12" h="h-6" className="mt-1" /> : (
              <p className={`text-xl font-black ${(score ?? 0) >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>{score ?? '—'}%</p>
            )}
          </div>
          {score != null && (
            <div className="flex-1 min-w-32 max-w-40">
              <ProgressBar value={score} color={(score ?? 0) >= 80 ? 'emerald' : 'amber'} />
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §5  DATABASE RECORD
   Actual: verification_result.matched_fields & mismatched_fields
   contain {field, user_value, database_value, similarity}
   ═══════════════════════════════════════════════════════════════════ */
function DatabaseVerification({ result }) {
  const [search, setSearch] = useState('')
  const vr = get(result, 'verification_result') ?? {}
  const status = vr.status
  const found  = status != null && status !== 'REVIEW' || (vr.matched_fields?.length > 0 || vr.mismatched_fields?.length > 0)

  // Build a map of field → database_value from matched + mismatched arrays
  const allFields = [...(vr.matched_fields ?? []), ...(vr.mismatched_fields ?? [])]
  const dbMap = {}
  allFields.forEach(({ field, database_value, user_value, similarity }) => {
    dbMap[field] = { database_value, user_value, similarity, matched: vr.matched_fields?.some((f) => f.field === field) }
  })

  const DB_DISPLAY = [
    { key: 'full_name',       label: 'Full Name',     icon: User     },
    { key: 'date_of_birth',   label: 'Date of Birth', icon: Calendar },
    { key: 'gender',          label: 'Gender',        icon: User     },
    { key: 'aadhaar_number',  label: 'Aadhaar',       icon: Hash     },
    { key: 'pan_card_number', label: 'PAN',           icon: FileText },
    { key: 'phone_number',    label: 'Phone',         icon: Phone    },
    { key: 'address',         label: 'Address',       icon: MapPin   },
  ]

  const filteredFields = DB_DISPLAY.filter(({ key, label }) => {
    if (!search) return true
    const entry = dbMap[key]
    const val = String(entry?.database_value ?? '').toLowerCase()
    const ocrVal = String(entry?.user_value ?? '').toLowerCase()
    return label.toLowerCase().includes(search.toLowerCase()) || val.includes(search.toLowerCase()) || ocrVal.includes(search.toLowerCase())
  })

  return (
    <Section id="sec-db" title="Database Record" icon={Database}
             iconBg="bg-emerald-50" iconColor="text-emerald-600"
             badge={
               result != null && status
                 ? <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${allFields.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                     {allFields.length > 0 ? '✓ Record Found' : '⚠ Not Found'}
                   </span>
                 : null
             }>
      {result != null && allFields.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <Database className="w-6 h-6 text-amber-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500">No Matching Record Found</p>
          <p className="text-xs text-gray-400">No matching entry in the database for this document.</p>
        </div>
      ) : (
        <>
          {result != null && allFields.length > 0 && (
            <div className="px-5 py-3 border-b border-indigo-50/50 bg-indigo-50/5 flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search database fields..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-indigo-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
              {search && (
                <button onClick={() => setSearch('')} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                  Clear
                </button>
              )}
            </div>
          )}
          <TableHeader cols={[{ label: 'Field', span: 3 }, { label: 'DB Value', span: 5 }, { label: 'OCR Value', span: 3 }, { label: '', span: 1 }]} />
          <div className="divide-y divide-gray-50">
            {filteredFields.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">No matching fields found</div>
            ) : (
              filteredFields.map(({ key, label, icon: Icon }) => {
                const entry = dbMap[key]
                return (
                  <div key={key} className={`grid grid-cols-12 gap-4 items-start px-5 py-3 hover:bg-emerald-50/20 transition-colors ${entry?.matched ? '' : entry ? 'bg-red-50/30' : ''}`}>
                    <div className="col-span-3 flex items-center gap-2 pt-0.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-xs font-semibold text-gray-500">{label}</span>
                    </div>
                    <div className="col-span-5">
                      {result == null ? <Bone w="w-32" h="h-3.5" /> : <ValueCell value={entry?.database_value} />}
                    </div>
                    <div className="col-span-3">
                      {result == null ? <Bone w="w-24" h="h-3.5" /> : (
                        <span className={`text-sm ${entry?.matched ? 'text-emerald-700' : entry ? 'text-red-600' : 'text-gray-300'}`}>
                          {fmt(entry?.user_value)}
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-end pt-0.5">
                      {result != null && entry && (
                        entry.matched
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          : <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          {/* Verification score */}
          {vr.verification_score != null && !search && (
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Database Verification Score</span>
              <span className={`text-lg font-black tabular-nums ${vr.verification_score >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {vr.verification_score}%
              </span>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §6  THREE-WAY COMPARISON  (OCR · QR · DB)
   Uses comparison.comparison for OCR/QR, verification_result for DB
   ═══════════════════════════════════════════════════════════════════ */
function DatabaseComparison({ result }) {
  const isAddressProof = result?.status === 'VERIFIED_WITH_ADDRESS_PROOF'

  const cmpFields = get(result, 'comparison.comparison') ?? {}
  const vr        = get(result, 'verification_result') ?? {}
  const allFields = [...(vr.matched_fields ?? []), ...(vr.mismatched_fields ?? [])]
  const dbMap = {}
  allFields.forEach(({ field, database_value }) => { dbMap[field] = database_value })

  const TRIPLE = isAddressProof
    ? [
        { key: 'full_name',     label: 'Name'    },
        { key: 'address',       label: 'Address' },
      ]
    : [
        { key: 'full_name',     label: 'Name'    },
        { key: 'date_of_birth', label: 'DOB'     },
        { key: 'gender',        label: 'Gender'  },
        { key: 'address',       label: 'Address' },
      ]

  const rowStatus = (key) => {
    const f   = cmpFields[key] ?? {}
    const val1 = isAddressProof ? f.aadhaar : f.ocr
    const val2 = isAddressProof ? f.electricity_bill : f.qr
    const db  = dbMap[key] ?? null
    if (!val1 && !val2 && !db) return 'missing'
    const vals = [val1, val2, db].filter(Boolean).map((v) => String(v).toLowerCase().trim())
    if (new Set(vals).size === 1) return 'match'
    if (val2 && db && String(val2).toLowerCase().trim() === String(db).toLowerCase().trim()) return 'warning'
    return 'mismatch'
  }

  const rowStyle = {
    match:    { bg: 'bg-emerald-50/60 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', label: '✅ All Match'    },
    warning:  { bg: 'bg-amber-50/60 border-amber-200',     badge: 'bg-amber-100 text-amber-700',     label: isAddressProof ? '⚠️ Aadhaar Differs' : '⚠️ OCR Differs'  },
    mismatch: { bg: 'bg-red-50/60 border-red-200',         badge: 'bg-red-100 text-red-700',         label: '❌ Mismatch'     },
    missing:  { bg: 'bg-gray-50 border-gray-100',          badge: 'bg-gray-100 text-gray-400',        label: '— Missing'       },
  }

  return (
    <Section id="sec-triple" title={isAddressProof ? "Three-Way Comparison (Aadhaar · Electricity Bill · Database)" : "Three-Way Comparison (OCR · QR · Database)"} icon={BarChart2}
             iconBg="bg-purple-50" iconColor="text-purple-600">
      <div className="p-5 space-y-1.5">
        <div className="grid grid-cols-12 gap-3 px-3 mb-2">
          {[
            'Field',
            isAddressProof ? 'Aadhaar Value' : 'OCR Value',
            isAddressProof ? 'Electricity Bill' : 'QR Value',
            'DB Value',
            'Status'
          ].map((h, i) => (
            <span key={h} className={`text-[10px] font-bold text-gray-400 uppercase tracking-wider ${[2, 2, 2, 2, 4][i] === 4 ? 'col-span-4 text-center' : `col-span-${[2,2,2,2][i] ?? 2}`}`}>{h}</span>
          ))}
        </div>
        {TRIPLE.map(({ key, label }) => {
          const f  = cmpFields[key] ?? {}
          const st = rowStatus(key)
          const rs = rowStyle[st]
          const val1 = isAddressProof ? f.aadhaar : f.ocr
          const val2 = isAddressProof ? f.electricity_bill : f.qr

          return (
            <div key={key} className={`grid grid-cols-12 gap-3 items-start p-3 rounded-xl border ${rs.bg}`}>
              <span className="col-span-2 text-xs font-semibold text-gray-700 pt-0.5">{label}</span>
              <div className="col-span-2 text-xs text-gray-700">{result == null ? <Bone w="w-16" h="h-3" /> : fmt(val1)}</div>
              <div className="col-span-2 text-xs text-gray-700">{result == null ? <Bone w="w-16" h="h-3" /> : fmt(val2)}</div>
              <div className="col-span-2 text-xs text-gray-700">{result == null ? <Bone w="w-16" h="h-3" /> : fmt(dbMap[key])}</div>
              <div className="col-span-4 flex justify-center">
                {result == null ? <Bone w="w-20" h="h-5" className="rounded-full" />
                                : <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rs.badge}`}>{rs.label}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §7  VALIDATION CHECKS
   Derived from: image_quality + verification_result + parsed_data
   (No separate validation_checks key in the API — we compute them)
   ═══════════════════════════════════════════════════════════════════ */
function ValidationChecks({ result }) {
  const isAddressProof = result?.status === 'VERIFIED_WITH_ADDRESS_PROOF'

  const img = get(result, 'image_quality') ?? get(result, 'aadhaar_image_quality') ?? {}
  const vr  = get(result, 'verification_result') ?? {}
  const pd  = get(result, 'parsed_data') ?? {}
  const ocr = get(result, 'ocr_confidence') ?? get(result, 'aadhaar_ocr_confidence')
  const qr  = get(result, 'qr_data')
  const cmp = get(result, 'comparison.comparison') ?? {}

  const tr = (val) => {
    if (result == null) return null
    if (val === true || val === false) return val
    return null
  }

  const CHECKS = result == null ? [
    { label: 'Aadhaar Format Valid'           },
    { label: 'Document Type Detected'         },
    { label: 'OCR Confidence Above Threshold' },
    { label: 'Good Image Resolution'          },
    { label: 'Image Not Blurry'               },
    { label: 'QR Code Detected & Decoded'     },
    { label: 'Database Record Found'          },
    { label: 'Name Consistency (OCR ≈ QR)'    },
    { label: 'DOB Match (OCR = QR)'           },
    { label: 'Government Text Present'        },
    { label: 'Not Blacklisted'                },
  ] : isAddressProof ? [
    { label: 'Aadhaar Format Valid',           val: pd.aadhaar_number?.replace(/\s/g,'').length === 12 ?? false },
    { label: 'Document Type Detected',         val: !!pd.document_type && pd.document_type !== 'unknown' },
    { label: 'OCR Confidence Above Threshold', val: ocr != null ? ocr > 70 : null },
    { label: 'Good Image Resolution',          val: tr(img.good_resolution) },
    { label: 'Image Not Blurry',               val: img.is_blurry != null ? !img.is_blurry : null },
    { label: 'Electricity Bill Extracted',     val: result?.electricity_bill != null },
    { label: 'Database Record Found',          val: [...(vr.matched_fields ?? []), ...(vr.mismatched_fields ?? [])].length > 0 },
    { label: 'Name Match (Aadhaar = Bill)',    val: cmp.full_name?.match != null ? cmp.full_name.match : null },
    { label: 'Address Match (Aadhaar = Bill)', val: cmp.address?.match != null ? cmp.address.match : null },
    { label: 'Not Blacklisted',                val: true },
  ] : [
    { label: 'Aadhaar Format Valid',           val: pd.aadhaar_number?.replace(/\s/g,'').length === 12 ?? false },
    { label: 'Document Type Detected',         val: !!pd.document_type && pd.document_type !== 'unknown' },
    { label: 'OCR Confidence Above Threshold', val: ocr != null ? ocr > 70 : null },
    { label: 'Good Image Resolution',          val: tr(img.good_resolution) },
    { label: 'Image Not Blurry',               val: img.is_blurry != null ? !img.is_blurry : null },
    { label: 'QR Code Detected & Decoded',     val: qr != null },
    { label: 'Database Record Found',          val: [...(vr.matched_fields ?? []), ...(vr.mismatched_fields ?? [])].length > 0 },
    { label: 'Name Consistency (OCR ≈ QR)',    val: cmp.full_name?.match != null ? cmp.full_name.match : null },
    { label: 'DOB Match (OCR = QR)',           val: cmp.date_of_birth?.match != null ? cmp.date_of_birth.match : null },
    { label: 'Government Text Present',        val: tr(img.government_text_present ?? img.uidai_present) },
    { label: 'Not Blacklisted',                val: true }, // not tracked by current backend
  ]

  const passCount = CHECKS.filter((c) => c.val === true).length

  return (
    <Section id="sec-validation" title="Validation Checks" icon={ShieldCheck}
             iconBg="bg-emerald-50" iconColor="text-emerald-600"
             badge={
               result != null
                 ? <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700">
                     {passCount}/{CHECKS.length} Passed
                   </span>
                 : null
             }>
      <div className="p-5 space-y-2">
        {CHECKS.map(({ label, val }, i) => {
          const passed = val === true
          const failed = val === false

          return (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
              ${passed ? 'bg-emerald-50/60 border-emerald-100' : failed ? 'bg-red-50/60 border-red-100' : 'bg-gray-50/60 border-gray-100'}`}>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${passed ? 'bg-emerald-100' : failed ? 'bg-red-100' : 'bg-gray-100'}`}>
                {result == null
                  ? <MoreHorizontal className="w-3.5 h-3.5 text-gray-300" />
                  : passed
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    : failed
                      ? <XCircle className="w-3.5 h-3.5 text-red-500" />
                      : <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />}
              </div>
              <span className={`text-sm flex-1 font-medium ${passed ? 'text-emerald-800' : failed ? 'text-red-700' : 'text-gray-500'}`}>{label}</span>
              {result != null && (
                <span className={`text-xs font-bold flex-shrink-0 ${passed ? 'text-emerald-500' : failed ? 'text-red-400' : 'text-gray-300'}`}>
                  {passed ? 'Pass' : failed ? 'Fail' : 'N/A'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §8  IMAGE QUALITY REPORT
   Actual: image_quality.{width, height, good_resolution, blur_score,
   is_blurry, metadata_present, government_text_present, uidai_present}
   ═══════════════════════════════════════════════════════════════════ */
function ImageQualityReport({ result }) {
  const q   = get(result, 'image_quality') ?? get(result, 'aadhaar_image_quality') ?? {}
  const ocr = get(result, 'ocr_confidence') ?? get(result, 'aadhaar_ocr_confidence')

  const resScore  = q.good_resolution === true ? 100 : q.good_resolution === false ? 40 : null
  const blurScore = q.blur_score != null ? normPct(q.blur_score, true) : null  // Laplacian → 0-100
  const ocrPct    = ocr != null ? normPct(ocr) : null

  const metricColor = (p) => p >= 80 ? 'text-emerald-600' : p >= 60 ? 'text-amber-500' : 'text-red-500'

  const METRICS = [
    { label: 'Image Resolution',  val: resScore,  color: 'indigo',  extra: q.width && q.height ? `${q.width}×${q.height}px` : null },
    { label: 'Blur Score',        val: blurScore, color: 'blue',    extra: q.is_blurry != null ? (q.is_blurry ? 'Blurry' : 'Sharp') : null },
    { label: 'OCR Confidence',    val: ocrPct,    color: 'emerald', extra: null },
    { label: 'Metadata Present',  val: q.metadata_present === true ? 100 : q.metadata_present === false ? 0 : null, color: 'violet', extra: null },
  ]

  return (
    <Section id="sec-quality" title="Image Quality Report" icon={ImageIcon}
             iconBg="bg-cyan-50" iconColor="text-cyan-600"
             badge={
               result != null
                 ? <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${q.good_resolution && !q.is_blurry ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                     {q.good_resolution && !q.is_blurry ? 'Good Quality' : 'Review Needed'}
                   </span>
                 : null
             }>
      <div className="p-5 space-y-4">
        {METRICS.map(({ label, val, color, extra }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="text-xs font-semibold text-gray-600">{label}</span>
                {extra && <span className="text-[10px] text-gray-400 ml-2">{extra}</span>}
              </div>
              <span className={`text-sm font-bold tabular-nums ${result == null || val == null ? 'text-gray-300' : metricColor(val)}`}>
                {result == null ? '—' : val != null ? `${val}%` : '—'}
              </span>
            </div>
            <ProgressBar value={result == null ? 0 : (val ?? 0)} color={color} />
          </div>
        ))}

        {/* Boolean checks */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50">
          {[
            { label: 'Govt Text Present', val: q.government_text_present },
            { label: 'UIDAI Present',     val: q.uidai_present           },
            { label: 'Metadata Present',  val: q.metadata_present        },
            { label: 'Not Blurry',        val: q.is_blurry != null ? !q.is_blurry : null },
          ].map(({ label, val }) => (
            <div key={label} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
              {result == null
                ? <Bone w="w-8" h="h-4" />
                : val === true
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : val === false
                    ? <XCircle className="w-4 h-4 text-red-400" />
                    : <MoreHorizontal className="w-4 h-4 text-gray-300" />}
            </div>
          ))}
        </div>

        {/* Raw dimensions */}
        {q.width && q.height && (
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1">Image Dimensions</p>
            <p className="text-sm font-bold text-indigo-700">{q.width} × {q.height} px</p>
          </div>
        )}
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §9  RISK FLAGS
   Actual: risk_flags is a string[] (e.g. ["Blurry document", "Low OCR confidence"])
   ═══════════════════════════════════════════════════════════════════ */
const FLAG_META = {
  'blurry document':      { severity: 'medium', action: 'Ask applicant to re-upload a clearer image.'     },
  'low ocr confidence':   { severity: 'high',   action: 'Manual review of OCR fields recommended.'        },
  'low resolution image': { severity: 'medium', action: 'Request higher resolution scan.'                 },
}

const SEV_STYLE = {
  critical: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700'       },
  high:     { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  medium:   { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700'   },
  low:      { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700'     },
}

function RiskFlags({ result }) {
  // risk_flags is string[]
  const rawFlags = get(result, 'risk_flags') ?? []
  const flags = rawFlags.map((desc) => {
    const meta = FLAG_META[desc.toLowerCase()] ?? { severity: 'low', action: 'Review manually.' }
    return { description: desc, ...meta }
  })

  return (
    <Section id="sec-risks" title="Risk Flags" icon={AlertTriangle}
             iconBg="bg-amber-50" iconColor="text-amber-600"
             badge={
               result != null
                 ? <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${flags.length === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                     {flags.length === 0 ? '✓ No Flags' : `${flags.length} Flag${flags.length > 1 ? 's' : ''}`}
                   </span>
                 : null
             }>
      <div className="p-5 space-y-3">
        {result == null
          ? [1, 2].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                <Bone w="w-40" h="h-4" /><Bone w="w-56" h="h-3" />
              </div>
            ))
          : flags.length === 0
            ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No risk flags detected</p>
              </div>
            )
            : flags.map((flag, i) => {
                const style = SEV_STYLE[flag.severity] ?? SEV_STYLE.low
                return (
                  <div key={i} className={`p-4 rounded-xl border ${style.border} ${style.bg}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl border ${style.border} flex items-center justify-center flex-shrink-0`}>
                        <AlertTriangle className={`w-4 h-4 ${style.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${style.badge}`}>{flag.severity}</span>
                        </div>
                        <p className={`text-sm font-semibold ${style.text} mb-0.5`}>{flag.description}</p>
                        <p className="text-xs text-gray-500">💡 {flag.action}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §10 PROCESS FLOW TIMELINE
   ═══════════════════════════════════════════════════════════════════ */
const TIMELINE_STEPS = [
  { label: 'Document Uploaded',       icon: Upload        },
  { label: 'OCR Text Extraction',     icon: ScanLine      },
  { label: 'LLM Field Parsing',       icon: FileText      },
  { label: 'QR Code Decoding',        icon: QrCode        },
  { label: 'OCR vs QR Comparison',    icon: ArrowLeftRight },
  { label: 'Database Lookup',         icon: Database      },
  { label: 'Image Quality Analysis',  icon: ImageIcon     },
  { label: 'Trust Score Calculated',  icon: TrendingUp    },
  { label: 'Verification Complete',   icon: Award         },
]

function ProcessTimeline({ result }) {
  return (
    <Section id="sec-timeline" title="Process Flow Timeline" icon={Activity}
             iconBg="bg-indigo-50" iconColor="text-indigo-600">
      <div className="p-5">
        <div className="relative">
          <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-gray-100" />
          <div className="space-y-3">
            {TIMELINE_STEPS.map((step, i) => {
              const Icon   = step.icon
              const done   = result != null
              const isLast = i === TIMELINE_STEPS.length - 1
              return (
                <div key={i} className="relative flex items-center gap-4 pl-12">
                  <div className={`absolute left-0 w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${done ? (isLast ? 'bg-emerald-500 border-emerald-500' : 'bg-indigo-600 border-indigo-600') : 'bg-white border-gray-200'}`}>
                    <Icon className={`w-4 h-4 ${done ? 'text-white' : 'text-gray-300'}`} strokeWidth={2} />
                  </div>
                  <div className="flex-1 flex items-center justify-between py-1">
                    <p className={`text-sm font-semibold ${done ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</p>
                    {done && <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isLast ? 'text-emerald-500' : 'text-indigo-400'}`} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   §11 TRUST SCORE BREAKDOWN
   Actual: trust_score (int), ocr_confidence, image_quality.*,
           verification_result.verification_score
   ═══════════════════════════════════════════════════════════════════ */
function TrustScoreBreakdown({ result }) {
  const score   = get(result, 'trust_score')
  const ocrConf = get(result, 'ocr_confidence')
  const img     = get(result, 'image_quality') ?? {}
  const vrScore = get(result, 'verification_result.verification_score')
  const cmpScore = get(result, 'comparison.match_score')

  // Approximate breakdown from trust_score.py logic:
  //   base=50, OCR>90→+20, OCR>75→+10, good_res→+10, !blurry→+10, metadata→+10
  const ocrPoints    = result == null ? null : ocrConf > 90 ? 20 : ocrConf > 75 ? 10 : 0
  const resPoints    = result == null ? null : img.good_resolution ? 10 : 0
  const blurPoints   = result == null ? null : !img.is_blurry ? 10 : 0
  const metaPoints   = result == null ? null : img.metadata_present ? 10 : 0

  const COMPS = [
    { label: 'Base Score',          score: result == null ? null : 50,          max: 50,  color: 'indigo'  },
    { label: 'OCR Quality',         score: ocrPoints,                            max: 20,  color: 'blue'    },
    { label: 'Image Resolution',    score: resPoints,                            max: 10,  color: 'violet'  },
    { label: 'Image Clarity',       score: blurPoints,                           max: 10,  color: 'emerald' },
    { label: 'Metadata Quality',    score: metaPoints,                           max: 10,  color: 'cyan'    },
  ]

  const finalColor = (score ?? 0) >= 80 ? 'text-emerald-600' : (score ?? 0) >= 55 ? 'text-amber-500' : 'text-red-500'

  return (
    <Section id="sec-breakdown" title="Trust Score Breakdown" icon={TrendingUp}
             iconBg="bg-indigo-50" iconColor="text-indigo-600">
      <div className="p-5 space-y-4">
        {COMPS.map(({ label, score: s, max, color }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-600">{label}</span>
              <span className="text-xs font-black tabular-nums text-indigo-700">
                {result == null ? '—' : s != null ? s : '—'}
                <span className="text-gray-300 font-normal"> / {max}</span>
              </span>
            </div>
            <ProgressBar value={result == null ? 0 : (s ?? 0)} max={max} color={color} />
          </div>
        ))}

        {/* DB & QR supplemental info */}
        {result != null && (vrScore != null || cmpScore != null) && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            {vrScore != null && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                <p className="text-[10px] text-emerald-500 uppercase tracking-wider mb-1">DB Verify Score</p>
                <p className="text-lg font-black text-emerald-700">{vrScore}%</p>
              </div>
            )}
            {cmpScore != null && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                <p className="text-[10px] text-amber-500 uppercase tracking-wider mb-1">QR Match Score</p>
                <p className="text-lg font-black text-amber-700">{cmpScore}%</p>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm font-black text-gray-800">Final Trust Score</span>
          {result == null
            ? <Bone w="w-20" h="h-8" className="rounded-xl" />
            : <span className={`text-3xl font-black tabular-nums ${finalColor}`}>
                {score ?? '—'}<span className="text-base text-gray-300 ml-0.5">/ 100</span>
              </span>}
        </div>
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD HEADER
   ═══════════════════════════════════════════════════════════════════ */
function DashboardHeader({ result, onBack, onNew, onExport }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
      <div className="flex items-center gap-4">
        <button id="dash-back" type="button" onClick={onBack}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-600 shadow-sm transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h1 className="text-xl font-black text-indigo-950 tracking-tight">Document Verification Agent</h1>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Fingerprint className="w-3 h-3" />
            {result ? 'Verification complete — all sections populated below' : 'Awaiting verification — showing placeholder layout'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button id="dash-export" type="button" onClick={onExport}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-600 shadow-sm transition-all">
          <Download className="w-4 h-4" /> Export JSON
        </button>
        <button id="dash-new" type="button" onClick={onNew}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all">
          <RefreshCw className="w-4 h-4" /> New Verification
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD (export)
   ═══════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const result   = location.state?.result ?? null

  const handleExport = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `verification_${Date.now()}.json` })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen page-bg light-dot-grid">
      <Navbar />
      <div aria-hidden="true" className="fixed top-16 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-5">
        <DashboardHeader result={result} onBack={() => navigate('/')} onNew={() => navigate('/')} onExport={handleExport} />

        {/* §1 Document Overview */}
        <DocumentOverview result={result} />

        {/* §2 OCR (2/3)  +  §11 Trust Score Breakdown (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2"><OCRExtractedData result={result} /></div>
          <div><TrustScoreBreakdown result={result} /></div>
        </div>

        {/* §3 QR  +  §7 Validation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <QRDecodedInfo result={result} />
          <ValidationChecks result={result} />
        </div>

        {/* §4 OCR vs QR */}
        <OCRvsQR result={result} />

        {/* Identity Comparison (Aadhaar ↔ PAN) */}
        <IdentityComparison result={result} />

        {/* §5 Database  +  §8 Image Quality */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DatabaseVerification result={result} />
          <ImageQualityReport result={result} />
        </div>

        {/* §6 Three-Way Comparison */}
        <DatabaseComparison result={result} />

        {/* §9 Risk Flags  +  §10 Process Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RiskFlags result={result} />
          <ProcessTimeline result={result} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
