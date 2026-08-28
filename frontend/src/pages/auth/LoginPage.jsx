import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/services/api/client'
import { verifyOtp, resendOtp } from '@/services/api/auth'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import AuthLayout from '@/components/auth/AuthLayout'
import GoogleAuthButton from '@/components/auth/GoogleAuthButton'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ArrowLeft, Mail, RefreshCw } from '@/components/ui/icons'

import { getPostAuthRedirectUrl } from '@/services/api/authRedirect'

function extractErrorInfo(err, fallback) {
  const data = err?.response?.data
  const errorCode = data?.error?.error_code || data?.error_code
  let message = fallback

  if (errorCode === 'invalid_credentials') {
    message = 'Incorrect email or password'
  } else if (errorCode === 'email_not_verified') {
    message = 'Please verify your email address before signing in.'
  } else if (typeof data?.detail === 'string') {
    message = data.detail
  } else if (Array.isArray(data?.detail)) {
    message = data.detail.map((d) => d.msg || d.message).filter(Boolean).join(' ') || fallback
  } else if (data?.error?.message) {
    message = data.error.message
  } else if (err?.message) {
    message = err.message
  }

  return { message, errorCode }
}

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { showToast } = useToast()

  const [step, setStep] = useState('login') // 'login' | 'otp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isUnverified, setIsUnverified] = useState(false)

  // Resend cooldown timer in seconds
  const [cooldown, setCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function handleLoginSubmit(event) {
    event.preventDefault()
    setError(null)
    setIsUnverified(false)
    setLoading(true)

    try {
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      const { data } = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      const authResult = await login(data.access_token)
      showToast('Signed in successfully!', 'success')
      const target = await getPostAuthRedirectUrl(authResult?.user)
      navigate(target, { replace: true })
    } catch (err) {
      const { message, errorCode } = extractErrorInfo(err, 'Incorrect email or password')
      setError(message)
      if (errorCode === 'email_not_verified') {
        setIsUnverified(true)
      }
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  async function handleStartVerification() {
    setError(null)
    setLoading(true)
    try {
      await resendOtp({ email })
      showToast('Verification code sent to your email!', 'info')
      setStep('otp')
      setCooldown(60)
      setOtp('')
    } catch (err) {
      const { message } = extractErrorInfo(err, 'Failed to send verification code.')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifySubmit(event) {
    event.preventDefault()
    setError(null)

    const cleanOtp = otp.trim()
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.')
      return
    }

    setLoading(true)

    try {
      const tokenData = await verifyOtp({ email, otp: cleanOtp })
      const authResult = await login(tokenData.access_token)
      showToast('Email verified! Signed in successfully.', 'success')
      const target = await getPostAuthRedirectUrl(authResult?.user)
      navigate(target, { replace: true })
    } catch (err) {
      const { message } = extractErrorInfo(err, 'Invalid or expired verification code.')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResendCode() {
    if (cooldown > 0 || isResending) return
    setError(null)
    setIsResending(true)

    try {
      await resendOtp({ email })
      showToast('A new 6-digit code has been sent to your email.', 'success')
      setCooldown(60)
    } catch (err) {
      const { message } = extractErrorInfo(err, 'Failed to resend code. Please try again.')
      setError(message)
    } finally {
      setIsResending(false)
    }
  }

  // ─── STEP 2: OTP Verification Screen ─────────────────────────────────────────
  if (step === 'otp') {
    return (
      <AuthLayout
        subtitle={`We sent a 6-digit verification code to ${email}.`}
        title="Verify your email"
      >
        <div className="mb-4 flex items-center justify-center">
          <div className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600 border border-brand-200">
            <Mail className="size-6" />
          </div>
        </div>

        <form className="mt-4 space-y-5" onSubmit={handleVerifySubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary" htmlFor="otp-login-input">
              6-Digit Verification Code
            </label>
            <input
              autoComplete="one-time-code"
              autoFocus
              className="w-full text-center text-2xl font-bold tracking-[0.5em] rounded-control border border-line-strong bg-surface-default p-3 text-ink-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              id="otp-login-input"
              maxLength={6}
              name="otp"
              placeholder="123456"
              required
              type="text"
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOtp(val)
                setError(null)
              }}
            />
            <p className="mt-1.5 text-center text-xs text-ink-muted">
              Check your inbox (or console in development mode).
            </p>
          </div>

          {error && (
            <div className="rounded-control border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}

          <Button className="w-full" disabled={loading || otp.length !== 6} type="submit">
            {loading ? 'Verifying…' : 'Verify & Sign In'}
          </Button>

          <div className="flex items-center justify-between pt-2 border-t border-line-default text-xs">
            <button
              className="inline-flex items-center gap-1 font-medium text-ink-muted hover:text-ink-primary transition-colors"
              onClick={() => {
                setStep('login')
                setError(null)
              }}
              type="button"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to sign in</span>
            </button>

            <button
              className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700 disabled:text-ink-muted disabled:cursor-not-allowed transition-colors"
              disabled={cooldown > 0 || isResending}
              onClick={handleResendCode}
              type="button"
            >
              <RefreshCw className={`size-3.5 ${isResending ? 'animate-spin' : ''}`} />
              <span>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : isResending ? 'Sending…' : 'Resend code'}
              </span>
            </button>
          </div>
        </form>
      </AuthLayout>
    )
  }

  // ─── STEP 1: Standard Login Screen ───────────────────────────────────────────
  return (
    <AuthLayout subtitle="Enter your details to access your workspace." title="Welcome back">
      {/* Continue with Google (OTP bypassed) */}
      <div className="space-y-4">
        <GoogleAuthButton
          mode="signin"
          onError={(msg) => setError(msg)}
        />

        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-line-default" />
          <span className="relative bg-surface-canvas px-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
            Or continue with email
          </span>
        </div>
      </div>

      <form className="mt-5 space-y-5" onSubmit={handleLoginSubmit}>
        <Input
          autoComplete="email"
          label="Work email"
          name="email"
          placeholder="you@company.com"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setIsUnverified(false)
          }}
          required
        />
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-ink-secondary" htmlFor="password">
              Password
            </label>
            <Link className="text-xs font-medium text-brand-600 hover:text-brand-700" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <Input
            autoComplete="current-password"
            id="password"
            name="password"
            placeholder="Enter your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="rounded-control border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 space-y-2">
            <div>{error}</div>
            {isUnverified && (
              <button
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline hover:text-brand-800"
                onClick={handleStartVerification}
                type="button"
              >
                Send verification code to {email} &rarr;
              </button>
            )}
          </div>
        )}

        <Button className="w-full" disabled={loading} type="submit">
          {loading ? 'Signing in…' : 'Sign in with Email'}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-muted">
        New to AI-Powered Sales Forecasting Platform Using Predictive Analytics?{' '}
        <Link className="font-medium text-brand-600 hover:text-brand-700" to="/signup">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}

export default LoginPage
