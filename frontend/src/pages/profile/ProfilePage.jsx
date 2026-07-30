import { useState } from 'react'
import {
  Activity,
  Award,
  Briefcase,
  Building2,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { getDashboardSummary } from '@/services/api/dashboard'
import { useEffect } from 'react'

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

export default function ProfilePage() {
  const { user } = useAuth()
  const { showToast } = useToast()

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
                <span>{user?.department || 'SalesGenie AI'}</span>
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

          {/* Security */}
          <div className="card p-6">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-ink-primary">Security</h2>
            </div>
            <div className="mt-5 divide-y divide-line-default">
              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-sm font-medium text-ink-primary">Password</h3>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Your password is managed via the login system.
                  </p>
                </div>
                <button
                  className="rounded-control border border-line-strong px-4 py-2 text-sm hover:bg-surface-muted"
                  onClick={() => showToast('Password reset is not available in this version.', 'warning')}
                  type="button"
                >
                  Change
                </button>
              </div>
              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-sm font-medium text-ink-primary">Two-Factor Authentication</h3>
                  <p className="mt-0.5 text-xs text-ink-muted">Add an extra layer of security.</p>
                </div>
                <button
                  className="rounded-control bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
                  onClick={() => showToast('2FA setup is not available in this version.', 'warning')}
                  type="button"
                >
                  Enable
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}