import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  Award,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  DollarSign,
  ExternalLink,
  Flame,
  ListTodo,
  Loader2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
  Zap,
} from '@/components/ui/icons'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import {
  getWorkspace,
  listWorkspaceMembers,
  updateMemberRole,
  removeWorkspaceMember,
} from '@/services/api/workspaces'
import { getTasks, createTask, updateTask } from '@/services/api/tasks'
import { getLeads } from '@/services/api/leads'
import { getFollowUps } from '@/services/api/followUps'
import { getOpportunities } from '@/services/api/opportunities'
import { getCRMLeadRecommendations } from '@/services/api/crmDashboard'
import api from '@/services/api/client'

// ─── Colour palette ────────────────────────────────────────────────────────────
const COLORS = {
  brand:   '#4f46e5',
  indigo:  '#6366f1',
  emerald: '#10b981',
  amber:   '#f59e0b',
  rose:    '#ef4444',
  cyan:    '#06b6d4',
  purple:  '#8b5cf6',
  slate:   '#64748b',
}

// ─── Priority config ───────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { label: 'High',   cls: 'bg-rose-100 text-rose-700 border-rose-200',   dot: 'bg-rose-500'   },
  medium: { label: 'Medium', cls: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500'  },
  low:    { label: 'Low',    cls: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'  },
}

// ─── Lead status config ────────────────────────────────────────────────────────
const LEAD_STATUS_CONFIG = {
  new:        { label: 'New',        cls: 'bg-blue-100 text-blue-700 border-blue-200'       },
  contacted:  { label: 'Contacted',  cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  qualified:  { label: 'Qualified',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  proposal:   { label: 'Proposal',   cls: 'bg-violet-100 text-violet-700 border-violet-200' },
  negotiation:{ label: 'Negotiating',cls: 'bg-amber-100 text-amber-700 border-amber-200'   },
  closed_won: { label: 'Closed Won', cls: 'bg-green-100 text-green-700 border-green-200'   },
  closed_lost:{ label: 'Closed Lost',cls: 'bg-rose-100 text-rose-700 border-rose-200'      },
  won:        { label: 'Closed Won', cls: 'bg-green-100 text-green-700 border-green-200'   },
  lost:       { label: 'Closed Lost',cls: 'bg-rose-100 text-rose-700 border-rose-200'      },
}

// ─── Utilities ─────────────────────────────────────────────────────────────────
function initials(name, email) {
  const s = name || email || 'U'
  return s.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ name, email, size = 9, colorIndex = 0 }) {
  const AVATAR_COLORS = [
    'bg-indigo-100 text-indigo-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-cyan-100 text-cyan-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
  ]
  return (
    <span className={`inline-grid size-${size} shrink-0 place-items-center rounded-full text-xs font-bold ${AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]}`}>
      {initials(name, email)}
    </span>
  )
}

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      {children}
    </span>
  )
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
    </svg>
  )
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-default bg-surface-subtle py-14 px-6 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-surface-muted">
        <Icon className="size-6 text-ink-muted" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink-primary">{title}</p>
        {description && <p className="mt-1 text-xs text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function SectionCard({ children, className = '' }) {
  return (
    <div className={`card p-6 ${className}`}>
      {children}
    </div>
  )
}

function TabButton({ active, children, onClick, icon: Icon }) {
  return (
    <button
      className={[
        'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
          : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary',
      ].join(' ')}
      onClick={onClick}
      type="button"
    >
      {Icon && <Icon className="size-4 shrink-0" strokeWidth={1.75} />}
      {children}
    </button>
  )
}

// ─── Date helpers ───────────────────────────────────────────────────────────────
function isToday(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}
function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date() && !isToday(dateStr)
}
function isThisWeek(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + 7)
  return d >= now && d <= weekEnd
}
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatRelative(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.round((d - now) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays < 7) return `In ${diffDays}d`
  return formatDate(dateStr)
}

// ─── Edit Workspace Modal ──────────────────────────────────────────────────────
function EditWorkspaceModal({ workspace, onClose, onSaved }) {
  const { showToast } = useToast()
  const [name, setName] = useState(workspace?.name || '')
  const [description, setDescription] = useState(workspace?.description || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { showToast('Workspace name is required.', 'error'); return }
    setSaving(true)
    try {
      await api.patch(`/workspaces/${workspace.id}`, { name: name.trim(), description: description.trim() })
      showToast('Workspace details updated.', 'success')
      onSaved({ name: name.trim(), description: description.trim() })
      onClose()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to update workspace.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-surface-default p-6 shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-primary">Edit Workspace Details</h2>
          <button className="rounded-full p-2 text-ink-muted hover:bg-surface-muted" onClick={onClose} type="button"><X className="size-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary">Workspace Name *</label>
            <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Workspace" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary">Description</label>
            <textarea className="input h-auto w-full resize-none py-2 leading-relaxed" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this workspace..." />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn btn-secondary btn-sm" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary btn-sm gap-2" disabled={saving} onClick={handleSave} type="button">
            {saving && <Spinner />} {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Task Modal ──────────────────────────────────────────────────────────
function CreateTaskModal({ members, onClose, onCreated }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', assigned_to_user_id: '' })
  const [saving, setSaving] = useState(false)

  const setField = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))

  const handleCreate = async () => {
    if (!form.title.trim()) { showToast('Task title is required.', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        due_date: form.due_date || undefined,
        assigned_to_user_id: form.assigned_to_user_id || undefined,
      }
      const task = await createTask(payload)
      showToast('Task created successfully!', 'success')
      onCreated(task)
      onClose()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to create task.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface-default p-6 shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-primary">Create New Task</h2>
          <button className="rounded-full p-2 text-ink-muted hover:bg-surface-muted" onClick={onClose} type="button"><X className="size-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary">Task Title *</label>
            <input className="input w-full" value={form.title} onChange={(e) => setField('title')(e.target.value)} placeholder="e.g. Follow up with Acme Corp" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary">Description</label>
            <textarea className="input h-auto w-full resize-none py-2 leading-relaxed" rows={2} value={form.description} onChange={(e) => setField('description')(e.target.value)} placeholder="Optional details..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-secondary">Priority</label>
              <select className="input w-full" value={form.priority} onChange={(e) => setField('priority')(e.target.value)}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-secondary">Due Date</label>
              <input className="input w-full" type="date" value={form.due_date} onChange={(e) => setField('due_date')(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary">Assign To</label>
            <select className="input w-full" value={form.assigned_to_user_id} onChange={(e) => setField('assigned_to_user_id')(e.target.value)}>
              <option value="">— Unassigned —</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.user_name || m.user_email}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn btn-secondary btn-sm" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary btn-sm gap-2" disabled={saving} onClick={handleCreate} type="button">
            {saving && <Spinner />} {saving ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 1: Overview & Team Directory ─────────────────────────────────────────
function OverviewTab({ workspace, workspaceDetails, members, loading, isManager, userId, onRefresh, onEditWorkspace }) {
  const { showToast } = useToast()
  const [roleChanging, setRoleChanging] = useState(null)
  const [removing, setRemoving] = useState(null)

  const manager = members.find((m) => m.role === 'manager')
  const teamMembers = members.filter((m) => m.role !== 'manager')

  const handleRoleChange = async (memberId, newRole, memberName) => {
    setRoleChanging(memberId)
    try {
      await updateMemberRole(workspace.id, memberId, newRole)
      showToast(`${memberName || 'Member'} role updated to ${newRole === 'manager' ? 'Manager' : 'Team Member'}.`, 'success')
      onRefresh()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to update role.', 'error')
    } finally {
      setRoleChanging(null)
    }
  }

  const handleRemove = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName || 'this member'} from the workspace?`)) return
    setRemoving(memberId)
    try {
      await removeWorkspaceMember(workspace.id, memberId)
      showToast('Member removed from workspace.', 'success')
      onRefresh()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to remove member.', 'error')
    } finally {
      setRemoving(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-muted" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Workspace Details Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-line-default bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <Building2 className="size-7 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{workspace?.name}</h2>
                {isManager && (
                  <button
                    className="rounded-lg bg-white/15 p-1.5 text-white/80 transition-colors hover:bg-white/25"
                    onClick={onEditWorkspace}
                    title="Edit workspace details"
                    type="button"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-white/75">
                {workspace?.description || workspaceDetails?.description || 'No description provided.'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
            <Badge className="border-white/25 bg-white/15 text-white">
              <Users className="mr-1 size-3" /> {members.length} member{members.length !== 1 ? 's' : ''}
            </Badge>
            <Badge className="border-white/25 bg-white/15 text-white">
              <Activity className="mr-1 size-3" /> Active Workspace
            </Badge>
            {workspaceDetails?.created_at && (
              <Badge className="border-white/25 bg-white/15 text-white">
                <Calendar className="mr-1 size-3" /> Since {formatDate(workspaceDetails.created_at)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Workspace Manager Spotlight */}
      {manager && (
        <SectionCard>
          <div className="mb-4 flex items-center gap-2">
            <Crown className="size-4 text-amber-500" strokeWidth={1.75} />
            <h3 className="text-base font-semibold text-ink-primary">Workspace Manager</h3>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
            <div className="relative">
              <Avatar name={manager.user_name} email={manager.user_email} size={14} colorIndex={0} />
              <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-amber-400 ring-2 ring-white">
                <Crown className="size-3 text-white" strokeWidth={2} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-ink-primary">{manager.user_name || manager.user_email}</p>
                <Badge className="border-amber-300 bg-amber-100 text-amber-800">
                  <Crown className="mr-1 size-2.5" /> Workspace Manager
                </Badge>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                <Mail className="size-3" />
                {manager.user_email}
              </p>
              {manager.joined_at && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                  <Calendar className="size-3" />
                  Joined {formatDate(manager.joined_at)}
                </p>
              )}
            </div>
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
              <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500 inline-block" />
              Active
            </Badge>
          </div>
        </SectionCard>
      )}

      {/* Team Members Directory */}
      <SectionCard>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-brand-600" strokeWidth={1.75} />
            <h3 className="text-base font-semibold text-ink-primary">
              Team Directory
              <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">{members.length}</span>
            </h3>
          </div>
          {isManager && (
            <a href="/settings/workspace" className="flex items-center gap-1.5 rounded-lg border border-line-default px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary">
              <UserPlus className="size-3.5" /> Invite Member
            </a>
          )}
        </div>

        {members.length === 0 ? (
          <EmptyState icon={Users} title="No team members yet" description="Invite members to your workspace to get started." />
        ) : (
          <div className="space-y-2.5">
            {members.map((m, idx) => {
              const isOwner = m.role === 'manager'
              const isSelf = m.user_id === userId
              return (
                <div
                  key={m.id || m.user_id}
                  className={[
                    'flex items-center gap-3 rounded-xl border p-4 transition-colors',
                    isOwner ? 'border-amber-200 bg-amber-50/50' : 'border-line-default bg-surface-default hover:bg-surface-subtle',
                  ].join(' ')}
                >
                  <Avatar name={m.user_name} email={m.user_email} size={10} colorIndex={idx} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-ink-primary">
                        {m.user_name || m.user_email}
                        {isSelf && <span className="ml-1 text-xs font-normal text-ink-muted">(you)</span>}
                      </p>
                      <Badge className={isOwner
                        ? 'border-amber-300 bg-amber-100 text-amber-800'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'}
                      >
                        {isOwner ? <><Crown className="mr-1 size-2.5" />Manager</> : <><UserCheck className="mr-1 size-2.5" />Team Member</>}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">{m.user_email}</p>
                    {m.joined_at && (
                      <p className="mt-0.5 text-xs text-ink-muted">
                        <Calendar className="mr-1 inline size-3" />Joined {formatDate(m.joined_at)}
                      </p>
                    )}
                  </div>

                  {/* Role & actions — Manager only, not on self */}
                  {isManager && !isSelf && (
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        className="rounded-lg border border-line-default bg-surface-default px-2 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                        value={m.role}
                        disabled={roleChanging === m.user_id}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value, m.user_name)}
                      >
                        <option value="manager">Manager</option>
                        <option value="team_member">Team Member</option>
                      </select>
                      <button
                        className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        disabled={removing === m.user_id}
                        onClick={() => handleRemove(m.user_id, m.user_name)}
                        title="Remove member"
                        type="button"
                      >
                        {removing === m.user_id ? <Spinner /> : <UserMinus className="size-4" />}
                      </button>
                    </div>
                  )}

                  {/* Team member view: read-only role */}
                  {!isManager && (
                    <div className="shrink-0">
                      <Badge className={isOwner ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'}>
                        {isOwner ? 'Manager' : 'Member'}
                      </Badge>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── Tab 2: Today's Tasks ──────────────────────────────────────────────────────
function TasksTab({ members, isManager, userId }) {
  const { showToast } = useToast()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('today') // today | overdue | upcoming | all
  const [assigneeFilter, setAssigneeFilter] = useState('all') // all | mine
  const [showCreate, setShowCreate] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTasks({ page_size: 100 })
      setTasks(data?.items || data || [])
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  const filteredTasks = useMemo(() => {
    let list = tasks
    if (assigneeFilter === 'mine') {
      list = list.filter((t) => t.assigned_to_user_id === userId || t.user_id === userId)
    }
    if (filter === 'today') list = list.filter((t) => isToday(t.due_date))
    else if (filter === 'overdue') list = list.filter((t) => isOverdue(t.due_date) && !t.is_completed)
    else if (filter === 'upcoming') list = list.filter((t) => isThisWeek(t.due_date) && !isToday(t.due_date) && !t.is_completed)
    return list
  }, [tasks, filter, assigneeFilter, userId])

  const handleToggleComplete = async (task) => {
    setTogglingId(task.id)
    try {
      await updateTask(task.id, { is_completed: !task.is_completed })
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t))
    } catch {
      showToast('Failed to update task.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const FILTER_TABS = [
    { key: 'today',    label: 'Today',    count: tasks.filter((t) => isToday(t.due_date)).length },
    { key: 'overdue',  label: 'Overdue',  count: tasks.filter((t) => isOverdue(t.due_date) && !t.is_completed).length, danger: true },
    { key: 'upcoming', label: 'Upcoming', count: tasks.filter((t) => isThisWeek(t.due_date) && !isToday(t.due_date) && !t.is_completed).length },
    { key: 'all',      label: 'All',      count: tasks.length },
  ]

  const memberMap = useMemo(() => {
    const m = {}
    members.forEach((mem) => { m[mem.user_id] = mem.user_name || mem.user_email })
    return m
  }, [members])

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_TABS.map((ft) => (
            <button
              key={ft.key}
              className={[
                'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                filter === ft.key
                  ? ft.danger ? 'bg-rose-600 text-white shadow-sm' : 'bg-brand-600 text-white shadow-sm'
                  : ft.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-ink-secondary hover:bg-surface-muted',
              ].join(' ')}
              onClick={() => setFilter(ft.key)}
              type="button"
            >
              {ft.label}
              {ft.count > 0 && (
                <span className={[
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  filter === ft.key ? 'bg-white/25 text-white' : ft.danger ? 'bg-rose-100 text-rose-700' : 'bg-surface-muted text-ink-muted',
                ].join(' ')}>
                  {ft.count}
                </span>
              )}
            </button>
          ))}
          <div className="ml-2 flex items-center gap-1.5 rounded-xl border border-line-default bg-surface-default px-3 py-1.5">
            <select
              className="bg-transparent text-xs font-medium text-ink-secondary focus:outline-none"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="all">All Team</option>
              <option value="mine">My Tasks</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-xl border border-line-default px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-muted" onClick={loadTasks} type="button">
            <RefreshCw className="size-3.5" /> Refresh
          </button>
          {isManager && (
            <button
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-brand-600/30 transition-all hover:bg-brand-700"
              onClick={() => setShowCreate(true)}
              type="button"
            >
              <Plus className="size-3.5" /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-muted" />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={filter === 'today' ? 'No tasks due today' : filter === 'overdue' ? 'No overdue tasks' : filter === 'upcoming' ? 'No upcoming tasks' : 'No tasks found'}
          description={filter === 'today' ? 'All clear! No tasks are scheduled for today.' : 'Check a different filter to see tasks.'}
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const priority = PRIORITY_CONFIG[task.priority?.toLowerCase()] || PRIORITY_CONFIG.medium
            const assigneeName = task.assigned_to_user_id ? (memberMap[task.assigned_to_user_id] || 'Assigned') : null
            const dueBadge = task.due_date ? formatRelative(task.due_date) : null
            const isDue = task.due_date && isOverdue(task.due_date)

            return (
              <div
                key={task.id}
                className={[
                  'flex items-start gap-4 rounded-2xl border p-4 transition-all',
                  task.is_completed
                    ? 'border-line-default bg-surface-subtle opacity-60'
                    : isDue
                    ? 'border-rose-200 bg-rose-50/50 shadow-sm'
                    : 'border-line-default bg-surface-default shadow-xs hover:shadow-sm',
                ].join(' ')}
              >
                {/* Complete toggle */}
                <button
                  className="mt-0.5 shrink-0 rounded-full p-0.5 text-ink-muted transition-colors hover:text-brand-600 disabled:opacity-50"
                  disabled={togglingId === task.id}
                  onClick={() => handleToggleComplete(task)}
                  type="button"
                >
                  {togglingId === task.id ? (
                    <Spinner />
                  ) : task.is_completed ? (
                    <CheckCircle2 className="size-5 text-emerald-600" />
                  ) : (
                    <div className="size-5 rounded-full border-2 border-ink-muted/40 hover:border-brand-500" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className={['text-sm font-semibold text-ink-primary', task.is_completed ? 'line-through opacity-60' : ''].join(' ')}>
                      {task.title}
                    </p>
                    <Badge className={`border ${priority.cls}`}>
                      <span className={`mr-1 size-1.5 rounded-full ${priority.dot} inline-block`} />
                      {priority.label}
                    </Badge>
                    {isDue && !task.is_completed && (
                      <Badge className="border-rose-300 bg-rose-100 text-rose-700">
                        <AlertCircle className="mr-1 size-3" /> Overdue
                      </Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-1 text-xs text-ink-muted line-clamp-1">{task.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    {dueBadge && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {dueBadge}
                      </span>
                    )}
                    {assigneeName && (
                      <span className="flex items-center gap-1">
                        <User className="size-3" /> {assigneeName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateTaskModal
          members={members}
          onClose={() => setShowCreate(false)}
          onCreated={(task) => { setTasks((prev) => [task, ...prev]); setFilter('all') }}
        />
      )}
    </div>
  )
}

// ─── Tab 3: Important Lead Dates ───────────────────────────────────────────────
function LeadDatesTab({ members = [], workspaceId, workspace }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('followup') // 'followup' | 'closing'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'overdue' | 'due_today' | 'upcoming' | 'this_month'
  const [leads, setLeads] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [tasks, setTasks] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [recommendations, setRecommendations] = useState([])

  const loadAllData = useCallback(async () => {
    setLoading(true)
    try {
      const params = workspaceId ? { workspace_id: workspaceId, page_size: 100 } : { page_size: 100 }
      const [leadsRes, followUpsRes, tasksRes, oppsRes, recsRes] = await Promise.allSettled([
        getLeads(params),
        getFollowUps(params),
        getTasks(params),
        getOpportunities(params),
        getCRMLeadRecommendations(workspaceId ? { workspace_id: workspaceId } : {}),
      ])

      setLeads(leadsRes.status === 'fulfilled' ? (leadsRes.value?.items || leadsRes.value || []) : [])
      setFollowUps(followUpsRes.status === 'fulfilled' ? (followUpsRes.value?.items || followUpsRes.value || []) : [])
      setTasks(tasksRes.status === 'fulfilled' ? (tasksRes.value?.items || tasksRes.value || []) : [])
      setOpportunities(oppsRes.status === 'fulfilled' ? (oppsRes.value?.items || oppsRes.value || []) : [])
      setRecommendations(recsRes.status === 'fulfilled' ? (recsRes.value || []) : [])
    } catch (err) {
      console.error('Failed to load lead dates data:', err)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const memberMap = useMemo(() => {
    const m = {}
    members.forEach((mem) => {
      m[mem.user_id] = mem.user_name || mem.user_email
    })
    return m
  }, [members])

  const leadMap = useMemo(() => {
    const map = {}
    leads.forEach((l) => {
      map[l.id] = l
    })
    return map
  }, [leads])

  // Helper to check if a date falls in current month or next 30 days
  const isClosingThisMonth = useCallback((dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return false
    const now = new Date()
    const thirtyDays = new Date()
    thirtyDays.setDate(now.getDate() + 30)
    return (d >= now && d <= thirtyDays) || (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth())
  }, [])

  // Assemble follow-up items from real CRM follow-up tasks, recommendations, and pipeline leads
  const allFollowUpItems = useMemo(() => {
    const items = []
    const seenTaskIds = new Set()
    const seenLeadIdsWithDates = new Set()

    // 1. Explicit follow-up tasks & general tasks with due dates
    const combinedTasks = [...followUps, ...tasks]
    combinedTasks.forEach((t) => {
      if (!t || !t.id || seenTaskIds.has(t.id)) return
      seenTaskIds.add(t.id)

      if (!t.due_date && t.task_type !== 'follow_up') return

      const linkedLead = t.lead_id ? leadMap[t.lead_id] : null
      if (t.lead_id) seenLeadIdsWithDates.add(t.lead_id)

      items.push({
        id: `task-${t.id}`,
        taskId: t.id,
        leadId: t.lead_id || null,
        company_name: linkedLead?.company_name || t.entity_name || t.title || 'Lead Follow-Up',
        contact_name: linkedLead?.contact_name || null,
        title: t.title || 'Scheduled Follow-Up',
        lead_status: linkedLead?.lead_status || (t.is_completed ? 'completed' : 'contacted'),
        deal_value: linkedLead?.deal_value || null,
        follow_up_date: t.due_date || t.updated_at || t.created_at,
        assigned_to_user_id: t.assigned_to || t.assigned_to_user_id || linkedLead?.assigned_to || linkedLead?.owner_id,
        is_completed: Boolean(t.is_completed),
        notes: t.description || t.notes || null,
        priority: t.priority || 'medium',
        source: 'task',
      })
    })

    // 2. Automated AI Lead Recommendations
    recommendations.forEach((rec) => {
      if (!rec || !rec.lead_id) return
      if (rec.existing_follow_up_id && seenTaskIds.has(rec.existing_follow_up_id)) return

      const linkedLead = leadMap[rec.lead_id]
      seenLeadIdsWithDates.add(rec.lead_id)

      items.push({
        id: `rec-${rec.id || rec.lead_id}`,
        leadId: rec.lead_id,
        company_name: rec.company_name || linkedLead?.company_name || 'Lead Follow-Up',
        contact_name: rec.lead_name || linkedLead?.contact_name || null,
        title: rec.title || 'Follow-up Recommendation',
        lead_status: rec.lead_status || linkedLead?.lead_status || 'qualified',
        deal_value: rec.deal_value ?? linkedLead?.deal_value ?? null,
        follow_up_date: rec.due_date || linkedLead?.updated_at || new Date().toISOString(),
        assigned_to_user_id: rec.assigned_to || linkedLead?.assigned_to || linkedLead?.owner_id,
        is_completed: false,
        notes: rec.reason || null,
        priority: rec.urgency === 'urgent' ? 'high' : rec.urgency === 'high' ? 'high' : 'medium',
        source: 'recommendation',
      })
    })

    // 3. Active workspace leads without scheduled tasks (e.g. newly created or qualified)
    leads.forEach((l) => {
      if (seenLeadIdsWithDates.has(l.id)) return
      if (l.lead_status === 'closed_won' || l.lead_status === 'closed_lost') return

      items.push({
        id: `lead-${l.id}`,
        leadId: l.id,
        company_name: l.company_name || l.contact_name || 'Lead',
        contact_name: l.contact_name || null,
        title: `Follow-up on ${l.company_name || l.contact_name || 'Lead'}`,
        lead_status: l.lead_status,
        deal_value: l.deal_value,
        follow_up_date: l.updated_at || l.created_at || new Date().toISOString(),
        assigned_to_user_id: l.assigned_to || l.owner_id,
        is_completed: false,
        notes: `Stage: ${l.lead_status?.toUpperCase()} — Follow-up touchpoint needed`,
        priority: l.deal_value && Number(l.deal_value) > 50000 ? 'high' : 'medium',
        source: 'lead',
      })
    })

    // Sort: incomplete first, overdue/today first, then nearest date
    return items.sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
      const aDate = new Date(a.follow_up_date)
      const bDate = new Date(b.follow_up_date)
      return aDate - bDate
    })
  }, [followUps, tasks, recommendations, leads, leadMap])

  // Assemble closing deals list from opportunities and advanced stage leads
  const allClosingItems = useMemo(() => {
    const items = []
    const seenOppIds = new Set()

    // 1. Opportunities in the workspace
    opportunities.forEach((opp) => {
      if (!opp || !opp.id || seenOppIds.has(opp.id)) return
      seenOppIds.add(opp.id)

      const linkedLead = opp.lead_id ? leadMap[opp.lead_id] : null

      items.push({
        id: `opp-${opp.id}`,
        opportunityId: opp.id,
        leadId: opp.lead_id || null,
        company_name: linkedLead?.company_name || opp.name,
        contact_name: linkedLead?.contact_name || (linkedLead ? null : opp.name),
        title: opp.name || 'Sales Deal',
        deal_name: opp.name,
        lead_status: opp.stage || linkedLead?.lead_status || 'proposal',
        deal_value: opp.amount ?? linkedLead?.deal_value ?? null,
        expected_close_date: opp.expected_close_date || null,
        assigned_to_user_id: opp.owner_id || linkedLead?.assigned_to || linkedLead?.owner_id,
        is_won: opp.is_won || opp.stage === 'won',
        is_closed: opp.is_closed || opp.stage === 'lost',
        source: 'opportunity',
      })
    })

    // 2. Active leads in proposal or negotiation stages without duplicate opp
    leads.forEach((l) => {
      if (l.lead_status === 'proposal' || l.lead_status === 'negotiation') {
        const hasOpp = items.some((it) => it.leadId === l.id)
        if (!hasOpp) {
          items.push({
            id: `lead-opp-${l.id}`,
            leadId: l.id,
            company_name: l.company_name || l.contact_name || 'Deal',
            contact_name: l.contact_name || null,
            title: `${l.company_name || 'Lead'} Opportunity`,
            deal_name: `${l.company_name || 'Lead'} Deal`,
            lead_status: l.lead_status,
            deal_value: l.deal_value,
            expected_close_date: l.updated_at || l.created_at,
            assigned_to_user_id: l.assigned_to || l.owner_id,
            is_won: false,
            is_closed: false,
            source: 'lead',
          })
        }
      }
    })

    // Sort: Items with close dates first (sorted ascending), then others
    return items.sort((a, b) => {
      if (a.expected_close_date && b.expected_close_date) {
        return new Date(a.expected_close_date) - new Date(b.expected_close_date)
      }
      if (a.expected_close_date) return -1
      if (b.expected_close_date) return 1
      return 0
    })
  }, [opportunities, leads, leadMap])

  // Filtered lists
  const filteredFollowUps = useMemo(() => {
    let list = allFollowUpItems
    if (statusFilter === 'overdue') {
      list = list.filter((i) => !i.is_completed && isOverdue(i.follow_up_date))
    } else if (statusFilter === 'due_today') {
      list = list.filter((i) => !i.is_completed && isToday(i.follow_up_date))
    } else if (statusFilter === 'upcoming') {
      list = list.filter((i) => !i.is_completed && !isOverdue(i.follow_up_date) && !isToday(i.follow_up_date))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (i) =>
          i.company_name?.toLowerCase().includes(q) ||
          i.contact_name?.toLowerCase().includes(q) ||
          i.title?.toLowerCase().includes(q)
      )
    }
    return list
  }, [allFollowUpItems, statusFilter, searchQuery])

  const filteredClosingDeals = useMemo(() => {
    let list = allClosingItems
    if (statusFilter === 'this_month') {
      list = list.filter((i) => isClosingThisMonth(i.expected_close_date))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (i) =>
          i.company_name?.toLowerCase().includes(q) ||
          i.contact_name?.toLowerCase().includes(q) ||
          i.title?.toLowerCase().includes(q) ||
          i.deal_name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [allClosingItems, statusFilter, searchQuery, isClosingThisMonth])

  // Stats calculation driven by actual workspace data
  const stats = useMemo(() => {
    const activeFollowUps = allFollowUpItems.filter((i) => !i.is_completed)
    const overdueFollowUps = activeFollowUps.filter((i) => isOverdue(i.follow_up_date))
    const closingThisMonthCount = allClosingItems.filter((i) => isClosingThisMonth(i.expected_close_date)).length

    const activeLeads = leads.filter((l) => l.lead_status !== 'closed_won' && l.lead_status !== 'closed_lost')
    const activeOpps = opportunities.filter((o) => !o.is_closed && !o.is_won && o.stage !== 'won' && o.stage !== 'lost')

    const totalPipelineValue = activeLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0) +
      activeOpps.reduce((sum, o) => sum + (Number(o.amount) || 0), 0)

    const totalPipelineCount = activeLeads.length + activeOpps.length

    return {
      followUpsDue: activeFollowUps.length,
      overdueFollowUps: overdueFollowUps.length,
      closingThisMonth: closingThisMonthCount,
      pipelineCount: totalPipelineCount,
      pipelineValue: totalPipelineValue,
    }
  }, [allFollowUpItems, allClosingItems, leads, opportunities, isClosingThisMonth])

  const displayItems = view === 'followup' ? filteredFollowUps : filteredClosingDeals

  const handleItemClick = (item) => {
    if (item.leadId) {
      navigate(`/leads/${item.leadId}`)
    } else if (item.opportunityId) {
      navigate(`/opportunities/${item.opportunityId}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controls: View Toggle, Search, and Refresh */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={[
              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
              view === 'followup'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30 ring-1 ring-amber-400'
                : 'text-ink-secondary hover:bg-surface-muted',
            ].join(' ')}
            onClick={() => {
              setView('followup')
              setStatusFilter('all')
            }}
            type="button"
          >
            <Clock className="size-4" /> Follow-Up Deadlines
            {stats.followUpsDue > 0 && (
              <span className={[
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                view === 'followup' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700',
              ].join(' ')}>
                {stats.followUpsDue}
              </span>
            )}
          </button>
          <button
            className={[
              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
              view === 'closing'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 ring-1 ring-emerald-500'
                : 'text-ink-secondary hover:bg-surface-muted',
            ].join(' ')}
            onClick={() => {
              setView('closing')
              setStatusFilter('all')
            }}
            type="button"
          >
            <TrendingUp className="size-4" /> Closing This Month
            {stats.closingThisMonth > 0 && (
              <span className={[
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                view === 'closing' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-700',
              ].join(' ')}>
                {stats.closingThisMonth}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search leads & deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-line-default bg-surface-default pl-8 pr-3 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-none"
            />
          </div>
          <button
            className="flex items-center gap-1.5 rounded-xl border border-line-default bg-surface-default px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-muted"
            onClick={loadAllData}
            title="Refresh lead dates"
            type="button"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Follow-Ups Due',
            value: stats.followUpsDue,
            subtext: `${allFollowUpItems.filter((i) => i.is_completed).length} completed`,
            icon: Clock,
            color: 'text-amber-600 bg-amber-50/70 border-amber-200',
          },
          {
            label: 'Overdue Follow-Ups',
            value: stats.overdueFollowUps,
            subtext: stats.overdueFollowUps > 0 ? 'Requires immediate touchpoint' : 'All clear on time',
            icon: AlertCircle,
            color: 'text-rose-600 bg-rose-50/70 border-rose-200',
          },
          {
            label: 'Closing This Month',
            value: stats.closingThisMonth,
            subtext: `${allClosingItems.length} total active deals`,
            icon: TrendingUp,
            color: 'text-emerald-600 bg-emerald-50/70 border-emerald-200',
          },
          {
            label: 'Total Pipeline',
            value: stats.pipelineCount,
            subtext: stats.pipelineValue > 0 ? `$${Number(stats.pipelineValue).toLocaleString()}` : `${leads.length} leads in CRM`,
            icon: Target,
            color: 'text-brand-600 bg-brand-50/70 border-brand-200',
          },
        ].map((stat) => (
          <div key={stat.label} className={`flex items-start gap-3.5 rounded-2xl border p-4 shadow-2xs transition-all hover:shadow-xs ${stat.color}`}>
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/70 shadow-2xs">
              <stat.icon className="size-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs font-semibold opacity-85">{stat.label}</p>
              <p className="mt-0.5 text-[11px] opacity-70 truncate">{stat.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line-default pb-3">
        {view === 'followup' ? (
          <>
            <button
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${statusFilter === 'all' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-secondary hover:bg-surface-muted'}`}
              onClick={() => setStatusFilter('all')}
              type="button"
            >
              All Deadlines ({allFollowUpItems.length})
            </button>
            <button
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${statusFilter === 'overdue' ? 'bg-rose-100 text-rose-800 font-semibold' : 'text-rose-600 hover:bg-rose-50'}`}
              onClick={() => setStatusFilter('overdue')}
              type="button"
            >
              Overdue ({stats.overdueFollowUps})
            </button>
            <button
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${statusFilter === 'due_today' ? 'bg-amber-100 text-amber-800 font-semibold' : 'text-amber-600 hover:bg-amber-50'}`}
              onClick={() => setStatusFilter('due_today')}
              type="button"
            >
              Due Today ({allFollowUpItems.filter((i) => !i.is_completed && isToday(i.follow_up_date)).length})
            </button>
            <button
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${statusFilter === 'upcoming' ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-blue-600 hover:bg-blue-50'}`}
              onClick={() => setStatusFilter('upcoming')}
              type="button"
            >
              Upcoming ({allFollowUpItems.filter((i) => !i.is_completed && !isOverdue(i.follow_up_date) && !isToday(i.follow_up_date)).length})
            </button>
          </>
        ) : (
          <>
            <button
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${statusFilter === 'all' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-secondary hover:bg-surface-muted'}`}
              onClick={() => setStatusFilter('all')}
              type="button"
            >
              All Closing Deals ({allClosingItems.length})
            </button>
            <button
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${statusFilter === 'this_month' ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'text-emerald-700 hover:bg-emerald-50'}`}
              onClick={() => setStatusFilter('this_month')}
              type="button"
            >
              Closing This Month ({stats.closingThisMonth})
            </button>
          </>
        )}
      </div>

      {/* Cards List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <EmptyState
          icon={view === 'followup' ? Clock : TrendingUp}
          title={
            searchQuery
              ? 'No matching leads or deals'
              : view === 'followup'
              ? 'No upcoming follow-ups'
              : 'No deals closing this month'
          }
          description={
            searchQuery
              ? `No items found matching "${searchQuery}". Try adjusting your search or filters.`
              : view === 'followup'
              ? 'All follow-up tasks and lead deadlines for this workspace are currently up to date.'
              : 'No opportunities in this workspace have an expected close date in the next 30 days.'
          }
        />
      ) : (
        <div className="space-y-3">
          {displayItems.map((item) => {
            const dateField = view === 'followup' ? item.follow_up_date : item.expected_close_date
            const statusKey = item.lead_status?.toLowerCase() || 'new'
            const statusCfg = LEAD_STATUS_CONFIG[statusKey] || {
              label: item.lead_status || 'Unknown',
              cls: 'bg-slate-100 text-slate-700 border-slate-200',
            }
            const ownerName = item.assigned_to_user_id ? (memberMap[item.assigned_to_user_id] || 'Assigned Member') : 'Unassigned'
            const overdue = isOverdue(dateField)
            const today = isToday(dateField)

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={[
                  'group flex flex-col gap-3.5 rounded-2xl border p-4.5 transition-all cursor-pointer sm:flex-row sm:items-center sm:justify-between shadow-2xs hover:shadow-sm',
                  overdue && !item.is_completed
                    ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
                    : today && !item.is_completed
                    ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                    : 'border-line-default bg-surface-default hover:border-brand-300',
                ].join(' ')}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className={[
                    'grid size-11 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105',
                    overdue && !item.is_completed
                      ? 'bg-rose-100 text-rose-600'
                      : today && !item.is_completed
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-surface-muted text-ink-muted',
                  ].join(' ')}>
                    {view === 'followup' ? (
                      <Clock className="size-5" strokeWidth={1.75} />
                    ) : (
                      <TrendingUp className="size-5 text-emerald-600" strokeWidth={1.75} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink-primary group-hover:text-brand-600 transition-colors">
                        {item.company_name || item.contact_name || item.title || 'Lead'}
                      </p>
                      {item.contact_name && item.company_name && item.contact_name !== item.company_name && (
                        <span className="text-xs text-ink-muted">({item.contact_name})</span>
                      )}
                      <Badge className={`border ${statusCfg.cls}`}>{statusCfg.label}</Badge>
                      {overdue && !item.is_completed && (
                        <Badge className="border-rose-300 bg-rose-100 text-rose-700">
                          <AlertCircle className="mr-1 size-3" /> Overdue
                        </Badge>
                      )}
                      {today && !overdue && !item.is_completed && (
                        <Badge className="border-amber-300 bg-amber-100 text-amber-800">
                          <Zap className="mr-1 size-3" /> Due Today
                        </Badge>
                      )}
                      {item.is_completed && (
                        <Badge className="border-emerald-300 bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="mr-1 size-3" /> Completed
                        </Badge>
                      )}
                    </div>

                    {item.title && item.title !== item.company_name && (
                      <p className="mt-1 text-xs font-medium text-ink-secondary line-clamp-1">
                        {item.title}
                      </p>
                    )}

                    {item.notes && (
                      <p className="mt-0.5 text-xs text-ink-muted line-clamp-1 italic">
                        {item.notes}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                      <span className="flex items-center gap-1 font-medium text-ink-secondary">
                        <Calendar className="size-3 text-ink-muted" />
                        {dateField ? formatRelative(dateField) : 'No date set'}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        {ownerName}
                      </span>
                      {item.deal_value && (
                        <span className="flex items-center gap-1 font-semibold text-emerald-600">
                          <DollarSign className="size-3" />
                          ${Number(item.deal_value).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                  {dateField && (
                    <Badge className={[
                      'border text-xs px-2.5 py-1',
                      overdue && !item.is_completed
                        ? 'border-rose-300 bg-rose-100 text-rose-800'
                        : today && !item.is_completed
                        ? 'border-amber-300 bg-amber-100 text-amber-800'
                        : 'border-line-default bg-surface-muted text-ink-secondary',
                    ].join(' ')}>
                      {formatDate(dateField)}
                    </Badge>
                  )}
                  <button
                    className="rounded-lg p-1.5 text-ink-muted opacity-60 transition-all group-hover:opacity-100 group-hover:text-brand-600"
                    title="View Details"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleItemClick(item)
                    }}
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkspaceTeamHubPage() {
  const { activeWorkspace, isManager, isPersonal } = useWorkspace()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('overview')
  const [members, setMembers] = useState([])
  const [workspaceDetails, setWorkspaceDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditWorkspace, setShowEditWorkspace] = useState(false)
  const [localWorkspace, setLocalWorkspace] = useState(null)

  const displayWorkspace = localWorkspace || activeWorkspace

  const loadData = useCallback(async () => {
    if (!activeWorkspace?.id || isPersonal) return
    setLoading(true)
    try {
      const [membersData, wsData] = await Promise.allSettled([
        listWorkspaceMembers(activeWorkspace.id),
        getWorkspace(activeWorkspace.id),
      ])
      if (membersData.status === 'fulfilled') setMembers(membersData.value || [])
      if (wsData.status === 'fulfilled') setWorkspaceDetails(wsData.value || null)
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace?.id, isPersonal])

  useEffect(() => { loadData() }, [loadData])

  // If user is in personal workspace, redirect them to workspace hub
  if (isPersonal) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-surface-muted">
          <Building2 className="size-8 text-ink-muted" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink-primary">No Active Team Workspace</h2>
          <p className="mt-2 text-sm text-ink-muted">You're currently in your Personal Area. Switch to a team workspace to see the team hub.</p>
        </div>
        <button className="btn btn-primary mt-2 gap-2" onClick={() => navigate('/workspace-hub')} type="button">
          <Building2 className="size-4" /> Switch Workspace
        </button>
      </div>
    )
  }

  const TABS = [
    { key: 'overview', label: 'Team Directory',      icon: Users    },
    { key: 'tasks',    label: "Today's Tasks",        icon: ListTodo },
    { key: 'leads',    label: 'Important Lead Dates', icon: Calendar },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 shadow-sm">
              <Users className="size-5 text-white" strokeWidth={1.75} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-primary">Workspace & Team</h1>
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            {isManager
              ? 'Manage your team, roles, today\'s tasks, and important lead deadlines.'
              : 'View your team, workspace details, today\'s tasks, and important lead deadlines.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <button
              className="flex items-center gap-1.5 rounded-xl border border-line-default px-3 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-muted"
              onClick={() => setShowEditWorkspace(true)}
              type="button"
            >
              <Pencil className="size-4" /> Edit Workspace
            </button>
          )}
          <button
            className="flex items-center gap-1.5 rounded-xl border border-line-default px-3 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-muted"
            onClick={loadData}
            type="button"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-line-default bg-surface-default p-1.5">
        {TABS.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            icon={tab.icon}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab
            workspace={displayWorkspace}
            workspaceDetails={workspaceDetails}
            members={members}
            loading={loading}
            isManager={isManager}
            userId={user?.id}
            onRefresh={loadData}
            onEditWorkspace={() => setShowEditWorkspace(true)}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksTab
            members={members}
            isManager={isManager}
            userId={user?.id}
          />
        )}
        {activeTab === 'leads' && (
          <LeadDatesTab
            members={members}
            workspaceId={displayWorkspace?.id}
            workspace={displayWorkspace}
          />
        )}
      </div>

      {/* Edit Workspace Modal */}
      {showEditWorkspace && (
        <EditWorkspaceModal
          workspace={displayWorkspace}
          onClose={() => setShowEditWorkspace(false)}
          onSaved={(updates) => setLocalWorkspace((w) => ({ ...(w || displayWorkspace), ...updates }))}
        />
      )}
    </div>
  )
}
