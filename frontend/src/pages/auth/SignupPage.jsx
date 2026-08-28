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

function extractErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.detail)) {
    return data.detail.map((d) => d.msg || d.message).filter(Boolean).join(' ') || fallback
  }
  if (data?.error?.details && Array.isArray(data.error.details)) {
    const detailMsgs = data.error.details.map((d) => d.msg || d.message).filter(Boolean).join(' ')
    if (detailMsgs) return detailMsgs
  }
  if (data?.error?.message) return data.error.message
  return err?.message || fallback
}

function SignupPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { showToast } = useToast()

  // Step: 'register' | 'otp'
  const [step, setStep] = useState('register')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  async function handleRegisterSubmit(event) {
    event.preventDefault()
    setError(null)

    // Pre-validate password client-side for immediate feedback
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (!/\d/.test(password)) {
      setError('Password must contain at least one digit (0-9).')
      return
    }
    if (!/[a-zA-Z]/.test(password)) {
      setError('Password must contain at least one letter.')
      return
    }

    setLoading(true)

    try {
      // Register the user -> triggers backend OTP email
      await api.post('/auth/register', {
        name,
        email,
        password,
        role: 'sales_rep',
      })

      showToast('Verification code sent to your email!', 'info')
      setStep('otp')
      setCooldown(60)
      setOtp('')
    } catch (err) {
      const msg = extractErrorMessage(err, 'Registration failed. Please try again.')
      setError(msg)
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
      showToast('Email verified! Welcome to SalesGenie.', 'success')
      const target = await getPostAuthRedirectUrl(authResult?.user)
      navigate(target, { replace: true })
    } catch (err) {
      const msg = extractErrorMessage(err, 'Invalid or expired verification code.')
      setError(msg)
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
      const msg = extractErrorMessage(err, 'Failed to resend code. Please try again.')
      setError(msg)
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
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary" htmlFor="otp-input">
              6-Digit Verification Code
            </label>
            <input
              autoComplete="one-time-code"
              autoFocus
              className="w-full text-center text-2xl font-bold tracking-[0.5em] rounded-control border border-line-strong bg-surface-default p-3 text-ink-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              id="otp-input"
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
            {loading ? 'Verifying…' : 'Verify & Continue'}
          </Button>

          <div className="flex items-center justify-between pt-2 border-t border-line-default text-xs">
            <button
              className="inline-flex items-center gap-1 font-medium text-ink-muted hover:text-ink-primary transition-colors"
              onClick={() => {
                setStep('register')
                setError(null)
              }}
              type="button"
            >
              <ArrowLeft className="size-3.5" />
              <span>Change email</span>
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

  // ─── STEP 1: Registration Form Screen ────────────────────────────────────────
  return (
    <AuthLayout subtitle="Start organizing your sales work in one place." title="Create your account">
      {/* Sign up with Google (Google accounts bypass OTP) */}
      <div className="space-y-4">
        <GoogleAuthButton
          mode="signup"
          onError={(msg) => setError(msg)}
        />

        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-line-default" />
          <span className="relative bg-surface-canvas px-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
            Or register with email
          </span>
        </div>
      </div>

      <form className="mt-5 space-y-5" onSubmit={handleRegisterSubmit}>
        <Input
          autoComplete="name"
          label="Full name"
          name="name"
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          autoComplete="email"
          label="Work email"
          name="email"
          placeholder="you@company.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          autoComplete="new-password"
          hint="Must be at least 8 characters with at least one letter and one number (e.g. Sales1234)."
          label="Password"
          name="password"
          placeholder="Create a password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label className="flex items-start gap-2 text-sm leading-5 text-ink-secondary">
          <input
            className="mt-0.5 size-4 shrink-0 rounded border-line-strong text-brand-600 focus:ring-brand-500"
            name="terms"
            required
            type="checkbox"
          />
          <span>I agree to the Terms of Service and Privacy Policy.</span>
        </label>

        {error && (
          <div className="rounded-control border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <Button className="w-full" disabled={loading} type="submit">
          {loading ? 'Sending code…' : 'Create account & Send Verification Code'}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link className="font-medium text-brand-600 hover:text-brand-700" to="/login">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

export default SignupPage
