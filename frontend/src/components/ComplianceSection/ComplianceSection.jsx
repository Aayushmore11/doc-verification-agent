/**
 * ComplianceSection.jsx
 *
 * Regulatory & security trust section — critical for selling to banks.
 * Two-column layout:
 *   Left  — Narrative: "Built with compliance at its core"
 *   Right — 4 compliance badge cards (RBI, UIDAI, ISO 27001, SOC 2)
 *
 * Also includes a security callout bar at the bottom:
 *   AES-256 | TLS 1.3 | Air-gapped Processing | Zero-retention Policy
 *
 * Enterprise buying committees spend more time on this section than the
 * hero — make it credible, not just pretty.
 */

import { motion } from 'framer-motion'
import {
  ShieldCheck, FileText, Lock, Server,
  CheckCircle2, KeyRound, EyeOff, HardDrive
} from 'lucide-react'

/* ─── Compliance badges ───────────────────────────────────────────────────── */
const BADGES = [
  {
    icon: FileText,
    label: 'RBI KYC Guidelines',
    sub: 'Master Direction — KYC, 2016',
    color: 'blue',
  },
  {
    icon: ShieldCheck,
    label: 'UIDAI Compliant',
    sub: 'Aadhaar Auth & eKYC Approved',
    color: 'emerald',
  },
  {
    icon: Lock,
    label: 'ISO / IEC 27001',
    sub: 'Information Security Certified',
    color: 'violet',
  },
  {
    icon: Server,
    label: 'SOC 2 Type II',
    sub: 'Independently Audited Annually',
    color: 'amber',
  },
]

/* ─── Security pillars ────────────────────────────────────────────────────── */
const SECURITY = [
  { icon: KeyRound,    label: 'AES-256 Encryption' },
  { icon: Lock,        label: 'TLS 1.3 in Transit'  },
  { icon: EyeOff,      label: 'Zero-Retention Policy'},
  { icon: HardDrive,   label: 'India-hosted Data'   },
]

const BADGE_COLOR = {
  blue:    { bg: 'bg-blue-500/10',    icon: 'text-blue-400',    border: 'border-blue-500/20'    },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'border-emerald-500/20' },
  violet:  { bg: 'bg-violet-500/10',  icon: 'text-violet-400',  border: 'border-violet-500/20'  },
  amber:   { bg: 'bg-amber-500/10',   icon: 'text-amber-400',   border: 'border-amber-500/20'   },
}

export default function ComplianceSection() {
  return (
    <section
      id="compliance"
      className="relative bg-slate-950 py-24 lg:py-32 border-t border-slate-800/60"
      aria-labelledby="compliance-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Two-column layout ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-4">
              Compliance &amp; Security
            </span>
            <h2
              id="compliance-heading"
              className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-6"
            >
              Built with compliance
              <br />
              <span className="gradient-text-blue">at its core</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-8">
              VerifyAI is designed from the ground up to meet the strictest regulatory
              requirements in India's financial sector. Our infrastructure undergoes
              quarterly third-party security audits and maintains continuous compliance
              monitoring.
            </p>

            {/* Checklist */}
            <ul className="space-y-3">
              {[
                'RBI Master Direction on KYC fully implemented',
                'UIDAI-certified Aadhaar eKYC operator',
                'CKYC registry integration for seamless onboarding',
                'FATF risk-based approach for PEP & sanctions screening',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right — Badge grid */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 gap-4"
          >
            {BADGES.map(({ icon: Icon, label, sub, color }) => {
              const c = BADGE_COLOR[color]
              return (
                <div
                  key={label}
                  className={`p-6 rounded-2xl border ${c.border} ${c.bg} flex flex-col gap-3 hover:scale-[1.02] transition-transform duration-200`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-slate-900/60 border ${c.border} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${c.icon}`} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">{label}</p>
                    <p className="text-xs text-slate-500">{sub}</p>
                  </div>
                </div>
              )
            })}
          </motion.div>
        </div>

        {/* ── Security pillars bar ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-800"
        >
          {SECURITY.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="bg-slate-900/60 hover:bg-slate-800/80 transition-colors px-6 py-5 flex items-center gap-3"
            >
              <Icon className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-400">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
