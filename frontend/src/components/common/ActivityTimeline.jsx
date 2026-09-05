import { useState, useEffect } from 'react'
import { 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Clock, 
  Plus, 
  Activity as ActivityIcon,
  RefreshCw,
  TrendingUp,
  MessageSquare
} from '@/components/ui/icons'
import { getActivities, logActivity } from '@/services/api/activities'

const INTERACTION_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  demo: Calendar,
  note: FileText,
  follow_up: Clock,
  stage_change: TrendingUp,
  other: MessageSquare,
}

const INTERACTION_COLORS = {
  call: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  email: 'bg-blue-50 text-blue-600 border-blue-200',
  meeting: 'bg-purple-50 text-purple-600 border-purple-200',
  demo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  note: 'bg-amber-50 text-amber-600 border-amber-200',
  follow_up: 'bg-orange-50 text-orange-600 border-orange-200',
  stage_change: 'bg-brand-50 text-brand-600 border-brand-200',
  other: 'bg-slate-50 text-slate-600 border-slate-200',
}

export default function ActivityTimeline({ leadId, contactId, accountId, opportunityId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    interaction_type: 'call',
    summary: '',
    action_items_text: '',
  })

  const loadTimeline = async () => {
    setLoading(true)
    try {
      const data = await getActivities({
        lead_id: leadId,
        contact_id: contactId,
        account_id: accountId,
        opportunity_id: opportunityId,
        limit: 50,
      })
      setActivities(data || [])
    } catch (err) {
      console.error('Failed to load activity timeline:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTimeline()
  }, [leadId, contactId, accountId, opportunityId])

  const handleCreateActivity = async (e) => {
    e.preventDefault()
    if (!form.summary.trim()) return

    setSubmitting(true)
    try {
      const actionItems = form.action_items_text
        ? form.action_items_text.split('\n').map((s) => s.trim()).filter(Boolean)
        : []

      await logActivity({
        interaction_type: form.interaction_type,
        summary: form.summary,
        action_items: actionItems,
        lead_id: leadId || undefined,
        contact_id: contactId || undefined,
        account_id: accountId || undefined,
        opportunity_id: opportunityId || undefined,
      })

      setForm({ interaction_type: 'call', summary: '', action_items_text: '' })
      setShowLogModal(false)
      await loadTimeline()
    } catch (err) {
      console.error('Failed to log activity:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="rounded-xl border border-line-default bg-surface-default p-5 shadow-xs">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <ActivityIcon className="size-4" />
          </div>
          <h3 className="text-base font-semibold text-ink-primary">Activity Timeline</h3>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted">
            {activities.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadTimeline}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink-primary transition-colors"
            title="Refresh Timeline"
          >
            <RefreshCw className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition-colors"
          >
            <Plus className="size-3.5" />
            Log Activity
          </button>
        </div>
      </div>

      {showLogModal && (
        <form onSubmit={handleCreateActivity} className="mb-6 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900">New Activity Log</h4>
            <button
              type="button"
              onClick={() => setShowLogModal(false)}
              className="text-xs text-ink-muted hover:text-ink-primary"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Activity Type</label>
              <select
                value={form.interaction_type}
                onChange={(e) => setForm({ ...form, interaction_type: e.target.value })}
                className="w-full rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="demo">Demo</option>
                <option value="note">Note</option>
                <option value="follow_up">Follow-Up</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Summary & Discussion</label>
              <input
                type="text"
                required
                placeholder="e.g. Discussed pricing model and agreed to send proposal"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                className="w-full rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Action Items / Next Steps (one per line)
            </label>
            <textarea
              rows={2}
              placeholder="Send slide deck by tomorrow&#10;Follow up with CFO on Friday"
              value={form.action_items_text}
              onChange={(e) => setForm({ ...form, action_items_text: e.target.value })}
              className="w-full rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLogModal(false)}
              className="rounded-lg border border-line-default px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Activity'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="size-5 animate-spin text-ink-muted" />
        </div>
      ) : activities.length === 0 ? (
        <div className="py-10 text-center text-xs text-ink-muted">
          No activities logged yet. Click "Log Activity" to start tracking touches.
        </div>
      ) : (
        <div className="relative pl-6 before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-0.5 before:bg-line-default">
          <div className="space-y-6">
            {activities.map((item) => {
              const isEmailReply =
                item.summary?.includes('Customer Replied') ||
                item.summary?.includes('Customer replied') ||
                item.action_items?.some((a) => a?.type === 'gmail_customer_reply')

              const isEmailSent =
                item.summary?.includes('Email Sent') ||
                item.summary?.includes('Outreach email sent') ||
                item.action_items?.some((a) => a?.type === 'gmail_email_sent')

              let badgeLabel = item.interaction_type.replace('_', ' ')
              let badgeColor = 'bg-slate-100 text-slate-700'
              let colorClass = INTERACTION_COLORS[item.interaction_type] || 'bg-slate-50 text-slate-600 border-slate-200'
              let Icon = INTERACTION_ICONS[item.interaction_type] || MessageSquare

              if (isEmailReply) {
                badgeLabel = '↩️ Customer Replied'
                badgeColor = 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-300'
                Icon = Mail
              } else if (isEmailSent) {
                badgeLabel = '✉️ Email Sent'
                badgeColor = 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                colorClass = 'bg-blue-50 text-blue-600 border-blue-300'
                Icon = Mail
              }

              // Extract text action items (filtering out internal metadata dicts)
              const displayActionItems = (item.action_items || [])
                .map((a) => (typeof a === 'string' ? a : (a?.text || null)))
                .filter(Boolean)

              // Check if opened
              const openMeta = (item.action_items || []).find((a) => a?.type === 'gmail_email_sent' && a?.opened_at)

              return (
                <div key={item.id} className="relative group">
                  <div
                    className={`absolute -left-6 top-0.5 flex size-5 items-center justify-center rounded-full border ${colorClass}`}
                  >
                    <Icon className="size-3" />
                  </div>
                  <div className={`rounded-lg border border-line-default p-3.5 transition-all hover:bg-surface-default hover:shadow-xs ${
                    isEmailReply ? 'bg-emerald-50/20 border-emerald-100' : 'bg-surface-subtle'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {badgeLabel}
                      </span>
                      <div className="flex items-center gap-2">
                        {openMeta && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ring-1 ring-emerald-100">
                            ✓ Opened
                          </span>
                        )}
                        <span className="text-[11px] text-ink-muted">
                          {formatDate(item.interaction_date)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-medium text-ink-primary">
                      {item.summary || 'No summary provided.'}
                    </p>
                    {displayActionItems.length > 0 && (
                      <div className="mt-2.5 rounded-md bg-surface-default p-2 border border-line-subtle">
                        <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Action Items:</span>
                        <ul className="mt-1 space-y-1">
                          {displayActionItems.map((action, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-ink-secondary">
                              <span className="size-1.5 rounded-full bg-brand-500" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
