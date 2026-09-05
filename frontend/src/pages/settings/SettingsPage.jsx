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
  resendWorkspaceInvitation,
} from '@/services/api/workspaces'
import { searchUsersByEmail } from '@/services/api/users'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/api/notifications'

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
  const { activeWorkspace, isPersonal, isManager } = useWorkspace()
  const { showToast } = useToast()
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  // Recipient search state (manager only)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [inviteRole, setInviteRole] = useState('team_member')
  const [isInviting, setIsInviting] = useState(false)
  const [resendingId, setResendingId] = useState(null)
  const [copiedToken, setCopiedToken] = useState(null)

  const loadTeamData = useCallback(async () => {
    if (!activeWorkspace?.id || isPersonal) return
    setLoadingMembers(true)
    try {
      const [membersData, invitesData] = await Promise.all([
        listWorkspaceMembers(activeWorkspace.id).catch(() => []),
        isManager ? listWorkspaceInvitations(activeWorkspace.id).catch(() => []) : Promise.resolve([]),
      ])
      setMembers(membersData || [])
      setInvitations(invitesData || [])
    } catch (err) {
      console.error('Failed to load workspace members:', err)
    } finally {
      setLoadingMembers(false)
    }
  }, [activeWorkspace?.id, isPersonal, isManager])

  useEffect(() => {
    loadTeamData()
  }, [loadTeamData])

  // Debounced search for registered users (manager only)
  useEffect(() => {
    if (!isManager || !searchQuery.trim()) {
      setSearchResults([])
      setHasSearched(false)
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const users = await searchUsersByEmail(searchQuery.trim())
        setSearchResults(users || [])
        setHasSearched(true)
      } catch (err) {
        setSearchResults([])
        setHasSearched(true)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery, isManager])

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
  }

  const handleClearSelectedUser = () => {
    setSelectedUser(null)
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!selectedUser?.email) {
      showToast('Please search and select a registered user to invite.', 'warning')
      return
    }
    setIsInviting(true)
    try {
      const inv = await inviteUserByEmail(activeWorkspace.id, {
        email: selectedUser.email,
        role: inviteRole,
      })
      showToast(`Invitation sent to ${selectedUser.name || selectedUser.email}!`, 'success')
      setSelectedUser(null)
      setSearchQuery('')
      setSearchResults([])
      loadTeamData()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to send invitation.'
      showToast(msg, 'error')
    } finally {
      setIsInviting(false)
    }
  }

  const handleResendInvite = async (invId, invEmail) => {
    setResendingId(invId)
    try {
      await resendWorkspaceInvitation(activeWorkspace.id, invId)
      showToast(`Invitation resent to ${invEmail}!`, 'success')
      loadTeamData()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to resend invitation.'
      showToast(msg, 'error')
    } finally {
      setResendingId(null)
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

  // ── Team Member read-only view ─────────────────────────────────────────────
  if (!isManager) {
    const manager = members.find((m) => m.role === 'manager')
    const teamMembers = members.filter((m) => m.role !== 'manager')
    return (
      <div className="space-y-6">
        {/* Workspace Details */}
        <SectionCard>
          <SectionTitle title="Workspace details" description="Your current active workspace." />
          <div className="rounded-card border border-line-default bg-surface-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-ink-primary">{activeWorkspace?.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{activeWorkspace?.description || 'No description provided.'}</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                Team Workspace
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Manager Card */}
        {manager && (
          <SectionCard>
            <SectionTitle title="Workspace Manager" description="The person who manages this workspace." />
            <div className="flex items-center gap-4 rounded-card border border-amber-200 bg-amber-50/60 p-4">
              <span className="inline-grid size-12 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                {(manager.user_name || manager.user_email || 'M').slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink-primary">{manager.user_name || manager.user_email}</p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">Workspace Manager</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">{manager.user_email}</p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Team Members Directory */}
        <SectionCard>
          <SectionTitle
            title={`Team Members (${members.length})`}
            description="All members in this workspace and their roles."
          />
          {loadingMembers ? (
            <div className="py-4 text-center text-xs text-ink-muted">Loading members…</div>
          ) : members.length === 0 ? (
            <div className="py-4 text-center text-xs text-ink-muted">No members found.</div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const isOwner = m.role === 'manager'
                return (
                  <div
                    className="flex items-center justify-between gap-3 rounded-card border border-line-default p-3 bg-surface-default"
                    key={m.id || m.user_id}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`inline-grid size-8 place-items-center rounded-full text-xs font-bold ${isOwner ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {(m.user_name || m.user_email || 'U').slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink-primary">{m.user_name || m.user_email}</p>
                        <p className="text-xs text-ink-muted">{m.user_email}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${isOwner ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {isOwner ? 'Manager' : 'Team Member'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* Quick link to Team Hub */}
        <div className="rounded-card border border-brand-200 bg-brand-50/50 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">Explore the full Team Hub</p>
            <p className="mt-0.5 text-xs text-ink-muted">View today's tasks, important lead dates, and more in one place.</p>
          </div>
          <a href="/workspace/team" className="btn btn-primary btn-sm shrink-0">
            Open Team Hub →
          </a>
        </div>
      </div>
    )
  }

  // ── Manager full management view ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Workspace details card */}
      <SectionCard>
        <SectionTitle title="Workspace details" description="Current active workspace information." />
        <div className="rounded-card border border-line-default bg-surface-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-ink-primary">{activeWorkspace?.name}</p>
              <p className="text-xs text-ink-muted">{activeWorkspace?.description || 'No description provided.'}</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
              Workspace ID: {activeWorkspace?.id?.slice(0, 8)}…
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Add team member card */}
      <SectionCard>
        <SectionTitle
          title="Add team member"
          description="Search existing registered users by email to invite them to this workspace."
        />

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative flex-1">
              <label className="mb-1 block text-xs font-medium text-ink-secondary">
                Recipient (Search registered user)
              </label>

              {selectedUser ? (
                /* Selected User Recipient Chip */
                <div className="flex items-center justify-between rounded-control border border-brand-500 bg-brand-50/40 px-3 py-2 text-sm shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {(selectedUser.name || selectedUser.email).slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-ink-primary">{selectedUser.name}</p>
                      <p className="text-[11px] text-ink-muted">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    className="rounded-full p-1 text-ink-muted transition-colors hover:bg-brand-100 hover:text-ink-primary"
                    onClick={handleClearSelectedUser}
                    title="Remove selected recipient"
                    type="button"
                  >
                    <Icon className="size-4" d="M6 18L18 6M6 6l12 12" />
                  </button>
                </div>
              ) : (
                /* Recipient Search Input */
                <div className="relative">
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Search by email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="off"
                  />

                  {isSearching && (
                    <span className="absolute right-3 top-2.5 text-xs text-ink-muted">
                      Searching…
                    </span>
                  )}

                  {/* Search Results Dropdown */}
                  {searchQuery.trim() && (
                    <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-card border border-line-default bg-surface-default shadow-floating animate-in fade-in zoom-in-95 duration-100">
                      {searchResults.length > 0 ? (
                        <div className="py-1">
                          {searchResults.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted"
                              onClick={() => handleSelectUser(u)}
                            >
                              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                {(u.name || u.email).slice(0, 2).toUpperCase()}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-ink-primary">
                                  {u.name}
                                </p>
                                <p className="truncate text-[11px] text-ink-muted">
                                  {u.email}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        hasSearched && !isSearching && (
                          <div className="p-3 text-center text-xs text-ink-muted">
                            No SalesGenie account exists with this email.
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="w-full sm:w-44">
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

            <div className="sm:pt-6">
              <Button
                type="submit"
                disabled={isInviting || !selectedUser}
                className="w-full sm:w-auto"
              >
                {isInviting ? 'Sending…' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </form>
      </SectionCard>

      {/* Team members list */}
      <SectionCard>
        <SectionTitle
          title={`Workspace members (${members.length})`}
          description="Active members belonging to this workspace."
        />
        {loadingMembers ? (
          <div className="py-4 text-center text-xs text-ink-muted">Loading members…</div>
        ) : members.length === 0 ? (
          <div className="py-4 text-center text-xs text-ink-muted">No members found.</div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const isOwner = m.role === 'manager'
              return (
                <div
                  className="flex items-center justify-between gap-3 rounded-card border border-line-default p-3 bg-surface-default"
                  key={m.id}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-grid size-8 place-items-center rounded-full text-xs font-bold ${
                        isOwner ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {(m.user_name || m.user_email || 'U').slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink-primary">{m.user_name || m.user_email}</p>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          Status: Active
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted">{m.user_email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      className="rounded border border-line-default bg-surface-default px-2 py-1 text-xs font-medium text-ink-primary"
                      value={m.role}
                      onChange={(e) => handleChangeRole(m.user_id, e.target.value)}
                    >
                      <option value="manager">Manager</option>
                      <option value="team_member">Team Member</option>
                    </select>

                    <button
                      className="rounded p-1 text-ink-muted hover:bg-rose-50 hover:text-rose-600 transition-colors"
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

      {/* Workspace Invitations List */}
      {invitations.length > 0 && (
        <SectionCard>
          <SectionTitle
            title={`Workspace invitations (${invitations.length})`}
            description="Status of invitations sent for this workspace."
          />
          <div className="space-y-2">
            {invitations.map((inv) => {
              const statusLower = (inv.status || '').toLowerCase()
              const isPending = statusLower === 'pending'
              const isDeclined = statusLower === 'declined' || statusLower === 'rejected'
              const isExpired = statusLower === 'expired'
              const isAccepted = statusLower === 'accepted'

              let badgeClass = 'bg-amber-50 text-amber-800 border-amber-300'
              let statusLabel = 'Status: Invitation Pending'

              if (isAccepted) {
                badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300'
                statusLabel = 'Status: Active'
              } else if (isDeclined) {
                badgeClass = 'bg-rose-50 text-rose-800 border-rose-300'
                statusLabel = 'Status: Declined'
              } else if (isExpired) {
                badgeClass = 'bg-slate-100 text-slate-800 border-slate-300'
                statusLabel = 'Status: Expired'
              }

              return (
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-card border border-line-default bg-surface-default p-3 shadow-xs"
                  key={inv.id}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-grid size-8 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                      {(inv.email || 'I').slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink-primary">{inv.email}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${badgeClass}`}>
                          {statusLabel}
                        </span>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-200">
                          {inv.role === 'manager' ? 'Manager' : 'Team Member'}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted">
                        Invited by {inv.invited_by_name || inv.invited_by_email || 'Manager'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Pending actions: Copy Token & Cancel */}
                    {isPending && (
                      <>
                        <button
                          className="rounded border border-line-default bg-white px-2 py-1 text-xs font-medium text-ink-secondary hover:bg-surface-muted transition-colors"
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
                          className="rounded p-1 text-rose-600 hover:bg-rose-100 transition-colors"
                          onClick={() => handleCancelInvite(inv.id)}
                          title="Cancel invitation"
                          type="button"
                        >
                          <Icon className="size-4" d={ICONS.trash} />
                        </button>
                      </>
                    )}

                    {/* Resend button for declined or expired invitations */}
                    {(isDeclined || isExpired) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs py-1"
                        disabled={resendingId === inv.id}
                        onClick={() => handleResendInvite(inv.id, inv.email)}
                        type="button"
                      >
                        {resendingId === inv.id ? 'Resending…' : 'Resend Invitation'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ─── Section: Notifications ───────────────────────────────────────────────────
function NotificationsSection() {
  const { showToast } = useToast()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState({
    lead_assigned_inapp:       true,
    lead_assigned_email:       true,
    lead_status_changed_inapp: true,
    email_opened_inapp:        true,
    email_replied_inapp:       true,
    meeting_reminder_inapp:    true,
    weekly_digest_inapp:       true,
    ai_insights_inapp:         true,
    team_mentions_inapp:       true,
  })

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await getNotificationPreferences()
        if (mounted && data) {
          setPrefs({
            lead_assigned_inapp:       data.lead_assigned_inapp ?? true,
            lead_assigned_email:       data.lead_assigned_email ?? true,
            lead_status_changed_inapp: data.lead_status_changed_inapp ?? true,
            email_opened_inapp:        data.email_opened_inapp ?? true,
            email_replied_inapp:       data.email_replied_inapp ?? true,
            meeting_reminder_inapp:    data.meeting_reminder_inapp ?? true,
            weekly_digest_inapp:       data.weekly_digest_inapp ?? true,
            ai_insights_inapp:         data.ai_insights_inapp ?? true,
            team_mentions_inapp:       data.team_mentions_inapp ?? true,
          })
        }
      } catch (err) {
        console.error('Failed to load notification preferences:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const toggle = (key) => {
    setSaved(false)
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateNotificationPreferences(prefs)
      setSaved(true)
      showToast('Notification preferences saved successfully!', 'success')
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      showToast('Failed to save notification preferences.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const groups = [
    {
      title: 'Lead Assignments & Status',
      rows: [
        {
          key: 'lead_assigned_inapp',
          label: 'Lead assigned to me (In-app)',
          desc: 'Receive in-app notification when a manager assigns a lead to you.',
        },
        {
          key: 'lead_assigned_email',
          label: 'Lead assigned to me (Email)',
          desc: 'Receive an email notification with lead details when assigned a new lead.',
        },
        {
          key: 'lead_status_changed_inapp',
          label: 'Lead status changes (In-app)',
          desc: 'When a lead progresses through pipeline stages or status is updated.',
        },
      ],
    },
    {
      title: 'Email Activity & Engagement',
      rows: [
        {
          key: 'email_opened_inapp',
          label: 'Email opened (In-app)',
          desc: 'Receive an alert when a prospect opens an outreach email.',
        },
        {
          key: 'email_replied_inapp',
          label: 'Email replied (In-app)',
          desc: 'Receive an alert when a prospect replies to an outreach email.',
        },
      ],
    },
    {
      title: 'Meetings & Weekly Digest',
      rows: [
        {
          key: 'meeting_reminder_inapp',
          label: 'Meeting reminders (In-app)',
          desc: 'Get notified 15 minutes before a scheduled meeting.',
        },
        {
          key: 'weekly_digest_inapp',
          label: 'Weekly digest (In-app)',
          desc: 'Receive a pipeline performance summary every Monday morning.',
        },
      ],
    },
    {
      title: 'AI Insights & Collaboration',
      rows: [
        {
          key: 'ai_insights_inapp',
          label: 'AI insights & recommendations (In-app)',
          desc: 'When AI detects new high-priority opportunities or risks on your leads.',
        },
        {
          key: 'team_mentions_inapp',
          label: 'Team mentions (In-app)',
          desc: 'When a teammate @mentions you in a CRM note or activity.',
        },
      ],
    },
  ]

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-ink-muted">
        Loading notification preferences...
      </div>
    )
  }

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
      <SaveBar onSave={handleSave} saved={saved} saving={saving} />
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

  // ── Google OAuth State ─────────────────────────────────────────────────────
  const [oauthLoading, setOauthLoading] = useState(true)
  const [oauthConnecting, setOauthConnecting] = useState(false)
  const [oauthStatus, setOauthStatus] = useState({ is_connected: false, provider_email: null, last_synced_at: null })
  const [oauthSyncing, setOauthSyncing] = useState(false)
  const [oauthTesting, setOauthTesting] = useState(false)
  const [oauthTestResult, setOauthTestResult] = useState(null)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)

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
  const [showAdvancedSmtp, setShowAdvancedSmtp] = useState(false)

  // ── Tracking / Signature / Delay state ─────────────────────────────────────
  const [saved, setSaved] = useState(false)
  const [tracking, setTracking] = useState({ opens: true, clicks: true, unsubscribes: true })
  const [signature, setSignature] = useState('')
  const [delay, setDelay] = useState('5')

  // ── Load configs on mount ──────────────────────────────────────────────────
  const loadOAuthStatus = async () => {
    setOauthLoading(true)
    try {
      const { getGmailStatus } = await import('@/services/api/gmail')
      const data = await getGmailStatus()
      setOauthStatus(data || { is_connected: false })
    } catch (err) {
      console.error('Failed to load Gmail OAuth status:', err)
      setOauthStatus({ is_connected: false })
    } finally {
      setOauthLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      loadOAuthStatus()
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

  // ── Handle OAuth return query params ────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const statusParam = params.get('status')
    const messageParam = params.get('message')

    if (statusParam === 'connected') {
      showToast('Gmail account connected successfully!', 'success')
      loadOAuthStatus()
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (statusParam === 'error') {
      showToast(messageParam || 'Failed to connect Gmail account.', 'error')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // ── Google OAuth Connect ───────────────────────────────────────────────────
  async function handleConnectGmail() {
    setOauthConnecting(true)
    try {
      const { getGmailAuthUrl } = await import('@/services/api/gmail')
      // Let backend use its configured canonical GOOGLE_REDIRECT_URI
      const { auth_url } = await getGmailAuthUrl()
      if (auth_url) {
        window.location.href = auth_url
      } else {
        showToast('Could not initiate Google OAuth. Check server configuration.', 'error')
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || 'Failed to start Google OAuth.'
      showToast(msg, 'error')
    } finally {
      setOauthConnecting(false)
    }
  }

  // ── Google OAuth Disconnect ────────────────────────────────────────────────
  async function handleDisconnectGmail() {
    try {
      const { disconnectGmail } = await import('@/services/api/gmail')
      await disconnectGmail()
      showToast('Gmail account disconnected. Existing CRM history was preserved.', 'success')
      setShowDisconnectModal(false)
      await loadOAuthStatus()
    } catch (err) {
      showToast('Failed to disconnect Gmail.', 'error')
    }
  }

  // ── Google OAuth Test Connection ───────────────────────────────────────────
  async function handleTestOAuth() {
    setOauthTesting(true)
    setOauthTestResult(null)
    try {
      const { testGmailConnection } = await import('@/services/api/gmail')
      const res = await testGmailConnection()
      setOauthTestResult(res)
      if (res.success) {
        showToast(res.message, 'success')
      } else {
        showToast(res.message, 'error')
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Connection test failed.'
      setOauthTestResult({ success: false, message: msg })
      showToast(msg, 'error')
    } finally {
      setOauthTesting(false)
    }
  }

  // ── Google OAuth Manual Sync ───────────────────────────────────────────────
  async function handleSyncNow() {
    setOauthSyncing(true)
    try {
      const { syncGmailEmails } = await import('@/services/api/gmail')
      const res = await syncGmailEmails()
      showToast(res.message || 'Gmail sync completed successfully.', 'success')
      await loadOAuthStatus()
    } catch (err) {
      const msg = err?.response?.data?.message || 'Sync failed.'
      showToast(msg, 'error')
    } finally {
      setOauthSyncing(false)
    }
  }

  // ── Save SMTP config ───────────────────────────────────────────────────────
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
      if (smtpPassword.trim()) payload.smtp_password = smtpPassword
      const { data } = await saveEmailConfig(payload)
      setIsConfigured(data.is_configured)
      setSmtpPassword('')
      showToast('SMTP configuration saved successfully.', 'success')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to save configuration.'
      showToast(msg, 'error')
    } finally {
      setConfigSaving(false)
    }
  }

  // ── Send test email via SMTP ───────────────────────────────────────────────
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

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never'
    try {
      return new Date(timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return timestamp
    }
  }

  return (
    <div className="space-y-6">

      {/* ── 1. PRIMARY: Google OAuth 2.0 Gmail Integration ── */}
      <SectionCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line-default pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📫</span>
              <h2 className="text-base font-bold text-ink-primary">Gmail Integration</h2>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700 uppercase tracking-wide">
                Google OAuth 2.0
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-secondary">
              Connect your Gmail account to send personalized outreach and detect customer replies automatically.
            </p>
          </div>

          {oauthStatus?.is_connected ? (
            <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Gmail Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              <span className="size-2 rounded-full bg-slate-400" />
              Not Connected
            </span>
          )}
        </div>

        {oauthLoading ? (
          <div className="py-8 text-center text-xs text-ink-muted">
            Checking connection status...
          </div>
        ) : oauthStatus?.is_connected ? (
          /* ── Connected State View ── */
          <div className="mt-5 space-y-5">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-xs border border-emerald-200">
                    <svg className="size-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Connected Gmail Account</span>
                    <p className="text-sm font-bold text-ink-primary">{oauthStatus.provider_email}</p>
                  </div>
                </div>

                <div className="text-xs text-ink-muted">
                  <span className="font-semibold">Last Synchronized: </span>
                  <span className="font-medium text-ink-secondary">{formatLastSync(oauthStatus.last_synced_at)}</span>
                </div>
              </div>
            </div>

            {/* Test connection result banner */}
            {oauthTestResult && (
              <div
                className={[
                  'rounded-lg border p-3 text-xs flex items-center gap-2',
                  oauthTestResult.success
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800',
                ].join(' ')}
              >
                <span>{oauthTestResult.success ? '✅' : '❌'}</span>
                <span>{oauthTestResult.message}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={oauthSyncing}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                <Icon className={`size-3.5 ${oauthSyncing ? 'animate-spin' : ''}`} d={ICONS.refresh} />
                {oauthSyncing ? 'Syncing Relevant Emails...' : 'Sync Now'}
              </button>

              <button
                type="button"
                onClick={handleTestOAuth}
                disabled={oauthTesting}
                className="inline-flex items-center gap-2 rounded-lg border border-line-default bg-surface-default px-3.5 py-2 text-xs font-semibold text-ink-primary hover:bg-surface-subtle disabled:opacity-50 transition-colors"
              >
                <Icon className="size-3.5" d={ICONS.check} />
                {oauthTesting ? 'Testing...' : 'Test Connection'}
              </button>

              <button
                type="button"
                onClick={() => setShowDisconnectModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Icon className="size-3.5" d={ICONS.trash} />
                Disconnect Gmail
              </button>
            </div>

            {/* Privacy & Permissions explanation */}
            <div className="rounded-xl border border-line-default bg-surface-subtle p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-ink-secondary">
                <Icon className="size-4 text-brand-600" d={ICONS.security} />
                <span>Security & Permissions Guarantee</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-ink-muted">
                <li><strong className="text-ink-secondary">Zero Mailbox Scraping:</strong> SalesGenie only checks messages from or to contacts and leads in your CRM.</li>
                <li><strong className="text-ink-secondary">Token Encryption at Rest:</strong> Access and refresh tokens are symmetrically encrypted with Fernet. Passwords are never stored.</li>
                <li><strong className="text-ink-secondary">User Isolation:</strong> Only you have access to send from your connected Gmail.</li>
                <li><strong className="text-ink-secondary">History Preservation:</strong> Disconnecting removes stored tokens immediately while preserving your CRM timeline history.</li>
              </ul>
            </div>
          </div>
        ) : (
          /* ── Disconnected State View ── */
          <div className="mt-5 space-y-5">
            <div className="rounded-xl border border-line-default bg-surface-subtle p-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-ink-primary">Connect Your Gmail Account</h3>
                <p className="text-xs text-ink-muted max-w-lg leading-relaxed">
                  Authorize SalesGenie to send emails on your behalf and detect replies from your leads. Uses Google OAuth 2.0 with minimal scopes. No Gmail passwords required.
                </p>
              </div>

              <button
                type="button"
                onClick={handleConnectGmail}
                disabled={oauthConnecting}
                className="inline-flex shrink-0 items-center gap-2.5 rounded-xl border border-line-default bg-white px-5 py-2.5 text-xs font-bold text-ink-primary shadow-xs hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {oauthConnecting ? 'Redirecting to Google...' : 'Connect Gmail with Google'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-line-default bg-surface-default p-3.5">
                <span className="text-base">🚀</span>
                <p className="mt-1 text-xs font-bold text-ink-primary">Direct Delivery</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">Emails arrive from your actual name and Gmail address, maximizing deliverability.</p>
              </div>
              <div className="rounded-xl border border-line-default bg-surface-default p-3.5">
                <span className="text-base">↩️</span>
                <p className="mt-1 text-xs font-bold text-ink-primary">Automatic Reply Detection</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">Customer responses are matched to leads, summarized by AI, and trigger instant alerts.</p>
              </div>
              <div className="rounded-xl border border-line-default bg-surface-default p-3.5">
                <span className="text-base">🔒</span>
                <p className="mt-1 text-xs font-bold text-ink-primary">OAuth 2.0 Security</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">Google tokens are encrypted at rest with Fernet. You can revoke access at any time.</p>
              </div>
            </div>
          </div>
        )}

        {/* Disconnect Confirmation Modal */}
        {showDisconnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl border border-line-default bg-surface-default p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-ink-primary">Disconnect Gmail Account?</h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                This will revoke Google OAuth tokens and stop automatic email synchronization. Your existing emails and CRM timeline logs will remain preserved.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisconnectModal(false)}
                  className="rounded-lg border border-line-default px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectGmail}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Confirm Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── 2. Advanced Settings / Custom SMTP (Secondary) ── */}
      <SectionCard>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowAdvancedSmtp((v) => !v)}
        >
          <SectionTitle
            title="Custom SMTP / Non-OAuth Settings"
            description="Optional manual configuration for custom mail servers or non-Google providers."
          />
          <button type="button" className="text-xs font-bold text-brand-600 hover:underline">
            {showAdvancedSmtp ? 'Hide Options ▲' : 'Show Options ▼'}
          </button>
        </div>

        {showAdvancedSmtp && (
          <div className="mt-5 space-y-5 border-t border-line-default pt-4">

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

  const showWorkspaceManagement = !isPersonal  // all workspace members see the workspace section

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
            : 'Manage your personal preferences and workspace membership.'}
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
