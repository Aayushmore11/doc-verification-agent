/**
 * Footer.jsx — Shared light-themed footer
 */

import { ShieldCheck, Lock, Award, Heart } from 'lucide-react'

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
)
const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
)

const SOCIALS = [
  { icon: LinkedInIcon, href: '#', label: 'LinkedIn' },
  { icon: XIcon,        href: '#', label: 'X (Twitter)' },
  { icon: GitHubIcon,   href: '#', label: 'GitHub' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      id="footer"
      className="bg-white border-t border-slate-200 py-10 mt-16"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-indigo-50">
          
          {/* Brand & Mission */}
          <div className="md:col-span-5 space-y-4">
            <a href="/" className="flex items-center gap-2.5 group" aria-label="VerifyAI">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-md shadow-indigo-200">
                <ShieldCheck className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-indigo-950 font-black text-lg tracking-tight">
                  Verify<span className="text-indigo-600">AI</span>
                </span>
                <p className="text-[9px] text-indigo-400 uppercase tracking-widest font-semibold leading-none">
                  Saath Aapke… Hamesha
                </p>
              </div>
            </a>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              Enterprise-grade document verification agent powered by state-of-the-art AI, computer vision, and secure database matching.
            </p>
          </div>

          {/* Verification Standards Badges */}
          <div className="md:col-span-4 space-y-3">
            <p className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Compliance & Trust</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 border border-emerald-100 text-emerald-700">
                <ShieldCheck className="w-3 h-3" /> RBI KYC Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-50 border border-blue-100 text-blue-700">
                <Lock className="w-3 h-3" /> ISO 27001 Certified
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-purple-50 border border-purple-100 text-purple-700">
                <Award className="w-3 h-3" /> UIDAI Registered Agent
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-3 space-y-3">
            <p className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Legal & Support</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <a href="#" className="text-gray-500 hover:text-indigo-600 transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-500 hover:text-indigo-600 transition-colors">Terms of Use</a>
              <a href="#" className="text-gray-500 hover:text-indigo-600 transition-colors">Contact Support</a>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
          <p className="text-xs text-gray-400">
            © {year} VerifyAI Technologies Pvt. Ltd. All rights reserved.
          </p>
          
          {/* Socials & Made with heart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-2xl border border-slate-200 hover:border-indigo-300
                             bg-slate-100 hover:bg-indigo-50 flex items-center justify-center
                             text-slate-500 hover:text-indigo-600 transition-all duration-200"
                >
                  <Icon />
                </a>
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
              <span>Made with</span>
              <Heart className="w-3 h-3 text-red-500 fill-current" />
              <span>in India</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
