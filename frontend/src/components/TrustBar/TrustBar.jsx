/**
 * TrustBar.jsx
 *
 * "Trusted by India's leading financial institutions" strip.
 * Displays named placeholders for bank/NBFC logos in a scrolling row.
 *
 * Why this section matters for enterprise products:
 *  - Social proof from recognisable institutions removes hesitation.
 *  - Placed immediately after the hero to catch attention before scroll-away.
 *
 * Visual: Muted on purpose — logos should be subtle, not distracting.
 * Replace the text placeholders with <img> tags as real partnerships land.
 */

import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'

/* Replace with real institution names / logo <img> tags */
const INSTITUTIONS = [
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Bajaj Finserv',
  'SBI Life',
  'Kotak Mahindra',
  'Yes Bank',
  'IndusInd Bank',
]

export default function TrustBar() {
  return (
    <section
      id="trust"
      aria-label="Trusted institutions"
      className="relative z-10 bg-slate-950 border-y border-slate-800/60 py-12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Caption */}
        <p className="text-center text-xs font-semibold text-slate-600 uppercase tracking-widest mb-8">
          Trusted by India's leading financial institutions
        </p>

        {/* Logo strip */}
        <div className="relative overflow-hidden">
          {/* Fade masks on left and right edges */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-950 to-transparent z-10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-950 to-transparent z-10"
          />

          {/* Scrolling row — duplicate items to create seamless loop */}
          <motion.div
            className="flex items-center gap-10"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
          >
            {[...INSTITUTIONS, ...INSTITUTIONS].map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70 transition-colors group"
              >
                <Building2 className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                <span className="text-sm font-medium text-slate-500 group-hover:text-slate-300 transition-colors whitespace-nowrap">
                  {name}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
