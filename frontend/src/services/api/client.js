import axios from 'axios'

/**
 * Central Axios instance.
 * - baseURL read from Vite env (falls back to localhost for safety)
 * - JWT injected on every request
 * - workspace_id auto-injected on CRM requests when a workspace is active
 * - 401 → clear token and redirect to /login
 * - 403 / 5xx → let pages handle via error state
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Paths that should NOT receive the workspace_id query param ───────────────
// Auth endpoints and workspace-management endpoints handle their own context.
const WORKSPACE_EXCLUDED_PATHS = [
  '/auth/',
  '/workspaces',
  '/users',
  '/health',
]

function shouldInjectWorkspaceId(url = '') {
  return !WORKSPACE_EXCLUDED_PATHS.some((prefix) => url.startsWith(prefix))
}

// ─── Request interceptor — inject bearer token + workspace_id ─────────────────
api.interceptors.request.use(
  (config) => {
    // 1. JWT
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 2. Auto-inject workspace_id for all CRM/AI calls.
    //    When in Personal Area (type === 'personal'), skip injection so the
    //    backend treats missing workspace_id as Personal Area (existing behaviour).
    const url = config.url || ''
    if (shouldInjectWorkspaceId(url)) {
      try {
        const stored = localStorage.getItem('sg_active_workspace')
        if (stored) {
          const ws = JSON.parse(stored)
          if (ws?.id && ws?.type !== 'personal') {
            // Only inject if caller hasn't already set workspace_id explicitly
            if (!config.params?.workspace_id) {
              config.params = { ...config.params, workspace_id: ws.id }
            }
          }
        }
      } catch {
        // Malformed localStorage value — safe to ignore, workspace_id stays absent
      }
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
    const url = error?.config?.url || ''
    const method = (error?.config?.method || '').toLowerCase()

    // Credential-check endpoints return 401 for expected user errors
    // (wrong password / wrong current password), NOT for session expiry.
    // Let those errors bubble up to the calling component so it can show
    // an inline message instead of redirecting to /login.
    const isCredentialCheck =
      (method === 'post' && url.includes('/auth/login')) ||
      (method === 'post' && url.includes('/auth/change-password'))

    if (status === 401 && !isCredentialCheck) {
      // Token expired or invalid — clear auth state and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      localStorage.removeItem('sg_active_workspace')
      // Use replace so the user can't navigate "back" into the protected app
      window.location.replace('/login')
    }
    return Promise.reject(error)
  },
)

export default api