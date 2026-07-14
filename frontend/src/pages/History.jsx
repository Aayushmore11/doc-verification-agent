/**
 * History.jsx — KYC Verification History page
 * Displays past verification records stored in LocalStorage.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History, Search, Trash2, Calendar, FileText, ArrowLeft, Sparkles, ChevronRight, AlertCircle
} from 'lucide-react'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer/Footer'
import { formatFileSize, truncate } from '../utils/formatters'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const rawHistory = window.localStorage.getItem('kyc_history')
      if (rawHistory) {
        setHistory(JSON.parse(rawHistory))
      }
    } catch (e) {
      console.error('[History] Failed to load kyc_history:', e)
    }
  }, [])

  // Save history to localStorage on update
  const saveHistory = (newHistory) => {
    setHistory(newHistory)
    try {
      window.localStorage.setItem('kyc_history', JSON.stringify(newHistory))
    } catch (e) {
      console.error('[History] Failed to save kyc_history:', e)
    }
  }

  // Delete a single record
  const handleDelete = (id, e) => {
    e.stopPropagation()
    const newHistory = history.filter(item => item.id !== id)
    saveHistory(newHistory)
  }

  // Clear all history records
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all verification history? This cannot be undone.')) {
      saveHistory([])
    }
  }

  // Format date helper
  const formatDateTime = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter history based on search query
  const filteredHistory = history.filter(item => {
    const fileName = item.fileName.toLowerCase()
    const name = (item.result?.parsed_data?.full_name || item.result?.parsed_data?.name || '').toLowerCase()
    const docType = (item.result?.parsed_data?.document_type || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return fileName.includes(query) || name.includes(query) || docType.includes(query)
  })

  return (
    <div className="min-h-screen page-bg light-dot-grid">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-6">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-600 shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div>
              <h1 className="text-xl font-black text-indigo-950 tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-655" style={{ color: 'var(--color-brand-600)' }} /> Verification History
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage and view past AI-powered document extractions
              </p>
            </div>
          </div>
          
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 text-sm font-semibold text-red-600 shadow-sm transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Clear All History
            </button>
          )}
        </div>

        {/* Search & Statistics Bar */}
        {history.length > 0 && (
          <div className="card-white p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                placeholder="Search history by name, file, or doc type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            
            <div className="flex gap-4 text-xs font-semibold text-slate-500">
              <div className="bg-indigo-50 px-3.5 py-2 rounded-xl border border-indigo-100/50">
                Total Runs: <span className="text-indigo-755 font-bold" style={{ color: 'var(--color-brand-700)' }}>{history.length}</span>
              </div>
              <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100/50">
                Verified: <span className="text-emerald-700 font-bold">{history.filter(i => i.status === 'Verified').length}</span>
              </div>
              <div className="bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-100/50">
                Review: <span className="text-amber-700 font-bold">{history.filter(i => i.status === 'Manual Review').length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Main List */}
        <div className="space-y-4">
          {history.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-white flex flex-col items-center justify-center py-20 px-6 text-center max-w-xl mx-auto gap-6 mt-8"
            >
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-lg shadow-indigo-100/40">
                <History className="w-8 h-8 text-indigo-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800">No verification history yet</h3>
                <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                  Upload an Aadhaar card on the homepage to view OCR extraction results, QR signatures, and trust scores.
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all btn-glow cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Start First Verification
              </button>
            </motion.div>
          ) : filteredHistory.length === 0 ? (
            /* No search results */
            <div className="text-center py-16 text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold">No matching records found</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for a different name or filename.</p>
            </div>
          ) : (
            /* History records list */
            <div className="space-y-3">
              <AnimatePresence>
                {filteredHistory.map((item) => {
                  const name = item.result?.parsed_data?.full_name || item.result?.parsed_data?.name || 'Unknown'
                  const score = item.result?.trust_score ?? 0
                  const docType = item.result?.parsed_data?.document_type ?? 'Aadhaar'
                  
                  const statusColors = 
                    item.status === 'Verified' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : item.status === 'Manual Review'
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-red-50 text-red-700 border-red-100'

                  return (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => navigate('/dashboard', { state: { result: item.result } })}
                      className="card-white p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
                    >
                      {/* Left: icon + file name / details */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100/50 transition-colors">
                          <FileText className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs" title={name}>
                              {name}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                              {docType}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                            <span className="truncate max-w-[150px] sm:max-w-xs" title={item.fileName}>
                              {truncate(item.fileName, 40)}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>{formatFileSize(item.fileSize)}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {formatDateTime(item.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: scores, status, action buttons */}
                      <div className="flex items-center gap-4 self-end md:self-auto w-full md:w-auto justify-between md:justify-end">
                        {/* Score & Verdict */}
                        <div className="flex items-center gap-4">
                          <div className="text-right flex-shrink-0">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Trust Score</p>
                            <p className="text-lg font-black text-indigo-950 tabular-nums">
                              {score}<span className="text-xs text-slate-300 font-normal">/100</span>
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors}`}>
                            {item.status}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-2 rounded-xl border border-slate-200 hover:border-red-200 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

      </main>

      <Footer />
    </div>
  )
}
