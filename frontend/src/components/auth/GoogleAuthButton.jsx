import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { getGoogleAuthConfig, googleLogin } from '@/services/api/auth'

/**
 * Official Google "G" logo SVG.
 */
function GoogleIcon({ className = 'size-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  )
}

/**
 * GoogleAuthButton component — provides "Continue with Google" sign-in / registration.
 *
 * @param {Object} props
 * @param {'signin'|'signup'} [props.mode='signin']
 * @param {Function} [props.onError]
 */
export default function GoogleAuthButton({ mode = 'signin', onError }) {
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || null)
  const gisInitializedRef = useRef(false)

  // 1. Fetch Google Client ID from backend if not provided in frontend env
  useEffect(() => {
    let isMounted = true
    if (!clientId) {
      getGoogleAuthConfig()
        .then((data) => {
          if (isMounted && data?.client_id) {
            setClientId(data.client_id)
          }
        })
        .catch(() => {
          // Backend config unavailable or not configured
        })
    }
    return () => {
      isMounted = false
    }
  }, [clientId])

  // 2. Load Google Identity Services (GIS) script
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if script is already present
    if (document.getElementById('google-gsi-client')) {
      return
    }

    const script = document.createElement('script')
    script.id = 'google-gsi-client'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    return () => {
      // Keep script cached for other pages
    }
  }, [])

  // 3. Process credential response from Google
  const handleCredentialResponse = async (response) => {
    if (!response?.credential) {
      const err = 'No credential received from Google.'
      if (onError) onError(err)
      return
    }

    setLoading(true)
    if (onError) onError(null)

    try {
      const tokenData = await googleLogin({
        credential: response.credential,
      })

      await login(tokenData.access_token)
      showToast(
        mode === 'signup'
          ? 'Account created with Google! Welcome.'
          : 'Signed in with Google successfully!',
        'success'
      )
      // Always land on the dashboard after auth — ignore any stale redirect state
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Google login failed:', err)
      const data = err?.response?.data
      let msg = 'Google authentication failed. Please try again.'
      if (typeof data?.detail === 'string') msg = data.detail
      else if (data?.error?.message) msg = data.error.message
      else if (err?.message) msg = err.message

      if (onError) onError(msg)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  // 4. Initialize Google Identity Services when Client ID and GIS script are ready
  useEffect(() => {
    if (!clientId || typeof window === 'undefined' || !window.google?.accounts?.id) {
      return
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      gisInitializedRef.current = true
    } catch (e) {
      console.warn('Google Identity Services initialization warning:', e)
    }
  }, [clientId])

  // 5. Button Click Handler
  const handleGoogleClick = () => {
    if (loading) return
    if (onError) onError(null)

    // Check if Client ID is configured
    if (!clientId) {
      const msg =
        'Google OAuth Client ID is not configured. Please set GOOGLE_CLIENT_ID in your environment variables.'
      if (onError) onError(msg)
      showToast(msg, 'error')
      return
    }

    // Try Google Identity Services One Tap / Prompt
    if (window.google?.accounts?.id) {
      try {
        if (!gisInitializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          })
          gisInitializedRef.current = true
        }

        // Prompt Google Sign-In overlay
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // If prompt is suppressed/skipped, use standard Google OAuth popup flow
            launchGooglePopup(clientId)
          }
        })
      } catch (err) {
        console.warn('GIS prompt error, falling back to popup:', err)
        launchGooglePopup(clientId)
      }
    } else {
      launchGooglePopup(clientId)
    }
  }

  // Fallback OAuth popup flow if GIS prompt is blocked
  const launchGooglePopup = (currentClientId) => {
    try {
      if (window.google?.accounts?.oauth2) {
        const client = window.google.accounts.oauth2.initCodeClient({
          client_id: currentClientId,
          scope: 'openid email profile',
          callback: async (response) => {
            if (response.code) {
              setLoading(true)
              try {
                const tokenData = await googleLogin({
                  code: response.code,
                  redirect_uri: window.location.origin,
                })
                await login(tokenData.access_token)
                showToast('Signed in with Google successfully!', 'success')
                // Always land on the dashboard after auth
                navigate('/dashboard', { replace: true })
              } catch (err) {
                const msg = err?.response?.data?.detail || 'Google authentication failed.'
                if (onError) onError(msg)
                showToast(msg, 'error')
              } finally {
                setLoading(false)
              }
            }
          },
          error_callback: (err) => {
            console.warn('Google popup error:', err)
            if (onError) onError('Google sign-in was cancelled or encountered an error.')
          },
        })
        client.requestCode()
      } else {
        const msg = 'Google Sign-In is currently loading. Please try again in a moment.'
        if (onError) onError(msg)
      }
    } catch (popupErr) {
      console.error('Failed to launch Google popup:', popupErr)
      if (onError) onError('Could not launch Google Sign-In. Please check your browser popup settings.')
    }
  }

  const buttonText = mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'

  return (
    <button
      type="button"
      onClick={handleGoogleClick}
      disabled={loading}
      className="relative flex w-full items-center justify-center gap-3 rounded-control border border-line-default bg-surface-default px-4 py-2.5 text-sm font-semibold text-ink-primary shadow-xs transition-all hover:bg-surface-subtle hover:border-line-strong focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={buttonText}
    >
      {loading ? (
        <svg className="size-4 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
        </svg>
      ) : (
        <GoogleIcon className="size-5 shrink-0" />
      )}
      <span>{loading ? 'Connecting to Google…' : buttonText}</span>
    </button>
  )
}
