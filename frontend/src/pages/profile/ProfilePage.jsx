import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Award,
  Briefcase,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { getDashboardSummary } from '@/services/api/dashboard'
import { changePassword } from '@/services/api/auth'

/** Returns up to 2 uppercase initials from a name string. */
function getInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || 'U'
}

const ROLE_LABELS = {
  admin: 'Admin',
  sales_rep: 'Sales Rep',
  manager: 'Manager',
}

// ─── Password field with show/hide toggle ────────────────────────────────────
function PasswordField({ id, label, value, onChange, error, placeholder, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink-secondary" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
          autoComplete={autoComplete}
          className={[
            'input pr-10',
            error ? 'border-danger focus:border-danger focus:ring-red-100' : '',
          ].join(' ')}
          id={id}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || ''}
          type={show ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          type="button"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && (
        <p className="text-xs text-danger" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const { showToast } = useToast()
  const [fields, setFields] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const dialogRef = useRef(null)

  // Trap focus / close on Escape
  useEffect(() => {
    const el = dialogRef.current
    if (el) el.focus()
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const set = (key) => (val) => {
    setFields((f) => ({ ...f, [key]: val }))
    setErrors((e) => ({ ...e, [key]: '', form: '' }))
  }

  function validate() {
    const errs = {}
    if (!fields.current) errs.current = 'Current password is required.'
    if (!fields.next) {
      errs.next = 'New password is required.'
    } else if (fields.next.length < 8) {
      errs.next = 'New password must be at least 8 characters.'
    } else if (!/\d/.test(fields.next)) {
      errs.next = 'New password must contain at least one digit.'
    } else if (!/[a-zA-Z]/.test(fields.next)) {
      errs.next = 'New password must contain at least one letter.'
    } else if (fields.next === fields.current) {
      errs.next = 'New password must differ from your current password.'
    }
    if (!fields.confirm) {
      errs.confirm = 'Please confirm your new password.'
    } else if (fields.confirm !== fields.next) {
      errs.confirm = 'Passwords do not match.'
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setErrors({})
    try {
      await changePassword({
        currentPassword: fields.current,
        newPassword: fields.next,
        confirmPassword: fields.confirm,
      })
      setSuccess(true)
      showToast('Password changed successfully!', 'success')
      setTimeout(onClose, 1200)
    } catch (err) {
      const detail = err?.response?.data?.detail
      // detail can be a string or an array of Pydantic validation errors
      let msg = 'Something went wrong. Please try again.'
      if (typeof detail === 'string') {
        msg = detail
        // Map known error codes to field-level errors
        if (err?.response?.data?.error_code === 'invalid_current_password') {
          setErrors({ current: 'Current password is incorrect.' })
          return
        }
        if (err?.response?.data?.error_code === 'same_password') {
          setErrors({ next: msg })
          return
        }
      } else if (Array.isArray(detail)) {
        // Pydantic v2 validation errors
        const fieldMap = { current_password: 'current', new_password: 'next', confirm_password: 'confirm' }
        const mapped = {}
        detail.forEach((d) => {
          const loc = d.loc?.[d.loc.length - 1]
          if (loc && fieldMap[loc]) mapped[fieldMap[loc]] = d.msg
          else mapped.form = d.msg
        })
        setErrors(mapped)
        return
      }
      setErrors({ form: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Backdrop */
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div
        className="card w-full max-w-md p-6 shadow-overlay outline-none"
        ref={dialogRef}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-control bg-brand-50 text-brand-600">
              <Lock className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Change Password</h2>
              <p className="text-xs text-ink-muted">Enter your current password to continue.</p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="rounded-control p-1 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <ShieldCheck className="size-6" />
            </div>
            <p className="font-medium text-ink-primary">Password changed!</p>
            <p className="text-sm text-ink-muted">You're all set. Closing…</p>
          </div>
        ) : (
          <form className="space-y-4" noValidate onSubmit={handleSubmit}>
            <PasswordField
              autoComplete="current-password"
              error={errors.current}
              id="cp-current"
              label="Current Password"
              onChange={set('current')}
              placeholder="Your current password"
              value={fields.current}
            />
            <PasswordField
              autoComplete="new-password"
              error={errors.next}
              id="cp-new"
              label="New Password"
              onChange={set('next')}
              placeholder="At least 8 characters"
              value={fields.next}
            />
            <PasswordField
              autoComplete="new-password"
              error={errors.confirm}
              id="cp-confirm"
              label="Confirm New Password"
              onChange={set('confirm')}
              placeholder="Repeat new password"
              value={fields.confirm}
            />

            {/* Strength hint */}
            {fields.next && !errors.next && (
              <p className="text-xs text-ink-muted">
                Password strength is good — contains letters and a digit.
              </p>
            )}

            {/* Form-level error */}
            {errors.form && (
              <p className="rounded-control bg-red-50 px-3 py-2 text-xs text-danger" role="alert">
                {errors.form}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                className="btn btn-secondary btn-sm"
                disabled={loading}
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                disabled={loading}
                type="submit"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="size-3.5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        fill="currentColor"
                      />
                    </svg>
                    Changing…
                  </span>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  // Live pipeline stats from the dashboard
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    getDashboardSummary()
      .then((data) => setStats(data))
      .catch(console.error)
      .finally(() => setStatsLoading(false))
  }, [])

  const initials = getInitials(user?.name)
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || 'Sales Rep'
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  const closedWon = stats?.stages?.find((s) => s.status === 'closed_won')?.count ?? 0
  const totalLeads = stats?.total_leads ?? 0
  const conversionRate = stats?.conversion_rate ? `${Number(stats.conversion_rate).toFixed(1)}%` : '—'

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-2">

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink-primary">My Profile</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your account information and activity summary.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">

        {/* ─── LEFT CARD ──────────────────────────────────────────────────── */}
        <div className="card p-8">
          <div className="flex flex-col items-center text-center">

            {/* Avatar */}
            <div className="grid size-24 place-items-center rounded-full bg-slate-900 text-3xl font-bold text-white ring-4 ring-white shadow-md">
              {initials}
            </div>

            <h2 className="mt-5 text-xl font-bold text-ink-primary">{user?.name || '—'}</h2>
            <p className="text-sm text-ink-muted">{roleLabel}</p>

            {/* Role & status badges */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
                {roleLabel}
              </span>
              {user?.is_active !== false && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                  Active
                </span>
              )}
            </div>

            <hr className="my-6 w-full border-line-default" />

            {/* Contact details */}
            <div className="w-full space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-ink-secondary">
                <Mail className="size-4 shrink-0 text-brand-500" />
                <span className="truncate">{user?.email || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-ink-secondary">
                <Building2 className="size-4 shrink-0 text-amber-500" />
                <span>{user?.department || 'AI-Powered Sales Forecasting Platform Using Predictive Analytics'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-ink-secondary">
                <User className="size-4 shrink-0 text-slate-400" />
                <span>Member since {memberSince}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT SECTION ───────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Personal Information */}
          <div className="card p-6">
            <h2 className="mb-5 text-base font-semibold text-ink-primary">Personal Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-ink-secondary">Full Name</span>
                <input
                  className="input"
                  defaultValue={user?.name || ''}
                  disabled
                  title="Name cannot be changed here. Contact your administrator."
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-ink-secondary">Email</span>
                <input
                  className="input"
                  defaultValue={user?.email || ''}
                  disabled
                  type="email"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-ink-secondary">Department</span>
                <input
                  className="input"
                  defaultValue={user?.department || ''}
                  disabled
                  placeholder="No department set"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-ink-secondary">Role</span>
                <input className="input" defaultValue={roleLabel} disabled />
              </label>
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              To change your name, department, or role, contact your workspace administrator.
            </p>
          </div>

          {/* Live Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Award, color: 'text-amber-500', label: 'Deals Won', value: statsLoading ? '…' : closedWon },
              { icon: Activity, color: 'text-emerald-500', label: 'Conversion Rate', value: statsLoading ? '…' : conversionRate },
              { icon: Briefcase, color: 'text-brand-500', label: 'Total Leads', value: statsLoading ? '…' : totalLeads },
            ].map(({ icon: Icon, color, label, value }) => (
              <article className="card p-5" key={label}>
                <Icon className={`mb-3 size-7 ${color}`} />
                <p className="text-sm text-ink-muted">{label}</p>
                <h3 className="mt-1 text-2xl font-bold text-ink-primary">{value}</h3>
              </article>
            ))}
          </div>

          {/* Security — password only, no 2FA */}
          <div className="card p-6">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-ink-primary">Security</h2>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-sm font-medium text-ink-primary">Password</h3>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Keep your account secure with a strong password.
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPasswordModal(true)}
                  type="button"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}