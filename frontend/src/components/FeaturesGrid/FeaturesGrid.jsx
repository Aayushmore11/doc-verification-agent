/**
 * FeaturesGrid.jsx
 *
 * 6-card feature grid (2 rows × 3 cols on desktop, stacked on mobile).
 * Each card has:
 *  - Coloured icon in a rounded square
 *  - Short title
 *  - 2-line description
 *  - Subtle hover: border highlight + faint glow
 *
 * Scroll-triggered entrance: cards slide up with a stagger as they enter
 * the viewport (Framer Motion whileInView).
 *
 * Why a grid over a list?  Banking products live or die on trust signals.
 * A dense feature grid communicates maturity and completeness instantly.
 */

import { motion } from 'framer-motion'
import {
  ScanLine, UserCheck, Zap, ClipboardList, Code2, Network
} from 'lucide-react'

/* ─── Feature data ───────────────────────────────────────────────────────── */
const FEATURES = [
  {
    id: 'doc-intelligence',
    icon: ScanLine,
    color: 'blue',
    title: 'Document Intelligence',
    description:
      'Extract structured fields from Aadhaar, PAN, Passport, and Driving Licence using fine-tuned OCR models with <0.3% error rate.',
  },
  {
    id: 'face-liveness',
    icon: UserCheck,
    color: 'emerald',
    title: 'Face Liveness Detection',
    description:
      'ISO 30107-3 compliant passive liveness check. Defeats deepfakes, printed photos, and 3D mask attacks in real time.',
  },
  {
    id: 'realtime-decision',
    icon: Zap,
    color: 'amber',
    title: 'Real-time Decisioning',
    description:
      'Instant accept / manual-review / reject verdict with configurable risk thresholds. Average latency under 3 seconds.',
  },
  {
    id: 'audit-trail',
    icon: ClipboardList,
    color: 'violet',
    title: 'Immutable Audit Trail',
    description:
      'Every verification event is cryptographically signed and stored — ready for RBI inspections and internal audits.',
  },
  {
    id: 'api-sdk',
    icon: Code2,
    color: 'sky',
    title: 'Drop-in REST API',
    description:
      'OpenAPI 3.1 spec, SDK libraries for Python, Node, and Java. Go live in your existing loan origination system in hours.',
  },
  {
    id: 'bureau-check',
    icon: Network,
    color: 'rose',
    title: 'Multi-Bureau Cross-Check',
    description:
      'Cross-verify extracted identity data against CKYC, UIDAI, CIBIL, and Experian in a single API call.',
  },
]

/* ─── Colour map → Tailwind class sets ───────────────────────────────────── */
const COLOR_MAP = {
  blue:    { bg: 'bg-blue-500/10',    icon: 'text-blue-400',    border: 'hover:border-blue-500/40',   glow: 'hover:shadow-blue-500/5'    },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'hover:border-emerald-500/40', glow: 'hover:shadow-emerald-500/5' },
  amber:   { bg: 'bg-amber-500/10',   icon: 'text-amber-400',   border: 'hover:border-amber-500/40',  glow: 'hover:shadow-amber-500/5'   },
  violet:  { bg: 'bg-violet-500/10',  icon: 'text-violet-400',  border: 'hover:border-violet-500/40', glow: 'hover:shadow-violet-500/5'  },
  sky:     { bg: 'bg-sky-500/10',     icon: 'text-sky-400',     border: 'hover:border-sky-500/40',    glow: 'hover:shadow-sky-500/5'     },
  rose:    { bg: 'bg-rose-500/10',    icon: 'text-rose-400',    border: 'hover:border-rose-500/40',   glow: 'hover:shadow-rose-500/5'    },
}

/* ─── Animation ─────────────────────────────────────────────────────────── */
const cardVariants = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function FeaturesGrid() {
  return (
    <section
      id="platform"
      className="bg-slate-950 py-24 lg:py-32"
      aria-labelledby="features-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section header ─────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">
            Platform Capabilities
          </span>
          <h2
            id="features-heading"
            className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight"
          >
            Everything you need for end-to-end KYC
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            A single platform replacing your patchwork of document scanners,
            manual review queues, and bureau integrations.
          </p>
        </div>

        {/* ── Feature cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat, i) => {
            const c = COLOR_MAP[feat.color]
            return (
              <motion.article
                key={feat.id}
                id={`feature-${feat.id}`}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className={`
                  group relative p-7 rounded-2xl border border-slate-800
                  bg-slate-900/60 backdrop-blur-sm
                  transition-all duration-300 cursor-default
                  hover:bg-slate-900/90 hover:shadow-xl
                  ${c.border} ${c.glow}
                `}
              >
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center mb-5`}>
                  <feat.icon className={`w-5 h-5 ${c.icon}`} strokeWidth={1.75} />
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-white mb-2">
                  {feat.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feat.description}
                </p>

                {/* Hover bottom accent line */}
                <div
                  aria-hidden="true"
                  className={`absolute bottom-0 left-6 right-6 h-px ${c.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
