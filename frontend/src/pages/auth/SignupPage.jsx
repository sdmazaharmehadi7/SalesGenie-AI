import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/services/api/client'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import AuthLayout from '@/components/auth/AuthLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
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
      // Register the user
      const { data } = await api.post('/auth/register', {
        name,
        email,
        password,
        role: 'sales_rep',
      })

      // Registration returns tokens — log the user in immediately
      await login(data.access_token)
      showToast('Account created! Welcome to AI-Powered Sales Forecasting Platform Using Predictive Analytics.', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = extractErrorMessage(err, 'Registration failed. Please try again.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout subtitle="Start organizing your sales work in one place." title="Create your account">
      <form className="space-y-5" onSubmit={handleSubmit}>
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
          {loading ? 'Creating account…' : 'Create account'}
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
