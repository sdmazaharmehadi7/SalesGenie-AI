import { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  Calendar,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from '@/components/ui/icons'
import {
  getFollowUps,
  createFollowUp,
  rescheduleFollowUp,
  completeFollowUp,
  deleteFollowUp,
} from '@/services/api/followUps'
import { useToast } from '@/context/ToastContext'

const STATUS_BADGES = {
  UPCOMING: {
    label: 'Upcoming',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  DUE: {
    label: 'Due Today',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  OVERDUE: {
    label: 'Overdue',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  RESCHEDULED: {
    label: 'Rescheduled',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
}

export default function FollowUpCard({ leadId, opportunityId, onActivityLogged }) {
  const { showToast } = useToast()
  const [activeFollowUp, setActiveFollowUp] = useState(null)
  const [pastFollowUps, setPastFollowUps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [createForm, setCreateForm] = useState({
    title: 'Follow-up',
    notes: '',
    due_date: '',
    priority: 'medium',
  })
  const [rescheduleForm, setRescheduleForm] = useState({
    due_date: '',
    notes: '',
  })

  const loadFollowUps = useCallback(async () => {
    if (!leadId && !opportunityId) return
    setLoading(true)
    try {
      const data = await getFollowUps({
        lead_id: leadId || undefined,
        opportunity_id: opportunityId || undefined,
        page_size: 50,
      })
      const items = data.items || []
      const active = items.find((f) => !f.is_completed) || null
      const past = items.filter((f) => f.is_completed)
      setActiveFollowUp(active)
      setPastFollowUps(past)
    } catch (err) {
      console.error('Failed to load follow-ups:', err)
    } finally {
      setLoading(false)
    }
  }, [leadId, opportunityId])

  useEffect(() => {
    loadFollowUps()
  }, [loadFollowUps])

  const getDefaultDateTime = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    return tomorrow.toISOString().slice(0, 16)
  }

  const handleOpenCreate = () => {
    setCreateForm({
      title: 'Follow-up',
      notes: '',
      due_date: getDefaultDateTime(),
      priority: 'medium',
    })
    setShowCreateModal(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!createForm.due_date) {
      showToast('Please select a valid date and time.', 'error')
      return
    }

    setSubmitting(true)
    try {
      await createFollowUp({
        title: createForm.title.trim() || 'Follow-up',
        notes: createForm.notes.trim() || undefined,
        due_date: new Date(createForm.due_date).toISOString(),
        priority: createForm.priority,
        lead_id: leadId || undefined,
        opportunity_id: opportunityId || undefined,
      })
      showToast('Follow-up scheduled successfully!', 'success')
      setShowCreateModal(false)
      await loadFollowUps()
      if (onActivityLogged) onActivityLogged()
    } catch (err) {
      console.error('Failed to schedule follow-up:', err)
      const msg = err?.response?.data?.detail || 'Failed to schedule follow-up.'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenReschedule = () => {
    if (!activeFollowUp) return
    const curDate = activeFollowUp.due_date ? new Date(activeFollowUp.due_date) : new Date()
    curDate.setDate(curDate.getDate() + 2)
    setRescheduleForm({
      due_date: curDate.toISOString().slice(0, 16),
      notes: '',
    })
    setShowRescheduleModal(true)
  }

  const handleReschedule = async (e) => {
    e.preventDefault()
    if (!rescheduleForm.due_date) {
      showToast('Please select a new date and time.', 'error')
      return
    }

    setSubmitting(true)
    try {
      await rescheduleFollowUp(activeFollowUp.id, {
        due_date: new Date(rescheduleForm.due_date).toISOString(),
        notes: rescheduleForm.notes.trim() || undefined,
      })
      showToast('Follow-up rescheduled successfully!', 'success')
      setShowRescheduleModal(false)
      await loadFollowUps()
      if (onActivityLogged) onActivityLogged()
    } catch (err) {
      console.error('Failed to reschedule follow-up:', err)
      const msg = err?.response?.data?.detail || 'Failed to reschedule follow-up.'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleComplete = async () => {
    if (!activeFollowUp) return
    setSubmitting(true)
    try {
      await completeFollowUp(activeFollowUp.id)
      showToast('Follow-up marked as completed! CRM timeline updated.', 'success')
      await loadFollowUps()
      if (onActivityLogged) onActivityLogged()
      window.dispatchEvent(new Event('sg:activity_updated'))
    } catch (err) {
      console.error('Failed to complete follow-up:', err)
      const msg = err?.response?.data?.detail || 'Failed to complete follow-up.'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this follow-up?')) return
    try {
      await deleteFollowUp(id)
      showToast('Follow-up deleted.', 'info')
      await loadFollowUps()
    } catch (err) {
      console.error('Failed to delete follow-up:', err)
      showToast('Failed to delete follow-up.', 'error')
    }
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getRelativeBadge = (dateStr, status) => {
    if (!dateStr || status === 'COMPLETED') return null
    const target = new Date(dateStr)
    const now = new Date()
    const diffHours = (target - now) / (1000 * 60 * 60)
    const diffDays = Math.round(diffHours / 24)

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays > 1) return `in ${diffDays} days`
    if (diffDays === -1) return 'Yesterday'
    return `${Math.abs(diffDays)} days overdue`
  }

  const badgeInfo = activeFollowUp
    ? STATUS_BADGES[activeFollowUp.status] || STATUS_BADGES.UPCOMING
    : null

  return (
    <div className="rounded-2xl border border-line-default bg-surface-default p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line-default pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
            <Clock className="size-4" />
          </div>
          <h3 className="text-sm font-bold text-ink-primary">Follow-up</h3>
        </div>
        <button
          type="button"
          onClick={loadFollowUps}
          disabled={loading}
          className="rounded-md p-1 text-ink-muted hover:bg-surface-muted hover:text-ink-primary transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <RefreshCw className="size-5 animate-spin text-brand-600" />
          </div>
        ) : activeFollowUp ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Next Action
                </span>
                <p className="text-sm font-semibold text-ink-primary mt-0.5">
                  {activeFollowUp.title || 'Scheduled Follow-up'}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
                  badgeInfo.className
                }`}
              >
                {badgeInfo.label}
              </span>
            </div>

            <div className="rounded-xl bg-surface-subtle p-3 border border-line-default space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted font-medium flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-brand-600" />
                  Date & Time:
                </span>
                <span className="font-semibold text-ink-primary">
                  {formatDateTime(activeFollowUp.due_date)}
                </span>
              </div>

              {getRelativeBadge(activeFollowUp.due_date, activeFollowUp.status) && (
                <div className="flex justify-end">
                  <span className="text-[11px] font-medium text-ink-secondary bg-surface-default px-2 py-0.5 rounded border border-line-default">
                    {getRelativeBadge(activeFollowUp.due_date, activeFollowUp.status)}
                  </span>
                </div>
              )}

              {activeFollowUp.notes && (
                <div className="border-t border-line-default pt-2 text-xs">
                  <span className="text-ink-muted font-medium block mb-1">Notes:</span>
                  <p className="text-ink-secondary whitespace-pre-wrap leading-relaxed">
                    {activeFollowUp.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="size-3.5" />
                Complete
              </button>
              <button
                type="button"
                onClick={handleOpenReschedule}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs font-semibold text-ink-primary shadow-2xs hover:bg-surface-muted disabled:opacity-50 transition-colors"
              >
                <Calendar className="size-3.5" />
                Reschedule
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-ink-muted mb-3">No active follow-up scheduled.</p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-700 transition-colors"
            >
              <Plus className="size-3.5" />
              Schedule Follow-up
            </button>
          </div>
        )}

        {/* History Toggle */}
        {pastFollowUps.length > 0 && (
          <div className="mt-4 border-t border-line-default pt-3">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex w-full items-center justify-between text-xs font-semibold text-ink-muted hover:text-ink-primary"
            >
              <span>Past Follow-ups ({pastFollowUps.length})</span>
              {showHistory ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            {showHistory && (
              <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto pr-1">
                {pastFollowUps.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-line-default bg-surface-subtle/50 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-primary">{item.title}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        Completed
                      </span>
                    </div>
                    {item.completed_at && (
                      <p className="text-[11px] text-ink-muted mt-1">
                        Completed: {formatDateTime(item.completed_at)}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-ink-secondary mt-1 line-clamp-2">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line-default bg-surface-default p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-primary">Schedule Follow-up</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-ink-muted block mb-1">
                  Follow-up Title / Reason
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Call regarding demo feedback"
                  className="w-full rounded-lg border border-line-default bg-surface-subtle px-3 py-2 text-ink-primary focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-ink-muted block mb-1">
                  Follow-up Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                  className="w-full rounded-lg border border-line-default bg-surface-subtle px-3 py-2 text-ink-primary focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-ink-muted block mb-1">
                  Priority
                </label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                  className="w-full rounded-lg border border-line-default bg-surface-subtle px-3 py-2 text-ink-primary focus:border-brand-500 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink-muted block mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Key talking points, agenda, or reminders..."
                  className="w-full rounded-lg border border-line-default bg-surface-subtle p-2.5 text-ink-primary focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line-default">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-line-default px-3 py-1.5 font-semibold text-ink-secondary hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 font-semibold text-white shadow-2xs hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line-default bg-surface-default p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-primary">Reschedule Follow-up</h3>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleReschedule} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-ink-muted block mb-1">
                  New Follow-up Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleForm.due_date}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, due_date: e.target.value })}
                  className="w-full rounded-lg border border-line-default bg-surface-subtle px-3 py-2 text-ink-primary focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-ink-muted block mb-1">
                  Reschedule Reason / Updated Notes
                </label>
                <textarea
                  value={rescheduleForm.notes}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, notes: e.target.value })}
                  rows={3}
                  placeholder="e.g. Lead requested to postpone call to next week..."
                  className="w-full rounded-lg border border-line-default bg-surface-subtle p-2.5 text-ink-primary focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line-default">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="rounded-lg border border-line-default px-3 py-1.5 font-semibold text-ink-secondary hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 font-semibold text-white shadow-2xs hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
