import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Mail,
  MessageSquare,
  Sparkles,
  User,
  Users,
  X,
} from '@/components/ui/icons'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/api/notifications'

const TYPE_CONFIG = {
  lead_assigned: {
    icon: User,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400',
    label: 'Lead Assigned',
  },
  lead_status_changed: {
    icon: Flame,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
    label: 'Status Change',
  },
  email_opened: {
    icon: Mail,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
    label: 'Email Opened',
  },
  email_replied: {
    icon: Mail,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400',
    label: 'Email Reply',
  },
  meeting_reminder: {
    icon: Clock,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400',
    label: 'Reminder',
  },
  weekly_digest: {
    icon: CheckCircle2,
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-400',
    label: 'Weekly Digest',
  },
  ai_insights: {
    icon: Sparkles,
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400',
    label: 'AI Insight',
  },
  team_mentions: {
    icon: Users,
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-400',
    label: 'Mention',
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
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function NotificationDropdown() {
  const { user } = useAuth()
  const { activeWorkspace } = useWorkspace()
  const navigate = useNavigate()

  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return
    try {
      const data = await getUnreadCount()
      setUnreadCount(data.unread_count || 0)
    } catch {
      // Ignore network errors in polling
    }
  }, [user])

  const fetchNotificationsList = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getNotifications({ page: 1, page_size: 15 })
      setNotifications(data.items || [])
      setUnreadCount(data.unread_count || 0)
    } catch {
      // Handle error gracefully
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch count on mount, when active workspace changes, on window focus, and on custom update event
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 8000)

    const handleUpdate = () => {
      fetchUnreadCount()
      if (isOpen) {
        fetchNotificationsList()
      }
    }

    window.addEventListener('focus', handleUpdate)
    window.addEventListener('sg:notifications_updated', handleUpdate)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleUpdate)
      window.removeEventListener('sg:notifications_updated', handleUpdate)
    }
  }, [fetchUnreadCount, fetchNotificationsList, activeWorkspace, isOpen])

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotificationsList()
    }
  }, [isOpen, fetchNotificationsList])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation()
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // Handle error
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // Handle error
    }
  }

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markNotificationAsRead(notif.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((c) => Math.max(0, c - 1))
      } catch {
        // Continue navigation even if read call fails
      }
    }
    setIsOpen(false)

    // Navigate to related CRM link if available
    const targetLink = notif.data?.link
    if (targetLink) {
      navigate(targetLink)
    } else if (notif.entity_type === 'lead' && notif.entity_id) {
      navigate(`/leads/${notif.entity_id}`)
    } else if (notif.entity_type === 'opportunity' && notif.entity_id) {
      navigate(`/opportunities`)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`View notifications (${unreadCount} unread)`}
        className="relative rounded-control p-2 text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        <Bell className="size-5" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-surface-default">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-line-default bg-surface-default shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line-default px-4 py-3 bg-surface-muted/30">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink-primary">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                onClick={handleMarkAllRead}
                type="button"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-line-default/60">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-muted">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-2 grid size-10 place-items-center rounded-full bg-surface-muted text-ink-muted">
                  <Bell className="size-5" />
                </div>
                <p className="text-sm font-medium text-ink-primary">All caught up!</p>
                <p className="text-xs text-ink-muted">No notifications for this workspace.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] || {
                  icon: Bell,
                  color: 'text-ink-secondary bg-surface-muted',
                  label: 'Alert',
                }
                const IconComponent = cfg.icon

                return (
                  <div
                    className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                      n.is_read
                        ? 'hover:bg-surface-muted/60 opacity-80'
                        : 'bg-brand-50/20 dark:bg-brand-950/20 hover:bg-brand-50/40 dark:hover:bg-brand-950/30'
                    }`}
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                  >
                    {/* Icon Badge */}
                    <div className={`shrink-0 rounded-lg p-2 ${cfg.color}`}>
                      <IconComponent className="size-4" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-semibold truncate ${n.is_read ? 'text-ink-secondary' : 'text-ink-primary'}`}>
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[11px] text-ink-muted">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>

                    {/* Unread indicator / Mark read action */}
                    {!n.is_read && (
                      <div className="flex shrink-0 items-center self-center pl-1">
                        <button
                          aria-label="Mark as read"
                          className="grid size-6 place-items-center rounded-full text-brand-600 hover:bg-brand-100 hover:text-brand-800 transition-colors"
                          onClick={(e) => handleMarkAsRead(e, n.id)}
                          title="Mark as read"
                          type="button"
                        >
                          <span className="size-2 rounded-full bg-brand-600" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer link to Settings -> Notifications */}
          <div className="border-t border-line-default px-4 py-2.5 bg-surface-muted/20 flex items-center justify-between text-xs text-ink-muted">
            <span>Workspace alerts</span>
            <button
              className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
              onClick={() => {
                setIsOpen(false)
                navigate('/settings/notifications')
              }}
              type="button"
            >
              Preferences →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
