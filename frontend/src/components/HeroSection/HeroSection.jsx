/**
 * HeroSection.jsx
 *
 * Full-viewport landing hero with:
 *  - Compliance announcement badge (top pill)
 *  - Gradient headline with accent word
 *  - One-line value proposition subheading
 *  - Two CTAs: primary (Get Started) + secondary (Watch Demo)
 *  - 4-column stat strip: Documents, Accuracy, Speed, Banks
 *
 * Visual language: deep navy + radial blue glow + dot-grid texture.
 * Animations: staggered fade-up on mount via Framer Motion.
 */

import { motion } from 'framer-motion'
import {
  ArrowRight, Play, CheckCircle2,
  Zap, ShieldCheck, Globe
} from 'lucide-react'

/* ─── Animation variants ─────────────────────────────────────────────────── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}
const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
}
const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
}

/* ─── Static data ────────────────────────────────────────────────────────── */
const STATS = [
  { value: '50M+',   label: 'Documents Verified',   icon: ShieldCheck },
  { value: '99.7%',  label: 'Accuracy Rate',         icon: CheckCircle2 },
  { value: '<3s',    label: 'Avg. Processing Time',  icon: Zap },
  { value: '200+',   label: 'Bank Integrations',     icon: Globe },
]

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center hero-bg dot-grid overflow-hidden pt-16"
      aria-labelledby="hero-heading"
    >
      {/* ── Decorative glow orbs ────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Top-center blue orb */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-blue-600/10 blur-3xl" />
        {/* Bottom-right purple orb */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full bg-indigo-700/8 blur-3xl" />
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {/* Compliance pill */}
          <motion.div variants={fadeUp} className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-semibold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              RBI Compliant &nbsp;·&nbsp; ISO 27001 Certified &nbsp;·&nbsp; SOC 2 Type II
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            id="hero-heading"
            variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6"
          >
            <span className="gradient-text">Instant KYC Verification</span>
            <br />
            <span className="gradient-text-blue">Powered by Enterprise AI</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Process Aadhaar, PAN, Passport, and driving licence in under&nbsp;
            <span className="text-slate-200 font-medium">3 seconds</span> with
            bank-grade accuracy. Built for banks, NBFCs, and financial institutions
            across India.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          >
            {/* Primary */}
            <button
              id="hero-cta-primary"
              className="group inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-200 btn-glow text-sm"
            >
              Start Verifying
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Secondary */}
            <button
              id="hero-cta-demo"
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold rounded-xl transition-all duration-200 text-sm bg-slate-900/50 hover:bg-slate-800/60"
            >
              <span className="w-7 h-7 rounded-full bg-slate-700 group-hover:bg-slate-600 flex items-center justify-center transition-colors">
                <Play className="w-3 h-3 text-white fill-white translate-x-px" />
              </span>
              Watch 2-min Demo
            </button>
          </motion.div>

          {/* ── Stats strip ───────────────────────────────────────────── */}
          <motion.div variants={fadeIn}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-800">
              {STATS.map(({ value, label, icon: Icon }) => (
                <div
                  key={label}
                  className="bg-slate-900/70 hover:bg-slate-800/80 transition-colors px-6 py-7 text-center group"
                >
                  <Icon className="w-5 h-5 text-blue-400 mx-auto mb-3 opacity-80" />
                  <p className="text-3xl font-bold text-white mb-1 tabular-nums">
                    {value}
                  </p>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Bottom fade into next section ───────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-slate-950 to-transparent"
      />
    </section>
  )
}
