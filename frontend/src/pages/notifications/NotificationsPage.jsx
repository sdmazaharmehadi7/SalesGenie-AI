import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Flame,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from '@/components/ui/icons'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useWorkspaceKey } from '@/hooks/useWorkspaceKey'
import {
  clearAllReadNotifications,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/api/notifications'

const TYPE_CONFIG = {
  TASK_OVERDUE: {
    icon: AlertTriangle,
    color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-400',
    label: 'Task Overdue',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
  },
  TASK_RESCHEDULED: {
    icon: Clock,
    color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-400',
    label: 'Task Rescheduled',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  },
  LEAD_STATE_CHANGED: {
    icon: Flame,
    color: 'text-brand-600 bg-brand-50 border-brand-200 dark:bg-brand-950/50 dark:border-brand-800 dark:text-brand-400',
    label: 'Lead State Changed',
    badge: 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200',
  },
  DEAL_STATE_CHANGED: {
    icon: Briefcase,
    color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:border-purple-800 dark:text-purple-400',
    label: 'Deal State Changed',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
  },
  LEAD_ASSIGNED: {
    icon: User,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-400',
    label: 'Lead Assigned',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
  },
  FOLLOWUP_APPROACHING: {
    icon: Clock,
    color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-400',
    label: 'Upcoming Follow-up',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
  },
  FOLLOWUP_OVERDUE: {
    icon: AlertCircle,
    color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-400',
    label: 'Follow-up Overdue',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
  },
  MEETING_SCHEDULED: {
    icon: Calendar,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400',
    label: 'Meeting Scheduled',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  },
  MEETING_REMINDER: {
    icon: Clock,
    color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:border-purple-800 dark:text-purple-400',
    label: 'Meeting Reminder',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
  },
  lead_assigned: {
    icon: User,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-400',
    label: 'Lead Assigned',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
  },
  lead_status_changed: {
    icon: Flame,
    color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-400',
    label: 'Status Change',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  },
  email_opened: {
    icon: Mail,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400',
    label: 'Email Opened',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  },
  email_replied: {
    icon: Mail,
    color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-400',
    label: 'Email Reply',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
  },
  weekly_digest: {
    icon: CheckCircle2,
    color: 'text-teal-600 bg-teal-50 border-teal-200 dark:bg-teal-950/50 dark:border-teal-800 dark:text-teal-400',
    label: 'Weekly Digest',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
  },
  ai_insights: {
    icon: Sparkles,
    color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-400',
    label: 'AI Insight',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
  },
  team_mentions: {
    icon: Users,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200 dark:bg-cyan-950/50 dark:border-cyan-800 dark:text-cyan-400',
    label: 'Team Mention',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200',
  },
  workspace_invitation: {
    icon: Mail,
    color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-400',
    label: 'Workspace Invitation',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  },
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffSec = Math.floor((now - date) / 1000)

  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function formatExactDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const { activeWorkspace, isPersonal } = useWorkspace()
  const { workspaceKey } = useWorkspaceKey()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'unread' | 'read'
  const [searchQuery, setSearchQuery] = useState('')
  const [actionInProgressId, setActionInProgressId] = useState(null)
  const [feedbackMessage, setFeedbackMessage] = useState(null)

  const showFeedback = (msg, type = 'success') => {
    setFeedbackMessage({ text: msg, type })
    setTimeout(() => setFeedbackMessage(null), 3500)
  }

  const loadNotifications = useCallback(
    async (showLoadingSpinner = true) => {
      if (!user) return
      if (showLoadingSpinner) setLoading(true)
      else setRefreshing(true)

      try {
        const isReadParam =
          activeTab === 'unread' ? false : activeTab === 'read' ? true : undefined

        const [notifData, countData] = await Promise.all([
          getNotifications({ page: 1, page_size: 100, is_read: isReadParam }),
          getUnreadCount(),
        ])

        setNotifications(notifData.items || [])
        setTotalCount(notifData.total || (notifData.items ? notifData.items.length : 0))
        setUnreadCount(countData.unread_count || 0)
      } catch (err) {
        console.error('Failed to load notifications:', err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [user, activeTab, workspaceKey]
  )

  useEffect(() => {
    loadNotifications(true)
  }, [loadNotifications])

  // Listen for global notification updates and periodic sync
  useEffect(() => {
    const handleUpdate = () => loadNotifications(false)
    window.addEventListener('sg:notifications_updated', handleUpdate)
    window.addEventListener('focus', handleUpdate)
    return () => {
      window.removeEventListener('sg:notifications_updated', handleUpdate)
      window.removeEventListener('focus', handleUpdate)
    }
  }, [loadNotifications])

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Tab filter (if already queried or in-memory)
      if (activeTab === 'unread' && notif.is_read) return false
      if (activeTab === 'read' && !notif.is_read) return false

      // Search filter across title, message, sender, entity
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const titleMatch = notif.title?.toLowerCase().includes(query)
        const msgMatch = notif.message?.toLowerCase().includes(query)
        const typeMatch = notif.type?.toLowerCase().includes(query)
        const senderMatch = notif.data?.sender?.toLowerCase().includes(query)
        const leadMatch = notif.data?.lead_name?.toLowerCase().includes(query)
        return titleMatch || msgMatch || typeMatch || senderMatch || leadMatch
      }
      return true
    })
  }, [notifications, activeTab, searchQuery])

  // Mark single as read
  const handleMarkAsRead = async (notif, e) => {
    if (e) e.stopPropagation()
    if (notif.is_read) return

    setActionInProgressId(notif.id)
    try {
      await markNotificationAsRead(notif.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      window.dispatchEvent(new Event('sg:notifications_updated'))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      showFeedback('Failed to update notification', 'error')
    } finally {
      setActionInProgressId(null)
    }
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
      window.dispatchEvent(new Event('sg:notifications_updated'))
      showFeedback('All notifications marked as read')
    } catch (err) {
      console.error('Failed to mark all as read:', err)
      showFeedback('Failed to mark all as read', 'error')
    }
  }

  // Delete single notification
  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation()
    setActionInProgressId(id)

    // Store previous state for rollback if needed
    const prevNotifs = notifications
    const target = notifications.find((n) => n.id === id)

    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (target && !target.is_read) {
      setUnreadCount((c) => Math.max(0, c - 1))
    }

    try {
      await deleteNotification(id)
      window.dispatchEvent(new Event('sg:notifications_updated'))
      showFeedback('Notification deleted')
    } catch (err) {
      console.error('Failed to delete notification:', err)
      setNotifications(prevNotifs)
      showFeedback('Failed to delete notification', 'error')
    } finally {
      setActionInProgressId(null)
    }
  }

  // Clear all read notifications
  const handleClearAllRead = async () => {
    const hasRead = notifications.some((n) => n.is_read)
    if (!hasRead) {
      showFeedback('No read notifications to clear', 'info')
      return
    }

    const prevNotifs = notifications
    setNotifications((prev) => prev.filter((n) => !n.is_read))

    try {
      const res = await clearAllReadNotifications()
      window.dispatchEvent(new Event('sg:notifications_updated'))
      showFeedback(`Cleared ${res.cleared_count ?? 'read'} notification(s)`)
    } catch (err) {
      console.error('Failed to clear read notifications:', err)
      setNotifications(prevNotifs)
      showFeedback('Failed to clear read notifications', 'error')
    }
  }

  // Target link navigation
  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif)
    }

    const targetLink = notif.data?.link
    if (targetLink) {
      navigate(targetLink)
    } else if (
      notif.type === 'workspace_invitation' ||
      notif.entity_type === 'workspace_invitation'
    ) {
      navigate('/workspace-hub')
    } else if (
      notif.type === 'TASK_OVERDUE' ||
      notif.type === 'TASK_RESCHEDULED' ||
      notif.entity_type === 'task'
    ) {
      navigate('/tasks')
    } else if (
      notif.entity_type === 'lead' ||
      notif.type === 'LEAD_STATE_CHANGED' ||
      notif.type === 'LEAD_ASSIGNED'
    ) {
      navigate(notif.entity_id ? `/leads/${notif.entity_id}` : '/leads')
    } else if (
      notif.entity_type === 'opportunity' ||
      notif.type === 'DEAL_STATE_CHANGED'
    ) {
      navigate(
        notif.entity_id ? `/opportunities/${notif.entity_id}` : '/opportunities'
      )
    } else if (notif.data?.lead_id) {
      navigate(`/leads/${notif.data.lead_id}`)
    }
  }

  const getEntityLinkInfo = (notif) => {
    if (notif.data?.link) return { to: notif.data.link, label: 'View Details' }
    if (
      notif.type === 'workspace_invitation' ||
      notif.entity_type === 'workspace_invitation'
    ) {
      return { to: '/workspace-hub', label: 'View Workspaces' }
    }
    if (
      notif.type === 'TASK_OVERDUE' ||
      notif.type === 'TASK_RESCHEDULED' ||
      notif.entity_type === 'task'
    ) {
      return { to: '/tasks', label: 'View Task' }
    }
    if (
      notif.entity_type === 'lead' ||
      notif.type === 'LEAD_STATE_CHANGED' ||
      notif.type === 'LEAD_ASSIGNED'
    ) {
      return {
        to: notif.entity_id ? `/leads/${notif.entity_id}` : '/leads',
        label: 'View Lead',
      }
    }
    if (
      notif.entity_type === 'opportunity' ||
      notif.type === 'DEAL_STATE_CHANGED'
    ) {
      return {
        to: notif.entity_id
          ? `/opportunities/${notif.entity_id}`
          : '/opportunities',
        label: 'View Deal',
      }
    }
    if (notif.data?.lead_id) {
      return { to: `/leads/${notif.data.lead_id}`, label: 'View Lead' }
    }
    return null
  }

  const readCount = useMemo(() => {
    return notifications.filter((n) => n.is_read).length
  }, [notifications])

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in fade-in slide-in-from-bottom-5 duration-200 ${
            feedbackMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-ink-primary text-ink-inverse'
          }`}
        >
          {feedbackMessage.type === 'error' ? (
            <AlertCircle className="size-4 shrink-0" />
          ) : (
            <Check className="size-4 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink-primary">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {isPersonal
              ? 'Personal alerts and workspace updates'
              : `Alerts and notifications for ${activeWorkspace?.name || 'current workspace'}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            aria-label="Refresh notifications"
            className="inline-flex items-center gap-1.5 rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs font-medium text-ink-secondary shadow-sm transition hover:bg-surface-muted hover:text-ink-primary"
            disabled={loading || refreshing}
            onClick={() => loadNotifications(false)}
            type="button"
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? 'animate-spin text-brand-600' : ''}`}
            />
            <span>Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              className="inline-flex items-center gap-1.5 rounded-control border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700 shadow-sm transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
              onClick={handleMarkAllRead}
              type="button"
            >
              <Check className="size-3.5" />
              <span>Mark all as read</span>
            </button>
          )}

          {readCount > 0 && (
            <button
              className="inline-flex items-center gap-1.5 rounded-control border border-line-default bg-surface-default px-3.5 py-2 text-xs font-medium text-rose-600 shadow-sm transition hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:text-rose-400"
              onClick={handleClearAllRead}
              title="Delete all read notifications from this workspace"
              type="button"
            >
              <Trash2 className="size-3.5" />
              <span>Clear read ({readCount})</span>
            </button>
          )}

          <Link
            className="inline-flex items-center gap-1 rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs font-medium text-ink-secondary transition hover:bg-surface-muted hover:text-ink-primary"
            to="/settings/notifications"
          >
            <span>Preferences</span>
          </Link>
        </div>
      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-surface-muted p-1 text-xs font-medium">
          <button
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'all'
                ? 'bg-surface-default font-semibold text-ink-primary shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
            onClick={() => setActiveTab('all')}
            type="button"
          >
            All
          </button>
          <button
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'unread'
                ? 'bg-surface-default font-semibold text-ink-primary shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
            onClick={() => setActiveTab('unread')}
            type="button"
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="grid size-4 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'read'
                ? 'bg-surface-default font-semibold text-ink-primary shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
            onClick={() => setActiveTab('read')}
            type="button"
          >
            Read
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-ink-muted" />
          <input
            className="w-full rounded-control border border-line-default bg-surface-default py-1.5 pl-9 pr-8 text-xs text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by sender, topic, content..."
            type="text"
            value={searchQuery}
          />
          {searchQuery && (
            <button
              aria-label="Clear search"
              className="absolute right-2.5 top-2 text-ink-muted hover:text-ink-primary"
              onClick={() => setSearchQuery('')}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List Card Container */}
      <div className="rounded-2xl border border-line-default bg-surface-default shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="size-6 animate-spin text-brand-600 mb-3" />
            <p className="text-sm font-medium text-ink-primary">Loading notifications...</p>
            <p className="text-xs text-ink-muted">Fetching latest workspace activity</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 ring-8 ring-brand-50/50 dark:ring-brand-950/30">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="text-base font-semibold text-ink-primary">
              You're all caught up!
            </h3>
            <p className="mt-1 max-w-sm text-xs text-ink-muted">
              {searchQuery
                ? 'No notifications match your current search query.'
                : activeTab === 'unread'
                ? 'You have no unread notifications.'
                : 'No notifications found for this workspace. New lead assignments, deal updates, and task reminders will appear here.'}
            </p>
            {searchQuery && (
              <button
                className="mt-3 text-xs font-semibold text-brand-600 hover:text-brand-700"
                onClick={() => setSearchQuery('')}
                type="button"
              >
                Clear search filter
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-line-default/70">
            {filteredNotifications.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type] || {
                icon: Bell,
                color: 'text-ink-secondary bg-surface-muted border-line-default',
                label: 'Alert',
                badge: 'bg-surface-muted text-ink-secondary',
              }
              const IconComponent = cfg.icon
              const entityLink = getEntityLinkInfo(notif)
              const senderName = notif.data?.sender || notif.data?.manager_name
              const subjectText = notif.data?.subject || notif.title

              return (
                <div
                  className={`group relative flex flex-col sm:flex-row sm:items-start gap-4 p-4 sm:p-5 transition-colors cursor-pointer ${
                    notif.is_read
                      ? 'bg-surface-default hover:bg-surface-muted/40'
                      : 'bg-brand-50/30 hover:bg-brand-50/60 dark:bg-brand-950/20 dark:hover:bg-brand-950/30'
                  }`}
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                >
                  {/* Unread Accent Left Bar */}
                  {!notif.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-600 rounded-r" />
                  )}

                  {/* Left Column: Icon Badge */}
                  <div className="flex items-center gap-3 sm:block">
                    <div
                      className={`grid size-10 shrink-0 place-items-center rounded-xl border ${cfg.color}`}
                    >
                      <IconComponent className="size-5" />
                    </div>

                    {/* Mobile Only: Category Badge & Time */}
                    <div className="flex flex-1 items-center justify-between sm:hidden">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Center Column: Full Content */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Header Row: Subject, Category, Sender, Timestamp */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`hidden sm:inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>

                      {/* Title / Subject Line */}
                      <h4
                        className={`text-sm tracking-tight ${
                          notif.is_read
                            ? 'font-medium text-ink-primary'
                            : 'font-bold text-ink-primary'
                        }`}
                      >
                        {subjectText}
                      </h4>

                      {/* Sender Indicator */}
                      {senderName && (
                        <span className="text-xs text-ink-muted">
                          from <span className="font-medium text-ink-secondary">{senderName}</span>
                        </span>
                      )}

                      {/* Dot for Unread */}
                      {!notif.is_read && (
                        <span
                          className="size-2 rounded-full bg-brand-600 shrink-0"
                          title="Unread"
                        />
                      )}

                      {/* Desktop Timestamp */}
                      <span
                        className="hidden sm:inline-block ml-auto text-xs text-ink-muted shrink-0"
                        title={formatExactDate(notif.created_at)}
                      >
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>

                    {/* Untruncated Full Body Text */}
                    <div className="text-xs sm:text-sm text-ink-secondary leading-relaxed whitespace-pre-line pt-0.5">
                      {notif.message}
                    </div>

                    {/* Additional Metadata / Contextual Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-1.5">
                      {notif.data?.lead_name && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
                          <User className="size-3" />
                          <span>{notif.data.lead_name}</span>
                        </span>
                      )}
                      {notif.data?.company_name && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
                          <Briefcase className="size-3" />
                          <span>{notif.data.company_name}</span>
                        </span>
                      )}

                      {/* Action Link Button if Available */}
                      {entityLink && (
                        <button
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleNotificationClick(notif)
                          }}
                          type="button"
                        >
                          <span>{entityLink.label}</span>
                          <ExternalLink className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions (Mark Read & Delete) */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line-default/60">
                    {!notif.is_read ? (
                      <button
                        aria-label="Mark as read"
                        className="inline-flex items-center gap-1 rounded-control border border-line-default bg-surface-default px-2.5 py-1 text-xs font-medium text-brand-600 shadow-xs hover:bg-brand-50 hover:text-brand-700 transition dark:hover:bg-brand-950"
                        disabled={actionInProgressId === notif.id}
                        onClick={(e) => handleMarkAsRead(notif, e)}
                        title="Mark as read"
                        type="button"
                      >
                        <Check className="size-3.5" />
                        <span>Mark read</span>
                      </button>
                    ) : (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-ink-muted">
                        <Check className="size-3 text-ink-muted" />
                        <span>Read</span>
                      </span>
                    )}

                    {/* Delete Icon Button */}
                    <button
                      aria-label="Delete notification"
                      className="inline-flex items-center justify-center rounded-control p-1.5 text-ink-muted hover:bg-rose-50 hover:text-rose-600 transition dark:hover:bg-rose-950/40"
                      disabled={actionInProgressId === notif.id}
                      onClick={(e) => handleDeleteNotification(notif.id, e)}
                      title="Delete notification"
                      type="button"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
