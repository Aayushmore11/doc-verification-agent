import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home      from './pages/Home'
import Dashboard from './pages/Dashboard'
import HistoryPage from './pages/History'

/**
 * App.jsx — Root of the React component tree.
 *
 * Responsibilities:
 *  - Wraps the entire app in BrowserRouter so every child can use
 *    React Router hooks (useNavigate, useParams, etc.).
 *  - Declares all top-level <Route> mappings.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Home />}      />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history"   element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
