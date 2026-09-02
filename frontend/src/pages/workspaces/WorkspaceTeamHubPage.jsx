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
function LeadDatesTab({ members }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('followup') // followup | closing

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getLeads({ page_size: 100 })
      setLeads(data?.items || data || [])
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])

  const memberMap = useMemo(() => {
    const m = {}
    members.forEach((mem) => { m[mem.user_id] = mem.user_name || mem.user_email })
    return m
  }, [members])

  // Follow-up dates: leads with follow_up_date in the next 14 days or overdue
  const followUpLeads = useMemo(() => {
    const now = new Date()
    const twoWeeks = new Date(); twoWeeks.setDate(now.getDate() + 14)
    return leads
      .filter((l) => l.follow_up_date && new Date(l.follow_up_date) <= twoWeeks && !(l.lead_status === 'closed_won' || l.lead_status === 'closed_lost'))
      .sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date))
  }, [leads])

  // Closing opportunities: leads with expected_close_date in next 30 days
  const closingLeads = useMemo(() => {
    const now = new Date()
    const thirtyDays = new Date(); thirtyDays.setDate(now.getDate() + 30)
    return leads
      .filter((l) => l.expected_close_date && new Date(l.expected_close_date) >= now && new Date(l.expected_close_date) <= thirtyDays)
      .sort((a, b) => new Date(a.expected_close_date) - new Date(b.expected_close_date))
  }, [leads])

  const displayLeads = view === 'followup' ? followUpLeads : closingLeads

  return (
    <div className="space-y-5">
      {/* View Toggle */}
      <div className="flex flex-wrap gap-2">
        <button
          className={['flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all', view === 'followup' ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30' : 'text-ink-secondary hover:bg-surface-muted'].join(' ')}
          onClick={() => setView('followup')}
          type="button"
        >
          <Clock className="size-4" /> Follow-Up Deadlines
          {followUpLeads.length > 0 && (
            <span className={['rounded-full px-1.5 py-0.5 text-[10px] font-bold', view === 'followup' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'].join(' ')}>
              {followUpLeads.length}
            </span>
          )}
        </button>
        <button
          className={['flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all', view === 'closing' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' : 'text-ink-secondary hover:bg-surface-muted'].join(' ')}
          onClick={() => setView('closing')}
          type="button"
        >
          <TrendingUp className="size-4" /> Closing This Month
          {closingLeads.length > 0 && (
            <span className={['rounded-full px-1.5 py-0.5 text-[10px] font-bold', view === 'closing' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-700'].join(' ')}>
              {closingLeads.length}
            </span>
          )}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Follow-Ups Due', value: followUpLeads.length, icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Overdue Follow-Ups', value: followUpLeads.filter((l) => isOverdue(l.follow_up_date)).length, icon: AlertCircle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
          { label: 'Closing This Month', value: closingLeads.length, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          { label: 'Total Pipeline', value: leads.filter((l) => l.lead_status !== 'closed_won' && l.lead_status !== 'closed_lost').length, icon: Target, color: 'text-brand-600 bg-brand-50 border-brand-200' },
        ].map((stat) => (
          <div key={stat.label} className={`flex items-center gap-3 rounded-xl border p-3 ${stat.color}`}>
            <stat.icon className="size-5 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs font-medium opacity-75">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lead Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-muted" />)}
        </div>
      ) : displayLeads.length === 0 ? (
        <EmptyState
          icon={view === 'followup' ? Clock : TrendingUp}
          title={view === 'followup' ? 'No upcoming follow-ups' : 'No deals closing this month'}
          description={view === 'followup' ? 'All follow-up dates are on track or not set.' : 'No opportunities have an expected close date in the next 30 days.'}
        />
      ) : (
        <div className="space-y-3">
          {displayLeads.map((lead) => {
            const dateField = view === 'followup' ? lead.follow_up_date : lead.expected_close_date
            const statusCfg = LEAD_STATUS_CONFIG[lead.lead_status] || { label: lead.lead_status || 'Unknown', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
            const ownerName = lead.assigned_to_user_id ? (memberMap[lead.assigned_to_user_id] || 'Unassigned') : 'Unassigned'
            const overdue = isOverdue(dateField)
            const today = isToday(dateField)

            return (
              <div
                key={lead.id}
                className={[
                  'flex flex-col gap-3 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center',
                  overdue ? 'border-rose-200 bg-rose-50/50 shadow-sm' : today ? 'border-amber-200 bg-amber-50/50 shadow-sm' : 'border-line-default bg-surface-default shadow-xs hover:shadow-sm',
                ].join(' ')}
              >
                <div className={[
                  'grid size-10 shrink-0 place-items-center rounded-xl',
                  overdue ? 'bg-rose-100' : today ? 'bg-amber-100' : 'bg-surface-muted',
                ].join(' ')}>
                  {view === 'followup'
                    ? <Clock className={`size-5 ${overdue ? 'text-rose-600' : today ? 'text-amber-600' : 'text-ink-muted'}`} strokeWidth={1.75} />
                    : <TrendingUp className="size-5 text-emerald-600" strokeWidth={1.75} />
                  }
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink-primary">{lead.company_name || lead.contact_name || 'Unknown Lead'}</p>
                    <Badge className={`border ${statusCfg.cls}`}>{statusCfg.label}</Badge>
                    {overdue && <Badge className="border-rose-300 bg-rose-100 text-rose-700"><AlertCircle className="mr-1 size-3" />Overdue</Badge>}
                    {today && !overdue && <Badge className="border-amber-300 bg-amber-100 text-amber-800"><Zap className="mr-1 size-3" />Due Today</Badge>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    <span className="flex items-center gap-1"><Calendar className="size-3" />{formatRelative(dateField)}</span>
                    <span className="flex items-center gap-1"><User className="size-3" />{ownerName}</span>
                    {lead.deal_value && (
                      <span className="flex items-center gap-1 font-medium text-emerald-700">
                        <TrendingUp className="size-3" />
                        ${Number(lead.deal_value).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <Badge className={[
                    'border text-xs',
                    overdue ? 'border-rose-300 bg-rose-100 text-rose-800' : today ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-line-default bg-surface-muted text-ink-secondary',
                  ].join(' ')}>
                    {formatDate(dateField)}
                  </Badge>
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
          <LeadDatesTab members={members} />
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
