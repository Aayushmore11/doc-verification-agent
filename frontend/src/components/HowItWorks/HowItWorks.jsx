/**
 * HowItWorks.jsx
 *
 * 3-step process explainer:
 *   1. Upload Document
 *   2. AI Extracts & Validates
 *   3. Instant Decision
 *
 * Visuals:
 *  - Numbered steps connected by a dotted connector line (desktop)
 *  - Large step number as a background watermark
 *  - Icon in a coloured pill
 *  - Short heading + 2-line description
 *
 * This section answers "how does this actually work?" for decision-makers
 * who haven't seen AI-based KYC before — critical for enterprise sales.
 */

import { motion } from 'framer-motion'
import { Upload, BrainCircuit, BadgeCheck } from 'lucide-react'

const STEPS = [
  {
    step: '01',
    icon: Upload,
    color: 'blue',
    title: 'Submit Document',
    description:
      'Customer uploads or captures their identity document via your mobile app, web portal, or our white-labelled SDK.',
  },
  {
    step: '02',
    icon: BrainCircuit,
    color: 'violet',
    title: 'AI Extracts & Validates',
    description:
      'Our multi-model pipeline performs OCR, field extraction, tamper detection, and face matching against the selfie — in parallel.',
  },
  {
    step: '03',
    icon: BadgeCheck,
    color: 'emerald',
    title: 'Instant Decision',
    description:
      'A risk-scored result (Verified / Review / Rejected) arrives in your webhook in under 3 seconds with a full confidence breakdown.',
  },
]

const ICON_COLOR = {
  blue:    { bg: 'bg-blue-500/10',    icon: 'text-blue-400'    },
  violet:  { bg: 'bg-violet-500/10',  icon: 'text-violet-400'  },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400' },
}

export default function HowItWorks() {
  return (
    <section
      id="solutions"
      className="relative bg-slate-950 py-24 lg:py-32 overflow-hidden"
      aria-labelledby="how-heading"
    >
      {/* Subtle mid-page glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="w-[600px] h-[400px] rounded-full bg-violet-700/6 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="inline-block text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">
            How It Works
          </span>
          <h2
            id="how-heading"
            className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4"
          >
            From upload to decision in 3 seconds
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            No manual queues, no overnight batch jobs. Every verification is
            processed live with a full audit record.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">

          {/* Connector line — desktop only */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-14 left-[calc(16.66%+1.5rem)] right-[calc(16.66%+1.5rem)] h-px border-t border-dashed border-slate-700"
          />

          {STEPS.map((step, i) => {
            const c = ICON_COLOR[step.color]
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="relative text-center md:text-left"
              >
                {/* Watermark step number */}
                <span
                  aria-hidden="true"
                  className="absolute -top-4 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 text-8xl font-black text-slate-800/50 select-none leading-none"
                >
                  {step.step}
                </span>

                {/* Icon bubble — centred on mobile, left-aligned on desktop */}
                <div className="relative z-10 flex justify-center md:justify-start mb-5">
                  <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center border border-slate-800`}>
                    <step.icon className={`w-6 h-6 ${c.icon}`} strokeWidth={1.75} />
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-16"
        >
          <button
            id="how-cta"
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition-all duration-200 bg-slate-900/50 hover:bg-slate-800"
          >
            Read the Technical Documentation
          </button>
        </motion.div>
      </div>
    </section>
  )
}
