import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, RefreshCw } from '@/components/ui/icons'
import { handleGmailCallback } from '@/services/api/gmail'
import { useToast } from '@/context/ToastContext'

export default function GmailOAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [status, setStatus] = useState('processing') // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    async function processCallback() {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      if (error) {
        if (!active) return
        setStatus('error')
        const msg = error === 'access_denied' ? 'Google authorization was denied or cancelled.' : `Google OAuth error: ${error}`
        setErrorMessage(msg)
        showToast(msg, 'error')
        setTimeout(() => navigate('/settings/email'), 2500)
        return
      }

      if (!code || !state) {
        if (!active) return
        setStatus('error')
        setErrorMessage('Missing authorization code or state parameter.')
        showToast('Invalid OAuth callback parameters.', 'error')
        setTimeout(() => navigate('/settings/email'), 2500)
        return
      }

      try {
        const result = await handleGmailCallback(code, state)
        if (!active) return

        setStatus('success')
        showToast(`Connected Gmail: ${result.provider_email || 'Your account'}`, 'success')
        setTimeout(() => navigate('/settings/email'), 1200)
      } catch (err) {
        if (!active) return
        setStatus('error')
        const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to exchange authorization code with Google.'
        setErrorMessage(msg)
        showToast(msg, 'error')
        setTimeout(() => navigate('/settings/email'), 3000)
      }
    }

    processCallback()

    return () => {
      active = false
    }
  }, [searchParams, navigate, showToast])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-line-default bg-surface-default p-8 text-center shadow-md">
        {status === 'processing' && (
          <div className="space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <RefreshCw className="size-7 animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-ink-primary">Connecting Your Gmail Account</h2>
            <p className="text-xs text-ink-muted">
              Securely completing OAuth 2.0 handshake with Google...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </div>
            <h2 className="text-lg font-bold text-ink-primary">Gmail Connected Successfully!</h2>
            <p className="text-xs text-ink-muted">
              Redirecting you to Email Integration settings...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle className="size-7" />
            </div>
            <h2 className="text-lg font-bold text-ink-primary">Connection Failed</h2>
            <p className="text-xs text-rose-600 font-medium">
              {errorMessage}
            </p>
            <p className="text-xs text-ink-muted">
              Redirecting you back to settings...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
