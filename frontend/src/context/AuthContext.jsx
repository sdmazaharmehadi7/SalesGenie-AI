import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import api from '@/services/api/client'

/**
 * AuthContext — single source of truth for authentication state.
 *
 * Session Persistence Rules:
 *  1. User & Token are initialized synchronously from localStorage on app launch/reload.
 *  2. Background re-verification occurs via GET /auth/me without flashing loading states.
 *  3. Session is ONLY cleared upon explicit user logout OR an actual 401 Unauthorized from backend.
 *  4. Temporary network errors or 5xx server issues maintain the active session.
 *
 * Workspace Integration:
 *  - On successful login, `onLoginSuccess` callback fires so WorkspaceContext
 *    can refresh the workspace list without a circular context dependency.
 *  - On logout, `onLogoutCleanup` fires so WorkspaceContext can reset.
 */
const AuthContext = createContext(null)

// Callbacks registered by WorkspaceProvider to react to auth events.
// Using a ref-based registry avoids circular context dependencies.
const authEventCallbacks = {
  onLoginSuccess: null,
  onLogout: null,
}

export function registerAuthCallbacks({ onLoginSuccess, onLogout }) {
  authEventCallbacks.onLoginSuccess = onLoginSuccess
  authEventCallbacks.onLogout = onLogout
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('user')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  const [isLoading, setIsLoading] = useState(() => {
    // If no token exists, we are not loading. If token exists, do background check.
    const token = localStorage.getItem('access_token')
    const cachedUser = localStorage.getItem('user')
    // If we have both token and cached user, don't block the UI while re-verifying
    return Boolean(token && !cachedUser)
  })

  /** Fetch current user from backend and refresh local cache. */
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return null
    }

    try {
      const { data } = await api.get('/auth/me')
      setUser(data)
      localStorage.setItem('user', JSON.stringify(data))
      return data
    } catch (err) {
      // ONLY clear session if backend explicitly responds with 401 Unauthorized
      if (err?.response?.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        localStorage.removeItem('sg_active_workspace')
        setUser(null)
      }
      // On network errors or 500s, preserve existing cached session
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // On mount, verify session with backend
  useEffect(() => {
    loadUser().then((userData) => {
      if (userData && authEventCallbacks.onLoginSuccess) {
        authEventCallbacks.onLoginSuccess(userData)
      }
    })
  }, [loadUser])

  /**
   * Call after a successful login response.
   * @param {string} accessToken — JWT returned by POST /auth/login
   */
  const login = useCallback(async (accessToken) => {
    localStorage.setItem('access_token', accessToken)
    try {
      const { data } = await api.get('/auth/me')
      setUser(data)
      localStorage.setItem('user', JSON.stringify(data))

      // Notify WorkspaceContext to refresh workspace list
      if (authEventCallbacks.onLoginSuccess) {
        authEventCallbacks.onLoginSuccess(data)
      }

      return { success: true, user: data }
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      }
      return { success: false, error: err }
    }
  }, [])

  /** Explicit user sign out. */
  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    localStorage.removeItem('sg_active_workspace')
    setUser(null)

    // Notify WorkspaceContext to reset
    if (authEventCallbacks.onLogout) {
      authEventCallbacks.onLogout()
    }

    window.location.replace('/login')
  }, [])

  const value = {
    user,
    isAuthenticated: Boolean(user && localStorage.getItem('access_token')),
    isLoading,
    login,
    logout,
    refreshUser: loadUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Hook to consume AuthContext. Throws if used outside <AuthProvider>. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
