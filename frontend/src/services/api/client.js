import axios from 'axios'

/**
 * Central Axios instance.
 * - baseURL read from Vite env (falls back to localhost for safety)
 * - JWT injected on every request
 * - 401 → clear token and redirect to /login
 * - 403 / 5xx → let pages handle via error state
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request interceptor — inject bearer token ────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ─── Response interceptor — handle auth errors globally ──────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      // Token expired or invalid — clear auth state and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      // Use replace so the user can't navigate "back" into the protected app
      window.location.replace('/login')
    }
    return Promise.reject(error)
  },
)

export default api