/**
 * src/services/api.js
 *
 * Central Axios instance.
 *
 * Why a shared instance?
 *  - Single place to set baseURL, timeout, and default headers.
 *  - Request interceptor attaches the auth token on every call.
 *  - Response interceptor handles 401 (auto-logout) and generic errors.
 *  - All feature-level service files import THIS instance — never raw axios.
 *
 * Usage:
 *   import api from './api'
 *   const response = await api.post('/kyc/verify', formData)
 */

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30_000, // 30 s — generous for AI-inference endpoints
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // TODO: read token from localStorage / auth context and attach it
    // const token = localStorage.getItem('access_token')
    // if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO: clear auth state and redirect to /login
      console.warn('[api] Unauthorized — redirect to login')
    }
    return Promise.reject(error)
  },
)

export default api
