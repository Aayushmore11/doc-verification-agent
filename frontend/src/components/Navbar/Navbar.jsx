/**
 * Navbar.jsx — Shared light-themed navigation bar
 * Used by both the Home page and the Dashboard.
 */

import { useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck, LayoutDashboard, History, ChevronDown } from 'lucide-react'

export default function Navbar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const onDash    = location.pathname === '/dashboard'

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5" aria-label="VerifyAI Home">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600
                          flex items-center justify-center shadow-lg shadow-indigo-200/60">
            <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div className="leading-none">
            <p className="text-sm font-black text-slate-900 tracking-tight">VerifyAI</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
              Saath Aapke… Hamesha
            </p>
          </div>
        </a>

        {/* Centre label */}
        <span className="hidden sm:block text-sm font-medium text-slate-600">
          Document Verification Portal
        </span>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            id="nav-dashboard"
            onClick={() => navigate('/dashboard')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-medium transition-colors
                       ${onDash
                         ? 'text-indigo-700 bg-indigo-50 font-semibold'
                         : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:block">Dashboard</span>
          </button>

          <button
            id="nav-history"
            onClick={() => navigate('/history')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-medium transition-colors
                       ${location.pathname === '/history'
                         ? 'text-indigo-700 bg-indigo-50 font-semibold'
                         : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50'}`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:block">History</span>
          </button>

          {/* User avatar */}
          <button
            id="nav-user"
            className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200
                       text-sm font-medium text-slate-700 hover:text-indigo-700 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center">
              <span className="text-xs font-bold text-white">A</span>
            </div>
            <span className="hidden sm:block">Aayush</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  )
}
