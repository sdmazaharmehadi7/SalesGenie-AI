import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageSquare,
  Building2,
  ArrowUpRight,
  Plus,
  X,
  Loader2,
  Flame,
  ShieldAlert,
  Target,
  Check,
} from '@/components/ui/icons'
import { completeFollowUp, createFollowUp } from '@/services/api/followUps'
import { logActivity } from '@/services/api/activities'
import { useToast } from '@/context/ToastContext'

const URGENCY_CONFIG = {
  urgent: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    dot: 'bg-rose-500 animate-pulse',
    cardBorder: 'border-rose-200/80 hover:border-rose-300 dark:border-rose-500/20 dark:hover:border-rose-500/40',
    label: 'Urgent Priority',
  },
  high: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    dot: 'bg-amber-500',
    cardBorder: 'border-amber-200/80 hover:border-amber-300 dark:border-amber-500/20 dark:hover:border-amber-500/40',
    label: 'High Priority',
  },
  medium: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    dot: 'bg-blue-500',
    cardBorder: 'border-blue-200/80 hover:border-blue-300 dark:border-blue-500/20 dark:hover:border-blue-500/40',
    label: 'Medium Priority',
  },
  normal: {
    badge: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
    dot: 'bg-slate-400',
    cardBorder: 'border-line-default hover:border-brand-300 dark:border-line-default',
    label: 'Routine',
  },
}

const STAGE_COLORS = {
  new: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400',
  qualified: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400',
  proposal: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400',
  negotiation: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400',
  closed_won: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400',
  closed_lost: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400',
}

export default function AutomatedFollowUpsSection({
  recommendations = [],
  onRefresh,
}) {
  const { showToast } = useToast()
  const [filter, setFilter] = useState('all') // 'all', 'urgent', 'status_change', 'overdue', 'stale'
  const [completingId, setCompletingId] = useState(null)

  // Follow-up scheduling modal state
  const [scheduleModalLead, setScheduleModalLead] = useState(null)
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    due_date: '',
    priority: 'high',
    notes: '',
  })

  // Quick activity log modal state
  const [activityModalLead, setActivityModalLead] = useState(null)
  const [activitySubmitting, setActivitySubmitting] = useState(false)
  const [activityForm, setActivityForm] = useState({
    interaction_type: 'call',
    summary: '',
    notes: '',
  })

  // Filter recommendations
  const filteredRecs = recommendations.filter((rec) => {
    if (filter === 'urgent') return rec.urgency === 'urgent' || rec.urgency === 'high'
    if (filter === 'status_change') return rec.trigger_type === 'status_change'
    if (filter === 'overdue') return rec.trigger_type === 'overdue_followup'
    if (filter === 'stale') return rec.trigger_type === 'stale_lead' || rec.trigger_type === 'new_uncontacted'
    return true
  })

  // Counters
  const urgentCount = recommendations.filter((r) => r.urgency === 'urgent').length
  const highCount = recommendations.filter((r) => r.urgency === 'high').length
  const statusChangeCount = recommendations.filter((r) => r.trigger_type === 'status_change').length
  const staleCount = recommendations.filter(
    (r) => r.trigger_type === 'stale_lead' || r.trigger_type === 'new_uncontacted'
  ).length

  // Handle one-click completion of an overdue follow-up
  const handleCompleteFollowUp = async (rec) => {
    if (!rec.existing_follow_up_id) return
    setCompletingId(rec.id)
    try {
      await completeFollowUp(rec.existing_follow_up_id)
      showToast('Follow-up marked completed! Activity logged in CRM timeline.', 'success')
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to complete follow-up:', err)
      showToast('Failed to complete follow-up. Please try again.', 'error')
    } finally {
      setCompletingId(null)
    }
  }

  // Open schedule follow-up modal pre-filled
  const handleOpenScheduleModal = (rec) => {
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 1)
    defaultDate.setHours(11, 0, 0, 0)
    const formattedDate = defaultDate.toISOString().slice(0, 16)

    setScheduleForm({
      title: rec.title.startsWith('Overdue') ? `Follow-up: ${rec.company_name}` : rec.title,
      due_date: formattedDate,
      priority: rec.urgency === 'urgent' || rec.urgency === 'high' ? 'high' : 'medium',
      notes: `Automated next step for ${rec.company_name} (${rec.lead_status}): ${rec.reason}`,
    })
    setScheduleModalLead(rec)
  }

  // Submit schedule follow-up
  const handleSubmitSchedule = async (e) => {
    e.preventDefault()
    if (!scheduleModalLead || !scheduleForm.due_date) return
    setScheduleSubmitting(true)
    try {
      await createFollowUp({
        lead_id: scheduleModalLead.lead_id,
        title: scheduleForm.title.trim() || 'Follow-up',
        due_date: new Date(scheduleForm.due_date).toISOString(),
        priority: scheduleForm.priority,
        notes: scheduleForm.notes.trim() || undefined,
      })
      showToast('Follow-up scheduled successfully!', 'success')
      setScheduleModalLead(null)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to schedule follow-up:', err)
      showToast(err.response?.data?.detail || 'Failed to schedule follow-up.', 'error')
    } finally {
      setScheduleSubmitting(false)
    }
  }

  // Open quick touchpoint modal
  const handleOpenActivityModal = (rec, initialType = 'call') => {
    setActivityForm({
      interaction_type: initialType,
      summary: `${initialType === 'call' ? 'Call' : 'Meeting'} with ${rec.lead_name} (${rec.company_name})`,
      notes: `Follow-up on ${rec.lead_status} stage and next steps.`,
    })
    setActivityModalLead(rec)
  }

  // Submit quick activity
  const handleSubmitActivity = async (e) => {
    e.preventDefault()
    if (!activityModalLead || !activityForm.summary) return
    setActivitySubmitting(true)
    try {
      await logActivity({
        lead_id: activityModalLead.lead_id,
        interaction_type: activityForm.interaction_type,
        summary: activityForm.summary.trim(),
        notes: activityForm.notes.trim() || undefined,
      })
      showToast('Touchpoint logged to CRM timeline!', 'success')
      setActivityModalLead(null)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to log activity:', err)
      showToast('Failed to log activity. Please try again.', 'error')
    } finally {
      setActivitySubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {urgentCount > 0 && (
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 animate-pulse dark:bg-rose-500/20 dark:text-rose-400">
                <Flame className="size-3" />
                {urgentCount} Urgent
              </span>
            </div>
          )}
          <h2 className="text-lg font-bold tracking-tight text-ink-primary sm:text-xl">
            Automated Follow-up Recommendations & Next Steps
          </h2>
          <p className="mt-0.5 text-xs text-ink-secondary">
            Triggered automatically by lead state transitions, overdue follow-up dates, and CRM activity velocity.
          </p>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line-default bg-surface-subtle p-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-surface-default font-semibold text-ink-primary shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            All ({recommendations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('urgent')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              filter === 'urgent'
                ? 'bg-rose-50 text-rose-700 font-semibold shadow-xs dark:bg-rose-500/20 dark:text-rose-300'
                : 'text-ink-secondary hover:text-rose-600'
            }`}
          >
            Urgent & High ({urgentCount + highCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('status_change')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              filter === 'status_change'
                ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs dark:bg-brand-500/20 dark:text-brand-300'
                : 'text-ink-secondary hover:text-brand-600'
            }`}
          >
            Stage Shifts ({statusChangeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('overdue')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              filter === 'overdue'
                ? 'bg-rose-50 text-rose-700 font-semibold shadow-xs dark:bg-rose-500/20 dark:text-rose-300'
                : 'text-ink-secondary hover:text-rose-600'
            }`}
          >
            Overdue ({urgentCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('stale')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              filter === 'stale'
                ? 'bg-amber-50 text-amber-700 font-semibold shadow-xs dark:bg-amber-500/20 dark:text-amber-300'
                : 'text-ink-secondary hover:text-amber-600'
            }`}
          >
            Stale Touchpoints ({staleCount})
          </button>
        </div>
      </div>

      {/* Cards List */}
      {filteredRecs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-default bg-surface-subtle/50 py-12 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="size-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-ink-primary">All Follow-ups & Next Steps Handled!</h3>
          <p className="mt-1 text-xs text-ink-secondary max-w-md mx-auto">
            No pending automated follow-ups found for this filter. Lead transitions and overdue tasks will automatically surface here when actionable.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {filteredRecs.map((rec) => {
            const urgencyCfg = URGENCY_CONFIG[rec.urgency] || URGENCY_CONFIG.normal
            const stageBadgeClass = STAGE_COLORS[rec.lead_status] || STAGE_COLORS.new
            const isCompleting = completingId === rec.id

            return (
              <div
                key={rec.id}
                className={`group flex flex-col justify-between rounded-xl border bg-surface-default p-4 shadow-2xs transition-all hover:shadow-md ${urgencyCfg.cardBorder}`}
              >
                <div>
                  {/* Top Badges Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${urgencyCfg.badge}`}
                      >
                        <span className={`size-1.5 rounded-full ${urgencyCfg.dot}`} />
                        {urgencyCfg.label}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${stageBadgeClass}`}
                      >
                        {rec.lead_status.replace('_', ' ')}
                      </span>
                    </div>

                    {rec.deal_value && (
                      <span className="text-xs font-bold text-ink-primary">
                        ${Number(rec.deal_value).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>

                  {/* Lead & Company Name */}
                  <div className="mt-3">
                    <Link
                      to={`/leads/${rec.lead_id}`}
                      className="group/link flex items-center gap-1 text-sm font-bold text-ink-primary hover:text-brand-600 transition-colors"
                    >
                      <span>{rec.company_name}</span>
                      <ArrowUpRight className="size-3.5 opacity-40 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-all text-brand-600" />
                    </Link>
                    {rec.lead_name && rec.lead_name !== rec.company_name && (
                      <p className="text-[11px] text-ink-muted">Contact: {rec.lead_name}</p>
                    )}
                  </div>

                  {/* Recommendation Title */}
                  <h4 className="mt-2.5 text-xs font-semibold text-ink-primary flex items-center gap-1.5">
                    {rec.trigger_type === 'overdue_followup' ? (
                      <AlertCircle className="size-3.5 shrink-0 text-rose-500" />
                    ) : (
                      <Target className="size-3.5 shrink-0 text-brand-600" />
                    )}
                    {rec.title}
                  </h4>

                  {/* Context Reason */}
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
                    {rec.reason}
                  </p>

                  {/* Recency info badge */}
                  <div className="mt-3 flex items-center gap-3 text-[10px] text-ink-muted border-t border-line-subtle pt-2.5">
                    <div className="flex items-center gap-1">
                      <Clock className="size-3 text-ink-muted" />
                      <span>In state: {rec.days_in_current_state}d</span>
                    </div>
                    {rec.last_interaction_date && (
                      <div className="flex items-center gap-1">
                        <span>Last touch: {new Date(rec.last_interaction_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        {rec.last_interaction_type && (
                          <span className="capitalize">({rec.last_interaction_type})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-4 flex items-center gap-2 border-t border-line-subtle pt-3">
                  {rec.trigger_type === 'overdue_followup' ? (
                    <button
                      type="button"
                      disabled={isCompleting}
                      onClick={() => handleCompleteFollowUp(rec)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {isCompleting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      Mark Completed
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenScheduleModal(rec)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-700 transition-colors"
                    >
                      <Calendar className="size-3.5" />
                      {rec.action_label || 'Schedule Next Step'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenActivityModal(rec, 'call')}
                    title="Log Touchpoint"
                    className="grid size-8 place-items-center rounded-lg border border-line-default bg-surface-default text-ink-secondary hover:bg-surface-muted hover:text-brand-600 transition-colors shadow-2xs"
                  >
                    <Phone className="size-3.5" />
                  </button>

                  <Link
                    to={`/leads/${rec.lead_id}`}
                    title="View Lead CRM Record"
                    className="grid size-8 place-items-center rounded-lg border border-line-default bg-surface-default text-ink-secondary hover:bg-surface-muted hover:text-ink-primary transition-colors shadow-2xs"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {scheduleModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line-default bg-surface-default p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-line-default">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/20">
                  <Calendar className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-primary">Schedule Follow-up</h3>
                  <p className="text-[11px] text-ink-muted">{scheduleModalLead.company_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalLead(null)}
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSchedule} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-primary">Follow-up Title</label>
                <input
                  type="text"
                  required
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  placeholder="e.g. Call Alice to review proposal"
                  className="mt-1 w-full rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary shadow-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-primary">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleForm.due_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, due_date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary shadow-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-primary">Priority</label>
                  <select
                    value={scheduleForm.priority}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, priority: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary shadow-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-primary">Context & Notes</label>
                <textarea
                  rows={2}
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  placeholder="Notes about agenda or previous conversations..."
                  className="mt-1 w-full rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary shadow-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line-default">
                <button
                  type="button"
                  onClick={() => setScheduleModalLead(null)}
                  className="rounded-lg border border-line-default px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:bg-surface-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {scheduleSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Calendar className="size-3.5" />}
                  Schedule Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Activity Modal */}
      {activityModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line-default bg-surface-default p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-line-default">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/20">
                  <Phone className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-primary">Log CRM Touchpoint</h3>
                  <p className="text-[11px] text-ink-muted">{activityModalLead.company_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivityModalLead(null)}
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitActivity} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-primary">Interaction Type</label>
                <div className="mt-1.5 flex gap-2">
                  {['call', 'meeting', 'note'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActivityForm({ ...activityForm, interaction_type: type })}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold capitalize transition-all ${
                        activityForm.interaction_type === type
                          ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                          : 'border-line-default bg-surface-default text-ink-secondary hover:bg-surface-muted'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-primary">Summary</label>
                <input
                  type="text"
                  required
                  value={activityForm.summary}
                  onChange={(e) => setActivityForm({ ...activityForm, summary: e.target.value })}
                  placeholder="e.g. Call with prospect regarding pricing"
                  className="mt-1 w-full rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary shadow-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-primary">Detailed Notes</label>
                <textarea
                  rows={2}
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                  placeholder="Next steps, objections raised, decision timeline..."
                  className="mt-1 w-full rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary shadow-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line-default">
                <button
                  type="button"
                  onClick={() => setActivityModalLead(null)}
                  className="rounded-lg border border-line-default px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:bg-surface-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activitySubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {activitySubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Log Touchpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
