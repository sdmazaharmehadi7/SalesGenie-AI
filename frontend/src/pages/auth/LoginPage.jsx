import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/services/api/client'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import AuthLayout from '@/components/auth/AuthLayout'
import GoogleAuthButton from '@/components/auth/GoogleAuthButton'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

function extractErrorMessage(err, fallback) {
  const data = err?.response?.data
  const errorCode = data?.error?.error_code || data?.error_code
  // Expected credential failure — show a friendly, consistent message
  if (errorCode === 'invalid_credentials') return 'Incorrect email or password'
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.detail)) {
    return data.detail.map((d) => d.msg || d.message).filter(Boolean).join(' ') || fallback
  }
  if (data?.error?.message) return data.error.message
  return err?.message || fallback
}

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      const { data } = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      await login(data.access_token)
      showToast('Signed in successfully!', 'success')
      // Always land on the dashboard after login — ignore any stale redirect state
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = extractErrorMessage(err, 'Incorrect email or password')
      setError(msg)
      // Keep the email filled in; clear only the password field
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout subtitle="Enter your details to access your workspace." title="Welcome back">
      {/* Continue with Google */}
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

      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
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
          <div className="rounded-control border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
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
