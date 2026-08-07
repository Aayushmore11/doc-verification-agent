import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home                from './pages/Home'
import Dashboard          from './pages/Dashboard'
import HistoryPage        from './pages/History'
import LoanDocumentUpload from './pages/LoanDocumentUpload'

/**
 * App.jsx — Root of the React component tree.
 *
 * Route map (updated):
 *   /            → LoanDocumentUpload  (primary / new homepage — loan-type flow)
 *   /quick-kyc   → Home               (legacy Aadhaar+PAN single-doc flow)
 *   /dashboard   → Dashboard
 *   /history     → HistoryPage
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Loan-type multi-doc flow is now the homepage */}
        <Route path="/"          element={<LoanDocumentUpload />} />

        {/* Legacy single-doc Aadhaar+PAN flow relocated to /quick-kyc */}
        <Route path="/quick-kyc" element={<Home />}              />

        <Route path="/dashboard" element={<Dashboard />}         />
        <Route path="/history"   element={<HistoryPage />}       />
      </Routes>
    </BrowserRouter>
  )
}

export default App
