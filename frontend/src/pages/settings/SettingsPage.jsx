import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppearance } from '@/context/AppearanceContext'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useToast } from '@/context/ToastContext'
import { changePassword } from '@/services/api/auth'
import Button from '@/components/ui/Button'
import {
  listWorkspaceMembers,
  inviteUserByEmail,
  listWorkspaceInvitations,
  cancelInvitation,
  updateMemberRole,
  removeWorkspaceMember,
} from '@/services/api/workspaces'

/**
 * Persist settings to localStorage so they survive page refreshes.
 * Falls back gracefully if localStorage is unavailable.
 */
function usePersistedSettings(storageKey, defaultValues) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? { ...defaultValues, ...JSON.parse(raw) } : defaultValues
    } catch {
      return defaultValues
    }
  })

  const set = useCallback((key) => (val) => {
    setState((prev) => {
      const next = { ...prev, [key]: val }
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [storageKey])

  const save = useCallback(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* ignore */ }
  }, [storageKey, state])

  return [state, set, save]
}

// ─── Icons (inline SVG to avoid dependency issues) ────────────────────────────
function Icon({ d, className = 'size-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ICONS = {
  general:      'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  workspace:    'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  notifications:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  security:     'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  appearance:   'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
  ai:           'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  account:      'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  email:        'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  check:        'M5 13l4 4L19 7',
  chevron:      'M9 5l7 7-7 7',
  save:         'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4',
  danger:       'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  copy:         'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  refresh:      'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  link:         'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  trash:        'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  sun:          'M12 3v1m0 16v1m8.66-9H21M3 12H2m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  moon:         'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  key:          'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  eye:          'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  eyeOff:       'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 11-4.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
  shield:       'M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  zap:          'M13 10V3L4 14h7v7l9-11h-7z',
}

const NAV_SECTIONS = [
  { id: 'general',       label: 'General',          icon: 'general'       },
  { id: 'workspace',     label: 'Workspace',         icon: 'workspace'     },
  { id: 'notifications', label: 'Notifications',     icon: 'notifications' },
  { id: 'security',      label: 'Security',          icon: 'security'      },
  { id: 'appearance',    label: 'Appearance',        icon: 'appearance'    },
  { id: 'ai',            label: 'AI Preferences',    icon: 'ai'            },
  { id: 'account',       label: 'Account',           icon: 'account'       },
  { id: 'email',         label: 'Email Integration', icon: 'email'         },
]

// ─── Primitive controls ───────────────────────────────────────────────────────
function Toggle({ checked, onChange, id }) {
  return (
    <button
      aria-checked={checked}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        checked ? 'bg-brand-600' : 'bg-line-strong',
      ].join(' ')}
      id={id}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={[
          'pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

function SettingInput({ label, hint, value, onChange, type = 'text', placeholder, disabled }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink-secondary">{label}</label>
      <input
        className="input"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}

function SettingSelect({ label, hint, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink-secondary">{label}</label>
      <div className="relative">
        <select
          className="input cursor-pointer appearance-none pr-8"
          onChange={(e) => onChange(e.target.value)}
          value={value}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
          <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}

function SettingTextarea({ label, hint, value, onChange, rows = 3, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink-secondary">{label}</label>
      <textarea
        className="input h-auto resize-none py-2.5 leading-relaxed"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}

// ─── Shared section primitives ────────────────────────────────────────────────
function SectionCard({ children, className = '' }) {
  return (
    <div className={['card space-y-6', className].join(' ')}>
      {children}
    </div>
  )
}

function SectionTitle({ title, description }) {
  return (
    <div className="border-b border-line-default pb-4">
      <h2 className="text-base font-semibold text-ink-primary">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange, id }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-primary">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      <Toggle checked={checked} id={id} onChange={onChange} />
    </div>
  )
}

function Divider() {
  return <div className="border-t border-line-default" />
}

function SaveBar({ onSave, onDiscard, saved, hasUnsaved = true, disabled = false }) {
  return (
    <div className="flex items-center justify-between rounded-card border border-line-default bg-surface-default px-4 py-3 shadow-card">
      <p className="text-sm text-ink-muted">
        {saved
          ? <span className="flex items-center gap-1.5 text-emerald-600 font-medium"><Icon className="size-4" d={ICONS.check} /> Changes saved</span>
          : (hasUnsaved ? 'You have unsaved changes' : 'All changes saved')}
      </p>
      <div className="flex gap-2">
        <button
          className="btn btn-secondary btn-sm"
          disabled={!hasUnsaved && !saved}
          onClick={onDiscard}
          type="button"
        >
          Discard
        </button>
        <button
          className="btn btn-primary btn-sm"
          disabled={(!hasUnsaved && !saved) || disabled}
          onClick={onSave}
          type="button"
        >
          <Icon className="size-4" d={ICONS.save} /> Save changes
        </button>
      </div>
    </div>
  )
}

function DangerRow({ label, description, buttonLabel, variant = 'outline' }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-card border border-red-100 bg-red-50 px-4 py-3">
      <div className="flex gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-red-500" d={ICONS.danger} />
        <div>
          <p className="text-sm font-medium text-red-800">{label}</p>
          {description && <p className="mt-0.5 text-xs text-red-600">{description}</p>}
        </div>
      </div>
      <button className="btn btn-sm shrink-0 border border-red-300 bg-white text-red-700 hover:bg-red-50" type="button">
        {buttonLabel}
      </button>
    </div>
  )
}

function AvatarUpload({ name }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex items-center gap-4">
      <span className="inline-grid size-16 place-items-center rounded-full bg-brand-100 text-xl font-bold text-brand-700 ring-2 ring-brand-200 ring-offset-2">
        {initials}
      </span>
      <div>
        <button className="btn btn-secondary btn-sm" type="button">Upload photo</button>
        <p className="mt-1 text-xs text-ink-muted">JPG, PNG or GIF. Max 5 MB.</p>
      </div>
    </div>
  )
}

// ─── Section: General ─────────────────────────────────────────────────────────
function GeneralSection() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [saved, setSaved] = useState(false)
  const [form, set, persist] = usePersistedSettings('sg_settings_general', {
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    timezone: 'America/New_York',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
  })

  // Seed from the real user if localStorage didn't have a name yet
  useEffect(() => {
    if (user?.name && !localStorage.getItem('sg_settings_general')) {
      set('name')(user.name)
      set('email')(user.email || '')
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    persist()
    setSaved(true)
    showToast('Settings saved!', 'success')
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionTitle title="Profile" description="Your personal information and preferences." />
        <AvatarUpload name={form.name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingInput label="Full name" onChange={set('name')} placeholder="John Smith" value={form.name} />
          <SettingInput label="Email address" onChange={set('email')} placeholder="john@company.com" type="email" value={form.email} />
          <SettingInput label="Phone number" onChange={set('phone')} placeholder="+1 (555) 000-0000" type="tel" value={form.phone} />
          <SettingSelect
            label="Timezone"
            onChange={set('timezone')}
            options={[
              { value: 'America/New_York',    label: 'Eastern Time (ET)' },
              { value: 'America/Chicago',     label: 'Central Time (CT)' },
              { value: 'America/Denver',      label: 'Mountain Time (MT)' },
              { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
              { value: 'Europe/London',       label: 'Greenwich Mean Time (GMT)' },
              { value: 'Asia/Kolkata',        label: 'India Standard Time (IST)' },
              { value: 'Asia/Tokyo',          label: 'Japan Standard Time (JST)' },
            ]}
            value={form.timezone}
          />
          <SettingSelect
            label="Language"
            onChange={set('language')}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
              { value: 'ja', label: 'Japanese' },
            ]}
            value={form.language}
          />
          <SettingSelect
            label="Date format"
            onChange={set('dateFormat')}
            options={[
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
            ]}
            value={form.dateFormat}
          />
        </div>
        <SaveBar onSave={handleSave} saved={saved} />
      </SectionCard>
    </div>
  )
}

// ─── Section: Workspace ───────────────────────────────────────────────────────
function WorkspaceSection() {
  const { activeWorkspace, isPersonal } = useWorkspace()
  const { showToast } = useToast()
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('team_member')
  const [isInviting, setIsInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState(null)

  const loadTeamData = useCallback(async () => {
    if (!activeWorkspace?.id || isPersonal) return
    setLoadingMembers(true)
    try {
      const [membersData, invitesData] = await Promise.all([
        listWorkspaceMembers(activeWorkspace.id).catch(() => []),
        listWorkspaceInvitations(activeWorkspace.id).catch(() => []),
      ])
      setMembers(membersData || [])
      setInvitations(invitesData || [])
    } catch (err) {
      console.error('Failed to load workspace members:', err)
    } finally {
      setLoadingMembers(false)
    }
  }, [activeWorkspace?.id, isPersonal])

  useEffect(() => {
    loadTeamData()
  }, [loadTeamData])

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setIsInviting(true)
    try {
      const inv = await inviteUserByEmail(activeWorkspace.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      showToast(`Invitation created for ${inv.email}! Token: ${inv.token}`, 'success')
      setInviteEmail('')
      loadTeamData()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to send invitation.'
      showToast(msg, 'error')
    } finally {
      setIsInviting(false)
    }
  }

  const handleCancelInvite = async (invId) => {
    try {
      await cancelInvitation(activeWorkspace.id, invId)
      showToast('Invitation cancelled.', 'info')
      loadTeamData()
    } catch (err) {
      showToast('Failed to cancel invitation.', 'error')
    }
  }

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName || 'this member'}?`)) return
    try {
      await removeWorkspaceMember(activeWorkspace.id, userId)
      showToast('Member removed from workspace.', 'success')
      loadTeamData()
    } catch (err) {
      showToast('Failed to remove member.', 'error')
    }
  }

  const handleChangeRole = async (userId, newRole) => {
    try {
      await updateMemberRole(activeWorkspace.id, userId, newRole)
      showToast('Member role updated.', 'success')
      loadTeamData()
    } catch (err) {
      showToast('Failed to update role.', 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Workspace details card */}
      <SectionCard>
        <SectionTitle title="Workspace details" description="Current active workspace information." />
        <div className="rounded-card border border-line-default bg-surface-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-ink-primary">{activeWorkspace?.name}</p>
              <p className="text-xs text-ink-muted">{activeWorkspace?.description || 'No description provided.'}</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              Workspace ID: {activeWorkspace?.id?.slice(0, 8)}…
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Invite member form */}
      <SectionCard>
        <SectionTitle title="Invite team member" description="Send an invitation by email to add a new member to this workspace." />
        <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Email address</label>
            <input
              type="email"
              className="input w-full"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Role</label>
            <select
              className="input w-full"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="team_member">Team Member</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
            {isInviting ? 'Inviting…' : 'Send Invite'}
          </Button>
        </form>
      </SectionCard>

      {/* Team members list */}
      <SectionCard>
        <SectionTitle title={`Workspace members (${members.length})`} description="Active members in this workspace." />
        {loadingMembers ? (
          <div className="py-4 text-center text-xs text-ink-muted">Loading members…</div>
        ) : members.length === 0 ? (
          <div className="py-4 text-center text-xs text-ink-muted">No members found.</div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const isOwner = m.role === 'manager'
              return (
                <div className="flex items-center justify-between gap-3 rounded-card border border-line-default p-3" key={m.id}>
                  <div className="flex items-center gap-3">
                    <span className={`inline-grid size-8 place-items-center rounded-full text-xs font-bold ${
                      isOwner ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {(m.user_name || m.user_email || 'U').slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-primary">{m.user_name || m.user_email}</p>
                      <p className="text-xs text-ink-muted">{m.user_email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      className="rounded border border-line-default bg-surface-default px-2 py-1 text-xs font-medium"
                      value={m.role}
                      onChange={(e) => handleChangeRole(m.user_id, e.target.value)}
                    >
                      <option value="manager">Manager</option>
                      <option value="team_member">Team Member</option>
                    </select>

                    <button
                      className="rounded p-1 text-ink-muted hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => handleRemoveMember(m.user_id, m.user_name)}
                      title="Remove member"
                      type="button"
                    >
                      <Icon className="size-4" d={ICONS.trash} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <SectionCard>
          <SectionTitle title={`Pending invitations (${invitations.length})`} description="Invitations sent that have not yet been accepted." />
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div className="flex items-center justify-between gap-3 rounded-card border border-amber-200 bg-amber-50/40 p-3" key={inv.id}>
                <div>
                  <p className="text-sm font-medium text-ink-primary">{inv.email}</p>
                  <p className="text-xs text-ink-muted font-mono select-all">Token: {inv.token}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded border border-line-default bg-white px-2 py-1 text-xs font-medium text-ink-secondary hover:bg-surface-muted"
                    onClick={() => {
                      navigator.clipboard.writeText(inv.token)
                      setCopiedToken(inv.id)
                      setTimeout(() => setCopiedToken(null), 2000)
                    }}
                    type="button"
                  >
                    {copiedToken === inv.id ? 'Copied!' : 'Copy Token'}
                  </button>
                  <button
                    className="rounded p-1 text-rose-600 hover:bg-rose-100"
                    onClick={() => handleCancelInvite(inv.id)}
                    title="Cancel invitation"
                    type="button"
                  >
                    <Icon className="size-4" d={ICONS.trash} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ─── Section: Notifications ───────────────────────────────────────────────────
function NotificationsSection() {
  const [saved, setSaved] = useState(false)
  const [prefs, setPrefs] = useState({
    leadAssigned:    true,
    leadStatusChange: true,
    emailOpened:     false,
    emailReplied:    true,
    meetingReminder: true,
    weeklyDigest:    true,
    aiInsights:      true,
    teamMentions:    true,
    browserPush:     false,
    mobilePush:      true,
    slackAlerts:     false,
    smsAlerts:       false,
  })
  const toggle = (key) => { setSaved(false); setPrefs((p) => ({ ...p, [key]: !p[key] })) }

  const groups = [
    {
      title: 'Lead activity',
      rows: [
        { key: 'leadAssigned',     label: 'Lead assigned to me',          desc: 'When a new lead is assigned to your account.' },
        { key: 'leadStatusChange', label: 'Lead status changes',          desc: 'When a lead progresses through pipeline stages.' },
      ],
    },
    {
      title: 'Email activity',
      rows: [
        { key: 'emailOpened',  label: 'Email opened',   desc: 'When a prospect opens an email you sent.' },
        { key: 'emailReplied', label: 'Email replied',  desc: 'When a prospect replies to an outreach email.' },
      ],
    },
    {
      title: 'Meetings & reminders',
      rows: [
        { key: 'meetingReminder', label: 'Meeting reminders', desc: '15 minutes before a scheduled meeting.' },
        { key: 'weeklyDigest',    label: 'Weekly digest',     desc: 'Summary of your pipeline every Monday morning.' },
      ],
    },
    {
      title: 'AI & team',
      rows: [
        { key: 'aiInsights',  label: 'AI insights & recommendations', desc: 'When AI detects new opportunities or risks.' },
        { key: 'teamMentions', label: 'Team mentions',                desc: 'When a teammate @mentions you in a note.' },
      ],
    },
    {
      title: 'Delivery channels',
      rows: [
        { key: 'browserPush', label: 'Browser push notifications', desc: 'Receive notifications in your browser.' },
        { key: 'mobilePush',  label: 'Mobile push notifications',  desc: 'Push notifications on your phone.' },
        { key: 'slackAlerts', label: 'Slack alerts',               desc: 'Send notifications to a connected Slack channel.' },
        { key: 'smsAlerts',   label: 'SMS alerts',                 desc: 'Receive critical alerts via text message.' },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <SectionCard key={group.title}>
          <SectionTitle title={group.title} />
          <div className="space-y-4">
            {group.rows.map((row, i) => (
              <div key={row.key}>
                {i > 0 && <Divider />}
                <div className={i > 0 ? 'pt-4' : ''}>
                  <ToggleRow
                    checked={prefs[row.key]}
                    description={row.desc}
                    id={`notif-${row.key}`}
                    label={row.label}
                    onChange={() => toggle(row.key)}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ))}
      <SaveBar onSave={() => setSaved(true)} saved={saved} />
    </div>
  )
}

// ─── Section: Security ────────────────────────────────────────────────────────

/** Password strength levels */
const STRENGTH_LEVELS = {
  0: 'Empty',
  1: 'Weak',
  2: 'Medium',
  3: 'Strong',
  4: 'Very strong',
}

/**
 * Heuristic strength scorer — returns 0-4.
 * Weak: < 12 chars or no digit/symbol combo.
 * Medium: >= 12 chars with mixed case + digit.
 * Strong: >= 14 chars + digit + symbol.
 */
function scorePasswordStrength(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score += 1
  if (pw.length >= 12) score += 1
  if (/\d/.test(pw) && /[a-zA-Z]/.test(pw)) score += 1
  if (pw.length >= 14 && /[^A-Za-z0-9]/.test(pw)) score += 1
  return Math.min(4, score)
}

function PasswordInput({ label, id, value, onChange, error, placeholder, autoComplete }) {
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
          className={['input pr-10', error ? 'border-danger focus:border-danger focus:ring-red-100' : ''].join(' ')}
          id={id}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || ''}
          type={show ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary transition-colors"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          type="button"
        >
          <Icon className="size-4" d={show ? ICONS.eyeOff : ICONS.eye} />
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

function SecuritySection() {
  const { showToast } = useToast()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [twoFA, setTwoFA] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState('8h')

  const set = (key) => (val) => {
    setSaved(false)
    setErrors((e) => ({ ...e, [key]: '', form: '' }))
    setForm((f) => ({ ...f, [key]: val }))
  }

  const strength = scorePasswordStrength(form.newPass)
  const confirmMatches = form.confirm === form.newPass && form.newPass !== ''
  const canSave = !saving && form.current !== '' && strength >= 2 && confirmMatches
  // Track whether the user has typed anything so the unsaved-changes bar shows
  const hasUnsaved = form.current !== '' || form.newPass !== '' || form.confirm !== ''

  const handleDiscard = () => {
    setForm({ current: '', newPass: '', confirm: '' })
    setErrors({})
    setSaved(false)
  }

  const handleSave = async () => {
    // Final inline validation before calling the API
    const errs = {}
    if (!form.current) errs.current = 'Current password is required.'
    if (!form.newPass) {
      errs.newPass = 'New password is required.'
    } else if (strength < 2) {
      errs.newPass = 'Password is too weak. Use at least 12 characters with numbers/symbols.'
    } else if (form.newPass === form.current) {
      errs.newPass = 'New password must be different from your current password.'
    }
    if (!form.confirm) {
      errs.confirm = 'Please confirm your new password.'
    } else if (form.confirm !== form.newPass) {
      errs.confirm = 'Passwords do not match.'
    }
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSaving(true)
    setErrors({})
    try {
      await changePassword({
        currentPassword: form.current,
        newPassword: form.newPass,
        confirmPassword: form.confirm,
      })
      setSaved(true)
      setForm({ current: '', newPass: '', confirm: '' })
      showToast('Password changed successfully!', 'success')
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      const data = err?.response?.data
      const errorCode = data?.error?.error_code || data?.error_code
      const errorMessage = data?.error?.message || data?.detail

      if (errorCode === 'invalid_current_password') {
        setErrors({ current: 'Current password is incorrect.' })
        return
      }
      if (errorCode === 'same_password') {
        setErrors({ newPass: 'New password must be different from your current password.' })
        return
      }
      if (typeof errorMessage === 'string') {
        setErrors({ form: errorMessage })
      } else if (Array.isArray(errorMessage)) {
        const fieldMap = { current_password: 'current', new_password: 'newPass', confirm_password: 'confirm' }
        const mapped = {}
        errorMessage.forEach((d) => {
          const loc = d.loc?.[d.loc.length - 1]
          if (loc && fieldMap[loc]) mapped[fieldMap[loc]] = d.msg
          else mapped.form = d.msg
        })
        setErrors(mapped)
      } else {
        setErrors({ form: 'Something went wrong. Please try again.' })
      }
    } finally {
      setSaving(false)
    }
  }

  const sessions = [
    { device: 'MacBook Pro 16"', location: 'New York, US',  browser: 'Chrome 126', active: true,  time: 'Active now' },
    { device: 'iPhone 15 Pro',   location: 'New York, US',  browser: 'Safari iOS', active: false, time: '2 hours ago' },
    { device: 'Windows PC',      location: 'Chicago, US',   browser: 'Edge 125',   active: false, time: 'Yesterday' },
  ]

  return (
    <div className="space-y-4">
      {/* Change password */}
      <SectionCard>
        <SectionTitle title="Change password" description="Use a strong password of at least 12 characters." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <PasswordInput
              autoComplete="current-password"
              error={errors.current}
              id="sec-current"
              label="Current password"
              onChange={set('current')}
              placeholder="••••••••"
              value={form.current}
            />
          </div>
          <PasswordInput
            autoComplete="new-password"
            error={errors.newPass}
            id="sec-new"
            label="New password"
            onChange={set('newPass')}
            placeholder="At least 12 characters"
            value={form.newPass}
          />
          <PasswordInput
            autoComplete="new-password"
            error={errors.confirm}
            id="sec-confirm"
            label="Confirm new password"
            onChange={set('confirm')}
            placeholder="Repeat new password"
            value={form.confirm}
          />
        </div>

        {/* Password strength */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-muted">
            Password strength:{' '}
            <span className={strength >= 2 ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>
              {STRENGTH_LEVELS[strength]}
            </span>
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <div
                className={[
                  'h-1.5 flex-1 rounded-full transition-colors',
                  n <= strength
                    ? n <= 2 ? 'bg-amber-400' : 'bg-emerald-500'
                    : 'bg-surface-muted',
                ].join(' ')}
                key={n}
              />
            ))}
          </div>
          {form.newPass && strength < 2 && (
            <p className="mt-1.5 text-xs text-amber-600">
              Password is too weak. Use at least 12 characters with numbers/symbols.
            </p>
          )}
        </div>

        {errors.form && (
          <p className="rounded-control bg-red-50 px-3 py-2 text-xs text-danger" role="alert">
            {errors.form}
          </p>
        )}

        <SaveBar
          disabled={!canSave}
          hasUnsaved={hasUnsaved}
          onDiscard={handleDiscard}
          onSave={handleSave}
          saved={saved}
        />
      </SectionCard>

      {/* 2FA */}
      <SectionCard>
        <SectionTitle title="Two-factor authentication" description="Add an extra layer of security to your account." />
        <div className="flex items-start gap-4 rounded-card bg-surface-muted p-4">
          <Icon className="mt-0.5 size-5 shrink-0 text-brand-600" d={ICONS.shield} />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink-primary">Authenticator app</p>
            <p className="mt-0.5 text-xs text-ink-muted">Use an app like Google Authenticator or Authy to generate one-time codes.</p>
          </div>
          <Toggle checked={twoFA} id="twofa" onChange={setTwoFA} />
        </div>
        {twoFA && (
          <div className="flex items-center gap-3 rounded-card border border-emerald-200 bg-emerald-50 px-4 py-3">
            <Icon className="size-4 text-emerald-600" d={ICONS.check} />
            <p className="text-sm font-medium text-emerald-800">Two-factor authentication is enabled.</p>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-secondary">Recovery codes</p>
          <p className="text-xs text-ink-muted mb-3">Keep these codes safe. You can use them to access your account if you lose your authenticator device.</p>
          <div className="grid grid-cols-2 gap-2 rounded-card bg-surface-muted p-3 font-mono text-xs text-ink-secondary sm:grid-cols-3">
            {['7a3k-9xmq', 'b2lp-4nhr', 'c8wd-6svt', 'e5fj-3qyz', 'g1rb-7mkp', 'h9ux-2cnw'].map((code) => (
              <span className="text-center" key={code}>{code}</span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button className="btn btn-secondary btn-sm gap-1.5" type="button"><Icon className="size-3.5" d={ICONS.copy} /> Copy codes</button>
            <button className="btn btn-secondary btn-sm gap-1.5" type="button"><Icon className="size-3.5" d={ICONS.refresh} /> Regenerate</button>
          </div>
        </div>
      </SectionCard>

      {/* Session timeout */}
      <SectionCard>
        <SectionTitle title="Session timeout" description="Automatically sign out after a period of inactivity." />
        <SettingSelect
          label="Auto sign-out after"
          onChange={setSessionTimeout}
          options={[
            { value: '1h',   label: '1 hour' },
            { value: '4h',   label: '4 hours' },
            { value: '8h',   label: '8 hours' },
            { value: '24h',  label: '24 hours' },
            { value: 'never', label: 'Never' },
          ]}
          value={sessionTimeout}
        />
      </SectionCard>

      {/* Active sessions */}
      <SectionCard>
        <SectionTitle title="Active sessions" description="All devices currently signed in to your account." />
        <div className="space-y-3">
          {sessions.map((s) => (
            <div className="flex items-start justify-between gap-4 rounded-card border border-line-default p-3" key={s.device}>
              <div className="flex items-center gap-3">
                <span className={['size-2 mt-1.5 rounded-full shrink-0', s.active ? 'bg-emerald-500' : 'bg-line-strong'].join(' ')} />
                <div>
                  <p className="text-sm font-medium text-ink-primary">{s.device}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{s.browser} · {s.location} · {s.time}</p>
                </div>
              </div>
              {!s.active && (
                <button className="btn btn-ghost btn-sm text-danger hover:bg-red-50 hover:text-danger" type="button">Revoke</button>
              )}
              {s.active && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">Current</span>
              )}
            </div>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm text-danger hover:bg-red-50" type="button">
          <Icon className="size-3.5" d={ICONS.key} /> Revoke all other sessions
        </button>
      </SectionCard>
    </div>
  )
}

// ─── Section: Appearance ──────────────────────────────────────────────────────
function AppearanceSection() {
  const {
    theme,
    accent,
    density,
    sidebarCollapsed,
    animations,
    hasUnsaved,
    change,
    saveAll,
    discard,
  } = useAppearance()
  const { showToast } = useToast()
  const [justSaved, setJustSaved] = useState(false)

  const handleSave = () => {
    saveAll()
    setJustSaved(true)
    showToast('Appearance settings saved!', 'success')
    setTimeout(() => setJustSaved(false), 2500)
  }

  const handleDiscard = () => {
    discard()
    showToast('Appearance changes discarded', 'info')
  }

  const themes = [
    { id: 'light', label: 'Light', icon: 'sun' },
    { id: 'dark',  label: 'Dark',  icon: 'moon' },
    { id: 'auto',  label: 'Auto',  icon: 'general' },
  ]

  const densities = [
    { id: 'compact',     label: 'Compact' },
    { id: 'comfortable', label: 'Comfortable' },
    { id: 'spacious',    label: 'Spacious' },
  ]

  const accents = [
    { id: 'blue',   color: '#3b6eea', label: 'Blue'   },
    { id: 'purple', color: '#7c3aed', label: 'Purple' },
    { id: 'green',  color: '#16a34a', label: 'Green'  },
    { id: 'red',    color: '#e11d48', label: 'Red'    },
    { id: 'orange', color: '#ea580c', label: 'Orange' },
    { id: 'gray',   color: '#64748b', label: 'Gray'   },
  ]

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionTitle title="Theme" description="Choose how the platform looks for you." />
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              className={[
                'flex flex-col items-center gap-2 rounded-card border-2 p-4 transition-colors',
                theme === t.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-line-default bg-surface-default text-ink-secondary hover:border-line-strong',
              ].join(' ')}
              key={t.id}
              onClick={() => change('theme')(t.id)}
              type="button"
            >
              <Icon className="size-5" d={ICONS[t.icon]} />
              <span className="text-xs font-medium">
                {t.label}
              </span>
              {theme === t.id && (
                <span className="size-1.5 rounded-full bg-brand-500" />
              )}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle title="Accent color" description="Used for highlights, buttons, and links." />
        <div className="flex flex-wrap gap-3">
          {accents.map((a) => (
            <button
              aria-label={a.label}
              className={[
                'group relative size-8 rounded-full ring-2 ring-offset-2 transition-all',
                accent === a.id ? 'ring-ink-primary scale-110' : 'ring-transparent hover:ring-ink-muted',
              ].join(' ')}
              key={a.id}
              onClick={() => change('accent')(a.id)}
              style={{ backgroundColor: a.color }}
              title={a.label}
              type="button"
            >
              {accent === a.id && (
                <span className="absolute inset-0 flex items-center justify-center text-white">
                  <Icon className="size-4" d={ICONS.check} />
                </span>
              )}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle title="Layout density" description="Controls spacing and information density across the app." />
        <div className="grid grid-cols-3 gap-3">
          {densities.map((d) => (
            <button
              className={[
                'rounded-card border-2 py-3 text-sm font-medium transition-colors',
                density === d.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-line-default text-ink-secondary hover:border-line-strong',
              ].join(' ')}
              key={d.id}
              onClick={() => change('density')(d.id)}
              type="button"
            >
              {d.label}
            </button>
          ))}
        </div>

        <Divider />

        <ToggleRow
          checked={sidebarCollapsed}
          description="Collapse the sidebar to icon-only mode by default."
          id="sidebar-collapsed"
          label="Collapsed sidebar by default"
          onChange={change('sidebarCollapsed')}
        />

        <Divider />

        <ToggleRow
          checked={animations}
          description="Disable to improve performance on lower-end devices."
          id="animations"
          label="Enable animations"
          onChange={change('animations')}
        />
      </SectionCard>

      <SaveBar
        disabled={!hasUnsaved}
        hasUnsaved={hasUnsaved}
        onDiscard={handleDiscard}
        onSave={handleSave}
        saved={justSaved}
      />
    </div>
  )
}

// ─── Section: AI Preferences ──────────────────────────────────────────────────
function AISection() {
  const [saved, setSaved] = useState(false)
  const [prefs, setPrefs] = useState({
    autoSummarize:    true,
    leadScoring:      true,
    sentimentAnalysis: true,
    smartSuggestions: true,
    autoFollowUp:     false,
    modelQuality:     'balanced',
    language:         'en',
    tone:             'professional',
    summaryLength:    'medium',
  })
  const set = (key) => (val) => { setSaved(false); setPrefs((p) => ({ ...p, [key]: val })) }
  const toggle = (key) => { setSaved(false); setPrefs((p) => ({ ...p, [key]: !p[key] })) }

  const usagePercent = 68

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionTitle title="AI features" description="Control which AI capabilities are active for your account." />
        <div className="space-y-4">
          {[
            { key: 'autoSummarize',    label: 'Auto-summarize conversations',  desc: 'Generate AI summaries after each recorded call or meeting.' },
            { key: 'leadScoring',      label: 'AI lead scoring',               desc: 'Automatically score leads based on behaviour and fit signals.' },
            { key: 'sentimentAnalysis',label: 'Sentiment analysis',            desc: 'Detect sentiment in emails and call transcripts.' },
            { key: 'smartSuggestions', label: 'Smart reply suggestions',       desc: 'Get AI-powered email reply suggestions in your outreach editor.' },
            { key: 'autoFollowUp',     label: 'Auto follow-up scheduling',     desc: 'Let AI suggest and schedule follow-up tasks automatically.' },
          ].map((row, i, arr) => (
            <div key={row.key}>
              <ToggleRow checked={prefs[row.key]} description={row.desc} id={`ai-${row.key}`} label={row.label} onChange={() => toggle(row.key)} />
              {i < arr.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle title="AI model & output" description="Tune how the AI generates content for you." />
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingSelect
            hint="Faster is quicker but less accurate; Precise is slower but higher quality."
            label="Model quality"
            onChange={set('modelQuality')}
            options={[
              { value: 'fast',     label: 'Fast' },
              { value: 'balanced', label: 'Balanced (recommended)' },
              { value: 'precise',  label: 'Precise' },
            ]}
            value={prefs.modelQuality}
          />
          <SettingSelect
            label="AI output language"
            onChange={set('language')}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
            ]}
            value={prefs.language}
          />
          <SettingSelect
            hint="Affects email drafts, summaries, and suggestions."
            label="Communication tone"
            onChange={set('tone')}
            options={[
              { value: 'professional', label: 'Professional' },
              { value: 'friendly',     label: 'Friendly' },
              { value: 'concise',      label: 'Concise' },
              { value: 'formal',       label: 'Formal' },
            ]}
            value={prefs.tone}
          />
          <SettingSelect
            label="Summary length"
            onChange={set('summaryLength')}
            options={[
              { value: 'short',  label: 'Short (1–2 sentences)' },
              { value: 'medium', label: 'Medium (1 paragraph)' },
              { value: 'long',   label: 'Long (full detail)' },
            ]}
            value={prefs.summaryLength}
          />
        </div>
        <SaveBar onSave={() => setSaved(true)} saved={saved} />
      </SectionCard>

      {/* AI usage */}
      <SectionCard>
        <SectionTitle title="AI usage" description="Your current AI request consumption for this billing cycle." />
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-ink-secondary">Requests used</span>
            <span className="font-semibold text-ink-primary">26,460 / 38,910</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-xs text-ink-muted">{usagePercent}% used · Resets on Aug 1, 2026</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Summaries',   val: '1,248' },
            { label: 'Emails',      val: '8,930' },
            { label: 'Lead scores', val: '16,282' },
          ].map((item) => (
            <div className="rounded-card bg-surface-muted p-3 text-center" key={item.label}>
              <p className="text-base font-semibold text-ink-primary">{item.val}</p>
              <p className="text-xs text-ink-muted">{item.label}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Section: Account ─────────────────────────────────────────────────────────
function AccountSection() {
  const { user } = useAuth()
  const { isPersonal, activeWorkspace } = useWorkspace()

  return (
    <div className="space-y-4">
      {/* User Profile Card */}
      <SectionCard>
        <SectionTitle title="Account profile" description="Your SalesGenie user profile and global credentials." />
        <div className="flex items-center gap-4 rounded-card border border-line-default p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
            {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink-primary">{user?.name || 'SalesGenie User'}</p>
            <p className="text-sm text-ink-muted">{user?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                User Role: {user?.role || 'sales_rep'}
              </span>
              <span className="text-xs text-ink-muted">
                Current Context: {isPersonal ? 'Personal Area (Solo)' : activeWorkspace?.name}
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard>
        <SectionTitle title="Danger zone" />
        <div className="space-y-3">
          <DangerRow
            buttonLabel="Export"
            description="Download an archive of your data in CSV format."
            label="Export personal CRM data"
          />
          <DangerRow
            buttonLabel="Delete account"
            description="Permanently delete your account and all associated data. This cannot be undone."
            label="Delete account"
          />
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Section: Email Integration ───────────────────────────────────────────────
function EmailSection() {
  const { showToast } = useToast()

  // ── SMTP Config state ──────────────────────────────────────────────────────
  const [configLoading, setConfigLoading]   = useState(true)
  const [configSaving,  setConfigSaving]    = useState(false)
  const [testLoading,   setTestLoading]     = useState(false)
  const [isConfigured,  setIsConfigured]    = useState(false)
  const [testResult,    setTestResult]      = useState(null)   // { success, message }

  const [smtpHost,      setSmtpHost]        = useState('smtp.gmail.com')
  const [smtpPort,      setSmtpPort]        = useState('587')
  const [smtpUsername,  setSmtpUsername]    = useState('')
  const [smtpPassword,  setSmtpPassword]    = useState('')     // never pre-filled from API
  const [smtpFromEmail, setSmtpFromEmail]   = useState('')
  const [smtpFromName,  setSmtpFromName]    = useState('SalesGenie')
  const [testAddress,   setTestAddress]     = useState('')
  const [showPassword,  setShowPassword]    = useState(false)

  // ── Tracking / Signature (UI-only for now) ─────────────────────────────────
  const [saved,       setSaved]     = useState(false)
  const [tracking, setTracking]     = useState({ opens: true, clicks: true, unsubscribes: true })
  const [signature, setSignature]   = useState('')
  const [delay, setDelay]           = useState('5')

  // ── Load config on mount ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { getEmailConfig } = await import('@/services/api/email')
        const { data } = await getEmailConfig()
        if (cancelled) return
        setSmtpHost(data.smtp_host || 'smtp.gmail.com')
        setSmtpPort(String(data.smtp_port || 587))
        setSmtpUsername(data.smtp_username || '')
        setSmtpFromEmail(data.smtp_from_email || data.smtp_username || '')
        setSmtpFromName(data.smtp_from_name || 'SalesGenie')
        setIsConfigured(data.is_configured || false)
        setTestAddress(data.smtp_username || '')
      } catch (err) {
        console.error('Failed to load email config:', err)
      } finally {
        if (!cancelled) setConfigLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Save config ────────────────────────────────────────────────────────────
  async function handleSaveConfig() {
    setConfigSaving(true)
    setTestResult(null)
    try {
      const { saveEmailConfig } = await import('@/services/api/email')
      const payload = {
        smtp_host:      smtpHost,
        smtp_port:      parseInt(smtpPort, 10),
        smtp_use_tls:   true,
        smtp_username:  smtpUsername || null,
        smtp_from_email: smtpFromEmail || smtpUsername || null,
        smtp_from_name:  smtpFromName,
      }
      // Only send password if user actually typed something
      if (smtpPassword.trim()) payload.smtp_password = smtpPassword
      const { data } = await saveEmailConfig(payload)
      setIsConfigured(data.is_configured)
      setSmtpPassword('')   // clear after save — never persist in state
      showToast('Gmail SMTP configuration saved successfully.', 'success')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to save configuration.'
      showToast(msg, 'error')
    } finally {
      setConfigSaving(false)
    }
  }

  // ── Send test email ────────────────────────────────────────────────────────
  async function handleTestEmail() {
    setTestLoading(true)
    setTestResult(null)
    try {
      const { sendTestEmail } = await import('@/services/api/email')
      const payload = testAddress.trim() ? { to_address: testAddress.trim() } : {}
      const { data } = await sendTestEmail(payload)
      setTestResult(data)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Test email request failed.'
      setTestResult({ success: false, message: msg })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Gmail SMTP Configuration ── */}
      <SectionCard>
        <SectionTitle
          title="Gmail SMTP Configuration"
          description="Connect your Gmail account to send real outreach emails. Use a Gmail App Password (not your regular password)."
        />

        {configLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div className="h-10 rounded-control bg-surface-muted" key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Connection status */}
            <div className="flex items-center gap-3 rounded-card border border-line-default bg-surface-subtle p-3">
              <span className="text-2xl">✉️</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-primary">Gmail via SMTP</p>
                <p className="text-xs text-ink-muted">
                  {isConfigured ? smtpUsername : 'Not configured — enter your Gmail address and App Password below.'}
                </p>
              </div>
              <span
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
                  isConfigured
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                    : 'bg-amber-50 text-amber-700 ring-amber-100',
                ].join(' ')}
              >
                <span className={['size-1.5 rounded-full', isConfigured ? 'bg-emerald-500' : 'bg-amber-400'].join(' ')} />
                {isConfigured ? 'Configured' : 'Not configured'}
              </span>
            </div>

            {/* SMTP fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingInput
                label="SMTP Host"
                hint="Gmail: smtp.gmail.com"
                value={smtpHost}
                onChange={setSmtpHost}
                placeholder="smtp.gmail.com"
              />
              <SettingInput
                label="SMTP Port"
                hint="587 for STARTTLS (recommended)"
                value={smtpPort}
                onChange={setSmtpPort}
                type="number"
                placeholder="587"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SettingInput
                label="Gmail Address (Username)"
                hint="Your full Gmail address"
                value={smtpUsername}
                onChange={setSmtpUsername}
                type="email"
                placeholder="you@gmail.com"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink-secondary">
                  Gmail App Password
                </label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPassword ? 'text' : 'password'}
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder={isConfigured ? '••••••••••••••••  (leave blank to keep existing)' : 'Paste App Password here'}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-ink-muted">
                  Not your Gmail password.{' '}
                  <a
                    className="text-brand-600 underline hover:text-brand-700"
                    href="https://myaccount.google.com/apppasswords"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Generate an App Password ↗
                  </a>
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SettingInput
                label="From Email Address"
                hint="Displayed in recipient's 'From' field"
                value={smtpFromEmail}
                onChange={setSmtpFromEmail}
                type="email"
                placeholder="you@gmail.com"
              />
              <SettingInput
                label="From Name"
                hint="Sender display name"
                value={smtpFromName}
                onChange={setSmtpFromName}
                placeholder="SalesGenie"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                className="btn btn-primary gap-2 disabled:opacity-60"
                disabled={configSaving}
                onClick={handleSaveConfig}
                type="button"
              >
                <Icon className="size-4" d={ICONS.save} />
                {configSaving ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Send Test Email ── */}
      <SectionCard>
        <SectionTitle
          title="Send Test Email"
          description="Verify your Gmail SMTP configuration by sending a test message."
        />
        <div className="space-y-4">
          <SettingInput
            label="Send test to"
            hint="Defaults to your Gmail address if left blank"
            value={testAddress}
            onChange={setTestAddress}
            type="email"
            placeholder="you@gmail.com"
          />

          {testResult && (
            <div
              className={[
                'flex items-start gap-3 rounded-card border p-3.5 text-sm',
                testResult.success
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800',
              ].join(' ')}
            >
              <span className="mt-0.5 shrink-0 text-base">{testResult.success ? '✅' : '❌'}</span>
              <span>{testResult.message}</span>
            </div>
          )}

          <button
            className="btn btn-secondary gap-2 disabled:opacity-60"
            disabled={testLoading || !isConfigured}
            onClick={handleTestEmail}
            title={!isConfigured ? 'Save your SMTP configuration first' : undefined}
            type="button"
          >
            {testLoading ? (
              <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
              </svg>
            ) : (
              <Icon className="size-4" d={ICONS.email} />
            )}
            {testLoading ? 'Sending…' : 'Send Test Email'}
          </button>

          {!isConfigured && (
            <p className="text-xs text-ink-muted">
              ⚠️ Configure and save your Gmail SMTP settings above before sending a test email.
            </p>
          )}
        </div>
      </SectionCard>

      {/* ── Sending settings (signature / delay) ── */}
      <SectionCard>
        <SectionTitle title="Sending settings" description="Configure how outreach emails are sent." />
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingSelect
            hint="Delay between emails in a sequence to avoid spam filters."
            label="Send delay between emails"
            onChange={setDelay}
            options={[
              { value: '0',  label: 'No delay' },
              { value: '2',  label: '2 minutes' },
              { value: '5',  label: '5 minutes' },
              { value: '10', label: '10 minutes' },
              { value: '30', label: '30 minutes' },
            ]}
            value={delay}
          />
        </div>
        <SettingTextarea
          hint="Appended automatically to all outgoing emails."
          label="Email signature"
          onChange={setSignature}
          placeholder="Your signature…"
          rows={5}
          value={signature}
        />
        <SaveBar onSave={() => setSaved(true)} saved={saved} />
      </SectionCard>

      {/* ── Tracking ── */}
      <SectionCard>
        <SectionTitle title="Email tracking" description="Monitor recipient engagement with your emails." />
        <div className="space-y-4">
          {[
            { key: 'opens',        label: 'Track email opens',         desc: 'Know when a recipient opens your email.' },
            { key: 'clicks',       label: 'Track link clicks',         desc: 'See which links get clicked in your emails.' },
            { key: 'unsubscribes', label: 'Respect unsubscribe links', desc: 'Automatically suppress contacts who unsubscribe.' },
          ].map((row, i, arr) => (
            <div key={row.key}>
              <ToggleRow
                checked={tracking[row.key]}
                description={row.desc}
                id={`email-${row.key}`}
                label={row.label}
                onChange={() => { setTracking((t) => ({ ...t, [row.key]: !t[row.key] })); setSaved(false) }}
              />
              {i < arr.length - 1 && <Divider />}
            </div>
          ))}
        </div>

      </SectionCard>
    </div>
  )
}

// ─── Placeholder for sections not yet fully detailed ─────────────────────────
// (all 8 sections are implemented above)

// ─── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({ active, label, icon, onClick }) {
  return (
    <button
      className={[
        'flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm font-medium transition-colors',
        active
          ? 'bg-brand-50 text-brand-700'
          : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary',
      ].join(' ')}
      onClick={onClick}
      type="button"
    >
      <Icon
        className={['size-4 shrink-0', active ? 'text-brand-600' : 'text-ink-muted'].join(' ')}
        d={ICONS[icon]}
      />
      {label}
      {active && (
        <Icon className="ml-auto size-3.5 text-brand-400" d={ICONS.chevron} />
      )}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const SECTION_CONTENT = {
  general:       <GeneralSection />,
  workspace:     <WorkspaceSection />,
  notifications: <NotificationsSection />,
  security:      <SecuritySection />,
  appearance:    <AppearanceSection />,
  ai:            <AISection />,
  account:       <AccountSection />,
  email:         <EmailSection />,
}

function SettingsPage() {
  const navigate = useNavigate()
  const { section } = useParams()
  const { isManager, isPersonal } = useWorkspace()

  const showWorkspaceManagement = isManager && !isPersonal

  const visibleSections = NAV_SECTIONS.filter((s) => {
    if (s.id === 'workspace') return showWorkspaceManagement
    return true
  })

  const validSection = visibleSections.some((s) => s.id === section) ? section : 'general'
  const [active, setActive] = useState(validSection)
  const current = visibleSections.find((s) => s.id === active) || visibleSections[0]

  // Sync active section with the URL param (e.g. /settings/security)
  useEffect(() => {
    setActive(validSection)
  }, [validSection])

  const handleNav = (id) => {
    setActive(id)
    navigate(`/settings/${id}`)
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-primary">Settings</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {isPersonal
            ? 'Manage your personal account, security, and preferences.'
            : isManager
            ? 'Manage your account, team members, and workspace configuration.'
            : 'Manage your personal preferences and account settings.'}
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar nav */}
        <nav
          aria-label="Settings sections"
          className="shrink-0 lg:w-52 xl:w-56"
        >
          <div className="card p-2 lg:sticky lg:top-6">
            {visibleSections.map((sectionItem) => (
              <NavItem
                active={active === sectionItem.id}
                icon={sectionItem.icon}
                key={sectionItem.id}
                label={sectionItem.label}
                onClick={() => handleNav(sectionItem.id)}
              />
            ))}
          </div>
        </nav>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {/* Section breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-xs text-ink-muted">
            <span>Settings</span>
            <Icon className="size-3" d={ICONS.chevron} />
            <span className="font-medium text-ink-secondary">{current?.label}</span>
          </div>

          {SECTION_CONTENT[active]}
        </main>
      </div>
    </div>
  )
}

export default SettingsPage
