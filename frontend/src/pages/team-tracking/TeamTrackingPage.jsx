import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Layers,
  Mail,
  MessageSquare,
  Minus,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  X,
} from '@/components/ui/icons'
import Button from '@/components/ui/Button'
import { useWorkspaceKey } from '@/hooks/useWorkspaceKey'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useToast } from '@/context/ToastContext'
import {
  getTeamActivities,
  getTeamAiInsights,
  getTeamChartsData,
  getTeamFollowUps,
  getTeamMembers,
  getTeamSummary,
} from '@/services/api/teamTracking'

// ─── Design Tokens & Theme Palettes ───────────────────────────────────────────
const PALETTE = {
  brand: '#4f46e5',
  brandLight: '#6366f1',
  cyan: '#06b6d4',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#ef4444',
  purple: '#8b5cf6',
  slate: '#64748b',
}

const BAR_COLORS = [
  PALETTE.brand,
  PALETTE.cyan,
  PALETTE.emerald,
  PALETTE.purple,
  PALETTE.amber,
  PALETTE.rose,
  PALETTE.slate,
]

const tooltipStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  fontSize: '12px',
  backgroundColor: '#ffffff',
  padding: '10px 14px',
}

const gridStyle = { strokeDasharray: '3 3', vertical: false, stroke: '#f1f5f9' }

// ─── Utility helpers ───────────────────────────────────────────────────────────
function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val || 0)
}

function formatCompactCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(val || 0)
}

/** Returns true when a metric value is zero or nullish — use for empty-state rendering */
function isZeroOrNull(v) {
  return v == null || v === 0 || v === '0' || v === '$0'
}

/** Dynamic X-axis angle config based on number of data points */
function xAxisAngleProps(dataLength) {
  if (dataLength <= 3) {
    return { angle: 0, textAnchor: 'middle', dy: 10, height: 30 }
  }
  return { angle: -35, textAnchor: 'end', dy: 0, height: 55 }
}

// ─── Custom truncating X-axis tick ────────────────────────────────────────────
function CustomXTick({ x, y, payload, angle, textAnchor, dy, maxChars = 12 }) {
  const raw = payload?.value ?? ''
  const label = raw.length > maxChars ? raw.slice(0, maxChars) + '…' : raw
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{raw}</title>
      <text
        x={0}
        y={0}
        dy={dy ?? 10}
        textAnchor={textAnchor ?? 'middle'}
        transform={angle ? `rotate(${angle})` : undefined}
        fill="#64748b"
        fontSize={11}
        style={{ overflow: 'hidden' }}
      >
        {label}
      </text>
    </g>
  )
}

// ─── Chart Empty State ─────────────────────────────────────────────────────────
function ChartEmptyState({ height = 256 }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl bg-surface-subtle/50"
      style={{ height }}
    >
      <BarChart3 className="size-9 text-ink-muted/30" />
      <p className="text-xs font-medium text-ink-muted">No closed activity yet this period</p>
    </div>
  )
}

// ─── Skeleton Components ───────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-line-default bg-surface-default p-4 sm:p-5 shadow-xs animate-pulse flex flex-col justify-between min-h-[128px]">
      <div className="flex items-center justify-between gap-2">
        <div className="h-3 w-20 rounded bg-surface-muted" />
        <div className="size-8 rounded-xl bg-surface-muted shrink-0" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-6 sm:h-7 w-24 rounded bg-surface-muted" />
        <div className="h-3 w-28 rounded bg-surface-muted/60" />
      </div>
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="h-64 w-full animate-pulse rounded-xl bg-surface-subtle" />
  )
}

function SkeletonRow({ cols = 12 }) {
  return (
    <tr className="border-b border-line-subtle">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-3">
          <div className="h-3 rounded bg-surface-muted animate-pulse" style={{ width: `${40 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Scroll Shadow wrapper for horizontal-scroll affordance ───────────────────
function ScrollShadowX({ children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {/* right fade gradient — shows always so users know they can scroll */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-surface-default/80 to-transparent" />
      {children}
    </div>
  )
}

// ─── Member Detail Drawer Component ───────────────────────────────────────────
function MemberDetailDrawer({ member, onClose, workspaceKey }) {
  const [activities, setActivities] = useState([])
  const [loadingAct, setLoadingAct] = useState(false)

  useEffect(() => {
    if (!member) return
    setLoadingAct(true)
    getTeamActivities({ member_id: member.user_id, limit: 20 })
      .then((res) => setActivities(res || []))
      .catch((err) => console.error('Failed to load member activities:', err))
      .finally(() => setLoadingAct(false))
  }, [member, workspaceKey])

  if (!member) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-xs transition-opacity">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl bg-surface-default shadow-2xl border-l border-line-default flex flex-col">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-line-default px-6 py-5 bg-surface-subtle/50">
            <div className="flex items-center gap-3.5">
              <div className="grid size-12 place-items-center rounded-2xl bg-brand-600 font-bold text-white shadow-xs">
                {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-ink-primary">{member.name}</h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      member.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : member.status === 'away'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {member.status}
                  </span>
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">{member.email} &bull; <span className="capitalize">{member.role}</span></p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-ink-muted hover:bg-surface-muted hover:text-ink-primary transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* KPI Overview Grid */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Performance Overview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-line-default bg-surface-subtle p-3.5 text-center">
                  <p className="text-xs text-ink-muted font-medium">Assigned Leads</p>
                  <p className="mt-1 text-xl font-bold text-ink-primary">{member.assigned_leads}</p>
                </div>
                <div className="rounded-xl border border-line-default bg-surface-subtle p-3.5 text-center">
                  <p className="text-xs text-ink-muted font-medium">Deals Won</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600">{member.deals_won}</p>
                </div>
                <div className="rounded-xl border border-line-default bg-surface-subtle p-3.5 text-center">
                  <p className="text-xs text-ink-muted font-medium">Revenue</p>
                  <p className="mt-1 text-xl font-bold text-brand-600">{formatCompactCurrency(member.revenue)}</p>
                </div>
                <div className="rounded-xl border border-line-default bg-surface-subtle p-3.5 text-center">
                  <p className="text-xs text-ink-muted font-medium">Conversion</p>
                  <p className="mt-1 text-xl font-bold text-indigo-600">{member.conversion_rate}%</p>
                </div>
              </div>
            </div>

            {/* Pipeline Stage Breakdown */}
            <div className="rounded-2xl border border-line-default bg-surface-default p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Pipeline Distribution</h3>
                <span className="text-xs text-brand-600 font-semibold">{member.assigned_leads} Total in Pipe</span>
              </div>
              {member.pipeline_breakdown?.length > 0 ? (
                <div className="space-y-2.5">
                  {member.pipeline_breakdown.map((stage) => (
                    <div key={stage.stage}>
                      <div className="flex justify-between text-xs mb-1 font-medium">
                        <span className="text-ink-primary">{stage.stage}</span>
                        <span className="text-ink-secondary">{stage.count} leads ({formatCompactCurrency(stage.value)})</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full bg-brand-600 transition-all"
                          style={{
                            width: `${member.assigned_leads > 0 ? (stage.count / member.assigned_leads) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-ink-muted">No pipeline data available.</div>
              )}
            </div>

            {/* Activity Summary Badges */}
            <div className="rounded-2xl border border-line-default bg-surface-default p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Sales Touchpoints</h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-2.5">
                  <Mail className="size-4 text-blue-600 mx-auto mb-1" />
                  <span className="block font-bold text-blue-900">{member.activity_counts?.emails || 0}</span>
                  <span className="text-[10px] text-blue-700">Emails</span>
                </div>
                <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-2.5">
                  <Phone className="size-4 text-emerald-600 mx-auto mb-1" />
                  <span className="block font-bold text-emerald-900">{member.activity_counts?.calls || 0}</span>
                  <span className="text-[10px] text-emerald-700">Calls</span>
                </div>
                <div className="rounded-xl bg-purple-50/60 border border-purple-100 p-2.5">
                  <Calendar className="size-4 text-purple-600 mx-auto mb-1" />
                  <span className="block font-bold text-purple-900">{member.activity_counts?.meetings || 0}</span>
                  <span className="text-[10px] text-purple-700">Meetings</span>
                </div>
                <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-2.5">
                  <Target className="size-4 text-amber-600 mx-auto mb-1" />
                  <span className="block font-bold text-amber-900">{member.activity_counts?.follow_ups || 0}</span>
                  <span className="text-[10px] text-amber-700">Tasks</span>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                  <MessageSquare className="size-4 text-slate-600 mx-auto mb-1" />
                  <span className="block font-bold text-slate-900">{member.activity_counts?.notes || 0}</span>
                  <span className="text-[10px] text-slate-700">Notes</span>
                </div>
              </div>
            </div>

            {/* Recent Sales Activity Timeline */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Recent Sales Activity</h3>
              {loadingAct ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-surface-subtle animate-pulse" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="rounded-xl border border-line-default bg-surface-subtle p-6 text-center">
                  <Activity className="size-7 text-ink-muted/40 mx-auto mb-2" />
                  <p className="text-xs text-ink-muted">No sales activities recorded yet for this member.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line-default">
                  {activities.map((act) => (
                    <div key={act.id} className="relative group">
                      <div className="absolute -left-[21px] top-1 grid size-3 place-items-center rounded-full bg-brand-600 ring-4 ring-surface-default" />
                      <div className="rounded-xl border border-line-default bg-surface-subtle p-3.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink-primary capitalize">{act.activity_type}</span>
                          <span className="text-[10px] text-ink-muted">{new Date(act.created_at).toLocaleDateString()} {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="mt-1 text-ink-secondary">{act.title}</p>
                        {act.description && <p className="mt-1 text-[11px] text-ink-muted italic bg-surface-default p-2 rounded-lg border border-line-subtle">{act.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-line-default p-4 flex justify-end bg-surface-subtle/50">
            <Button onClick={onClose} variant="secondary">Close Profile</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Member Comparison Modal Component ─────────────────────────────────────────
function MemberComparisonModal({ selectedMembers, members, onClose }) {
  if (!selectedMembers || selectedMembers.length < 2) return null

  const comparedList = members.filter((m) => selectedMembers.includes(m.user_id))

  const metrics = [
    { label: 'Assigned Leads', key: 'assigned_leads', format: (v) => v ?? 0 },
    { label: 'Contacted Leads', key: 'contacted', format: (v) => v ?? 0 },
    { label: 'Qualified Leads', key: 'qualified', format: (v) => v ?? 0 },
    { label: 'Meetings Booked', key: 'meetings', format: (v) => v ?? 0 },
    { label: 'Deals Won', key: 'deals_won', format: (v) => v ?? 0 },
    { label: 'Deals Lost', key: 'deals_lost', format: (v) => v ?? 0 },
    { label: 'Total Revenue', key: 'revenue', format: (v) => formatCurrency(v) },
    { label: 'Conversion Rate', key: 'conversion_rate', format: (v) => `${v ?? 0}%` },
    { label: 'Total Touchpoints', key: 'activity_counts', format: (v) => v?.total ?? 0 },
    { label: 'Performance Tier', key: 'performance_score', format: (v) => v ?? '—' },
  ]

  // Determine best performer per metric row for highlighting
  function getBestIndex(metricKey) {
    let best = -1
    let bestVal = -Infinity
    comparedList.forEach((m, i) => {
      const raw = m[metricKey]
      const num = typeof raw === 'number' ? raw : typeof raw === 'object' ? (raw?.total ?? 0) : parseFloat(raw) || 0
      if (num > bestVal) { bestVal = num; best = i }
    })
    return bestVal > 0 ? best : -1
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl rounded-2xl bg-surface-default shadow-2xl border border-line-default flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-line-default p-5 bg-surface-subtle/50">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="size-5 text-brand-600" />
            <h2 className="text-base font-bold text-ink-primary">Team Member Performance Comparison</h2>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-200">
              {comparedList.length} members
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line-default">
                  <th className="pb-3 pr-4 font-bold uppercase text-ink-muted text-[11px] tracking-wider">Metric</th>
                  {comparedList.map((m) => (
                    <th key={m.user_id} className="pb-3 px-4 font-bold text-ink-primary text-center">
                      <div className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700 font-bold mx-auto mb-1 border border-brand-100">
                        {m.name.charAt(0)}
                      </div>
                      <span className="block">{m.name}</span>
                      <span className="block text-[10px] text-ink-muted font-normal capitalize">{m.role}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {metrics.map((row) => {
                  const bestIdx = getBestIndex(row.key)
                  return (
                    <tr key={row.label} className="hover:bg-surface-subtle/50">
                      <td className="py-3 pr-4 font-semibold text-ink-secondary">{row.label}</td>
                      {comparedList.map((m, idx) => (
                        <td
                          key={m.user_id}
                          className={`py-3 px-4 text-center font-bold ${
                            idx === bestIdx ? 'text-emerald-600' : 'text-ink-primary'
                          }`}
                        >
                          {row.format(m[row.key])}
                          {idx === bestIdx && (
                            <span className="ml-1 text-[9px] text-emerald-500">▲</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-line-default p-4 flex justify-end bg-surface-subtle/50">
          <Button onClick={onClose} variant="secondary">Close Comparison</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Team Tracking Page ──────────────────────────────────────────────────
export default function TeamTrackingPage() {
  const { workspaceKey, activeWorkspace, isPersonal, isManager } = useWorkspaceKey()
  const { switchWorkspace, workspaces } = useWorkspace()
  const { showToast } = useToast()

  // ── URL-synced filter params ───────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams()

  const [dateRange, setDateRange] = useState(searchParams.get('range') || 'month')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [perfFilter, setPerfFilter] = useState(searchParams.get('tier') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'revenue')

  // Raw search input (shown in field) vs debounced query (used for filtering)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const debounceTimer = useRef(null)

  // ── Loading & data states ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorState, setErrorState] = useState(null)

  const [summary, setSummary] = useState(null)
  const [members, setMembers] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [insights, setInsights] = useState(null)
  const [chartsData, setChartsData] = useState(null)

  // ── Interactive selection states ───────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState(null)
  const [compareIds, setCompareIds] = useState([])
  const [showCompareModal, setShowCompareModal] = useState(false)

  // ── Sync filters to URL ────────────────────────────────────────────────────
  const syncToUrl = useCallback((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => {
        if (v && v !== 'all' && v !== 'month' && v !== 'revenue' && v !== '') {
          next.set(k, v)
        } else {
          next.delete(k)
        }
      })
      return next
    }, { replace: true })
  }, [setSearchParams])

  const handleDateRange = (v) => { setDateRange(v); syncToUrl({ range: v }) }
  const handleStatusFilter = (v) => { setStatusFilter(v); syncToUrl({ status: v }) }
  const handlePerfFilter = (v) => { setPerfFilter(v); syncToUrl({ tier: v }) }
  const handleSortBy = (v) => { setSortBy(v); syncToUrl({ sort: v }) }

  const handleSearchInput = (e) => {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setSearchQuery(val)
      syncToUrl({ q: val })
    }, 300)
  }

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadAllData = async (showRefreshToast = false) => {
    const wid = activeWorkspace?.id
    if (!wid || isPersonal || !isManager) {
      setLoading(false)
      return
    }

    if (showRefreshToast) setRefreshing(true)
    else setLoading(true)
    setErrorState(null)

    try {
      const [sumRes, memRes, folRes, insRes, chRes] = await Promise.all([
        getTeamSummary(dateRange, wid),
        getTeamMembers(dateRange, wid),
        getTeamFollowUps(wid),
        getTeamAiInsights(wid),
        getTeamChartsData(dateRange, wid),
      ])

      setSummary(sumRes)
      setMembers(memRes || [])
      setFollowUps(folRes || [])
      setInsights(insRes)
      setChartsData(chRes)

      if (showRefreshToast) showToast('Team performance data updated.', 'success')
    } catch (err) {
      console.error('Failed to load team tracking data:', err)
      setErrorState('Failed to load team performance data. Please verify your workspace permissions.')
      showToast('Failed to load team tracking metrics.', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAllData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceKey, dateRange, isManager, isPersonal, activeWorkspace?.id])

  // ── Filtered & sorted members ──────────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    let result = [...members]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') result = result.filter((m) => m.status === statusFilter)
    if (perfFilter !== 'all') result = result.filter((m) => m.performance_score === perfFilter)

    result.sort((a, b) => {
      if (sortBy === 'revenue') return Number(b.revenue) - Number(a.revenue)
      if (sortBy === 'conversion') return b.conversion_rate - a.conversion_rate
      if (sortBy === 'deals_won') return b.deals_won - a.deals_won
      if (sortBy === 'leads') return b.assigned_leads - a.assigned_leads
      return 0
    })

    return result
  }, [members, searchQuery, statusFilter, perfFilter, sortBy])

  const toggleCompare = (userId) => {
    setCompareIds((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId)
      if (prev.length >= 4) return prev
      const next = [...prev, userId]
      // Auto-open comparison when 2nd member is selected
      if (next.length >= 2) setShowCompareModal(true)
      return next
    })
  }

  // ── Non-manager / personal view ────────────────────────────────────────────
  if (isPersonal || !isManager) {
    const managerWorkspaces = (workspaces || []).filter(
      (w) => w.role === 'manager' || w.isOwner || w.role === 'owner'
    )

    return (
      <div className="mx-auto max-w-4xl p-8 space-y-6">
        <div className="rounded-2xl border border-line-default bg-surface-default p-8 text-center shadow-xs">
          <div className="grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 mx-auto mb-4">
            <Users className="size-7" />
          </div>
          <h2 className="text-xl font-bold text-ink-primary">Team Tracking Dashboard</h2>
          <p className="mt-2 text-sm text-ink-secondary max-w-md mx-auto">
            {isPersonal
              ? 'You are currently in Personal Area. Team Tracking is designed to monitor sales performance and team pipelines in your team workspaces.'
              : 'You are viewing this workspace as a Team Member. Team tracking analytics are available for workspace Managers.'}
          </p>

          {managerWorkspaces.length > 0 && (
            <div className="mt-8 pt-6 border-t border-line-default">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
                Switch to a Manager Workspace
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {managerWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => switchWorkspace(ws.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition-colors"
                  >
                    <Building2 className="size-4" />
                    Open {ws.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Chart data helpers ───────────────────────────────────────────────────
  const revenueData = chartsData?.revenue_by_member || []
  const dealsData = chartsData?.deals_won_by_member || []
  const conversionData = chartsData?.conversion_rate_by_member || []

  const revenueAngle = xAxisAngleProps(revenueData.length)
  const dealsAngle = xAxisAngleProps(dealsData.length)
  const conversionAngle = xAxisAngleProps(conversionData.length)

  // Determine if team has any data at all (for empty state styling)
  const teamHasNoActivity = !loading && members.length > 0 &&
    members.every((m) => !m.revenue && !m.deals_won && !m.assigned_leads)

  // ─── KPI card value renderer ──────────────────────────────────────────────
  function KpiValue({ value, isLoading }) {
    if (isLoading) return <div className="h-7 w-16 rounded bg-surface-muted animate-pulse" />
    const empty = teamHasNoActivity || value === '$0' || value === '0%' || value === 0
    return (
      <div>
        <p className={`text-2xl font-extrabold tracking-tight ${empty ? 'text-ink-muted/50' : 'text-ink-primary'}`}>
          {value}
        </p>
        {empty && (
          <p className="text-[10px] text-ink-muted mt-0.5">No data yet</p>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* ─── 1. Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line-default pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-primary">Team Tracking</h1>
            <span className="rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
              Manager View
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-secondary">
            Monitor your team's sales activity, pipeline, and performance across {activeWorkspace?.name || 'the workspace'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex rounded-xl border border-line-default bg-surface-default p-1 shadow-2xs">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleDateRange(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  dateRange === tab.id
                    ? 'bg-brand-600 text-white shadow-2xs'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="secondary"
            onClick={() => loadAllData(true)}
            disabled={refreshing || loading}
            leftIcon={<RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {errorState && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="size-4 shrink-0" />
          {errorState}
        </div>
      )}

      {/* ─── 2. Summary KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          [
            {
              label: 'Total Members',
              value: summary?.total_members ?? '—',
              trend: summary?.total_members_trend,
              icon: Users,
              color: 'text-blue-600 bg-blue-50 border-blue-100',
            },
            {
              label: 'Active Members',
              value: summary?.active_members ?? '—',
              trend: summary?.active_members_trend,
              icon: CheckCircle2,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            },
            {
              label: 'Total Leads',
              value: summary?.total_leads ?? 0,
              trend: summary?.total_leads_trend,
              icon: Target,
              color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            },
            {
              label: 'Deals Won',
              value: summary?.deals_won ?? 0,
              trend: summary?.deals_won_trend,
              icon: Award,
              color: 'text-amber-600 bg-amber-50 border-amber-100',
            },
            {
              label: 'Team Revenue',
              value: formatCurrency(summary?.team_revenue),
              trend: summary?.team_revenue_trend,
              icon: TrendingUp,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            },
            {
              label: 'Avg Conversion',
              value: `${summary?.avg_conversion_rate ?? 0}%`,
              trend: summary?.conversion_rate_trend,
              icon: BarChart3,
              color: 'text-purple-600 bg-purple-50 border-purple-100',
            },
          ].map((kpi) => {
            const Icon = kpi.icon
            const rawVal = kpi.value
            const isEmpty = teamHasNoActivity && (rawVal === 0 || rawVal === '$0' || rawVal === '0%')
            return (
              <div
                key={kpi.label}
                className="rounded-2xl border border-line-default bg-surface-default p-4 sm:p-5 shadow-xs flex flex-col justify-between min-w-0 min-h-[128px] transition-shadow hover:shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink-muted truncate">{kpi.label}</span>
                  <div className={`grid size-8 place-items-center rounded-xl border shrink-0 ${kpi.color}`}>
                    <Icon className="size-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className={`text-xl sm:text-2xl font-extrabold tracking-tight truncate ${isEmpty ? 'text-ink-muted/50' : 'text-ink-primary'}`}>
                    {rawVal}
                  </p>
                  <div className="mt-1.5 flex items-center min-h-[18px]">
                    {isEmpty ? (
                      <span className="text-[10px] font-medium text-ink-muted">No data yet</span>
                    ) : kpi.trend ? (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-ink-muted truncate">
                        {kpi.trend.trend === 'up' ? (
                          <ArrowUpRight className="size-3.5 text-emerald-600 shrink-0" />
                        ) : kpi.trend.trend === 'down' ? (
                          <ArrowDownRight className="size-3.5 text-rose-600 shrink-0" />
                        ) : (
                          <Minus className="size-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className={kpi.trend.trend === 'up' ? 'text-emerald-600 font-bold shrink-0' : kpi.trend.trend === 'down' ? 'text-rose-600 font-bold shrink-0' : 'shrink-0'}>
                          {kpi.trend.change_pct != null ? `${kpi.trend.change_pct}%` : ''}
                        </span>
                        <span className="truncate">{kpi.trend.comparison_label}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── 3. AI Team Insights Section ──────────────────────────────────────── */}
      {insights && insights.insights?.length > 0 && (
        <div className="rounded-2xl border border-line-default bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-blue-50/50 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-5 text-indigo-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-950">AI Team Insights &amp; Forecasting</h2>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ml-1">
              {insights.insights.length}
            </span>
          </div>
          {/* auto-fit grid: fills available space with min 280px cards; no dead whitespace with 1-2 cards */}
          <div
            className="grid gap-4 overflow-x-auto"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
          >
            {insights.insights.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-indigo-100 bg-surface-default p-4 shadow-2xs flex flex-col justify-between min-w-[260px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                      {item.type === 'top_performer'
                        ? '🔥 Top Performer'
                        : item.type === 'needs_attention'
                        ? '⚠️ Needs Attention'
                        : item.type === 'follow_up_risk'
                        ? '⏰ Follow-up Risk'
                        : '📈 Opportunity'}
                    </span>
                    {item.metric_highlight && (
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        {item.metric_highlight}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-ink-primary mb-1">{item.title}</h4>
                  <p className="text-xs text-ink-secondary leading-relaxed">{item.description}</p>
                </div>
                {item.member_id && (
                  <button
                    onClick={() => {
                      const m = members.find((mem) => mem.user_id === item.member_id)
                      if (m) setSelectedMember(m)
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline"
                  >
                    View {item.member_name} <ArrowRight className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 4. Performance Charts Section ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Revenue by Team Member */}
        <div className="rounded-2xl border border-line-default bg-surface-default p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink-primary">Revenue by Member</h3>
            <span className="text-xs text-ink-muted">Won Deals</span>
          </div>
          {loading ? (
            <SkeletonChart />
          ) : revenueData.length === 0 ? (
            <ChartEmptyState />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: revenueAngle.height }}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    tick={(props) => <CustomXTick {...props} angle={revenueAngle.angle} textAnchor={revenueAngle.textAnchor} dy={revenueAngle.dy} />}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatCompactCurrency} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val) => [formatCurrency(val), 'Revenue']} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {revenueData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Deals Won by Team Member */}
        <div className="rounded-2xl border border-line-default bg-surface-default p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink-primary">Deals Won by Member</h3>
            <span className="text-xs text-ink-muted">Closed Count</span>
          </div>
          {loading ? (
            <SkeletonChart />
          ) : dealsData.length === 0 ? (
            <ChartEmptyState />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dealsData} margin={{ top: 10, right: 10, left: 0, bottom: dealsAngle.height }}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    tick={(props) => <CustomXTick {...props} angle={dealsAngle.angle} textAnchor={dealsAngle.textAnchor} dy={dealsAngle.dy} />}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val) => [val, 'Deals Won']} />
                  <Bar dataKey="value" fill={PALETTE.emerald} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 3: Conversion Rate by Member */}
        <div className="rounded-2xl border border-line-default bg-surface-default p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink-primary">Conversion Rate by Member</h3>
            <span className="text-xs text-ink-muted">Win Velocity %</span>
          </div>
          {loading ? (
            <SkeletonChart />
          ) : conversionData.length === 0 ? (
            <ChartEmptyState />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionData} margin={{ top: 10, right: 10, left: 0, bottom: conversionAngle.height }}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    tick={(props) => <CustomXTick {...props} angle={conversionAngle.angle} textAnchor={conversionAngle.textAnchor} dy={conversionAngle.dy} />}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val) => [`${val}%`, 'Conversion Rate']} />
                  <Bar dataKey="value" fill={PALETTE.purple} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ─── 5. Team Activity Over Time & Pipeline Distribution ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Over Time */}
        <div className="rounded-2xl border border-line-default bg-surface-default p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-ink-primary">Team Activity Over Time</h3>
              <p className="text-xs text-ink-muted">Aggregated calls, emails, and meetings across the sales team</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-blue-600"><span className="size-2 rounded-full bg-blue-600" /> Emails</span>
              <span className="flex items-center gap-1 text-emerald-600"><span className="size-2 rounded-full bg-emerald-600" /> Calls</span>
            </div>
          </div>
          {loading ? (
            <SkeletonChart />
          ) : !chartsData?.team_activity_over_time?.length ? (
            <ChartEmptyState />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartsData.team_activity_over_time} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PALETTE.cyan} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={PALETTE.cyan} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PALETTE.emerald} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="emails" stroke={PALETTE.cyan} fillOpacity={1} fill="url(#colorEmails)" />
                  <Area type="monotone" dataKey="calls" stroke={PALETTE.emerald} fillOpacity={1} fill="url(#colorCalls)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pipeline Distribution */}
        <div className="rounded-2xl border border-line-default bg-surface-default p-5 shadow-xs">
          <h3 className="text-sm font-bold text-ink-primary mb-1">Pipeline Distribution</h3>
          <p className="text-xs text-ink-muted mb-4">Total lead count across pipeline stages</p>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 rounded-lg bg-surface-muted animate-pulse" />
              ))}
            </div>
          ) : !chartsData?.pipeline_distribution?.length ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Layers className="size-8 text-ink-muted/30" />
              <p className="text-xs text-ink-muted text-center">No pipeline data available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chartsData.pipeline_distribution.map((item, idx) => {
                const total = chartsData.pipeline_distribution.reduce((s, d) => s + d.count, 0)
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                return (
                  <div key={item.stage}>
                    <div className="flex items-center justify-between text-xs mb-1 font-medium">
                      <span className="text-ink-secondary">{item.stage}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink-primary">{item.count}</span>
                        <span className="text-[10px] text-ink-muted">leads</span>
                        <span className="text-[10px] text-ink-muted">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: BAR_COLORS[idx % BAR_COLORS.length] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── 6. Team Performance Table ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-line-default bg-surface-default shadow-xs overflow-hidden">
        {/* Table Header: title + inline filter row */}
        <div className="p-5 border-b border-line-default bg-surface-subtle/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-ink-primary">Team Performance Directory</h2>
              <p className="text-xs text-ink-secondary mt-0.5">Click any member to inspect detailed activity and pipeline breakdown</p>
            </div>
            {compareIds.length >= 2 && (
              <Button
                onClick={() => setShowCompareModal(true)}
                className="shrink-0 text-xs"
              >
                Compare ({compareIds.length}) members
              </Button>
            )}
          </div>

          {/* ── Filter Row: single responsive flex row ──────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search — flex-1 so it grows */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" />
              <input
                id="team-search"
                type="text"
                placeholder="Search member..."
                className="input pl-8 text-xs py-1.5 w-full"
                value={searchInput}
                onChange={handleSearchInput}
              />
            </div>

            {/* Status Filter */}
            <select
              id="team-status-filter"
              className="input text-xs py-1.5 w-auto shrink-0"
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="away">Away</option>
              <option value="offline">Offline</option>
            </select>

            {/* Performance Tier Filter */}
            <select
              id="team-tier-filter"
              className="input text-xs py-1.5 w-auto shrink-0"
              value={perfFilter}
              onChange={(e) => handlePerfFilter(e.target.value)}
            >
              <option value="all">All Tiers</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Needs Attention">Needs Attention</option>
            </select>

            {/* Sort Dropdown */}
            <select
              id="team-sort"
              className="input text-xs py-1.5 w-auto shrink-0"
              value={sortBy}
              onChange={(e) => handleSortBy(e.target.value)}
            >
              <option value="revenue">Sort by Revenue</option>
              <option value="conversion">Sort by Conversion</option>
              <option value="deals_won">Sort by Deals Won</option>
              <option value="leads">Sort by Assigned Leads</option>
            </select>
          </div>

          {/* Active filter chips */}
          {(statusFilter !== 'all' || perfFilter !== 'all' || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] text-ink-muted">Filtering:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                  "{searchQuery}"
                  <button onClick={() => { setSearchInput(''); setSearchQuery(''); syncToUrl({ q: '' }) }} className="hover:text-brand-900">
                    <X className="size-2.5" />
                  </button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted border border-line-default px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                  {statusFilter}
                  <button onClick={() => handleStatusFilter('all')} className="hover:text-ink-primary"><X className="size-2.5" /></button>
                </span>
              )}
              {perfFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted border border-line-default px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                  {perfFilter}
                  <button onClick={() => handlePerfFilter('all')} className="hover:text-ink-primary"><X className="size-2.5" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Table Content with scroll shadow affordance */}
        <ScrollShadowX>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line-default bg-surface-subtle/50 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="py-3.5 pl-5 pr-3">Cmp</th>
                  <th className="py-3.5 px-3">Team Member</th>
                  <th className="py-3.5 px-3">Role</th>
                  <th className="py-3.5 px-3 text-center">Leads</th>
                  <th className="py-3.5 px-3 text-center">Contacted</th>
                  <th className="py-3.5 px-3 text-center">Meetings</th>
                  <th className="py-3.5 px-3 text-center">Won</th>
                  <th className="py-3.5 px-3 text-right">Revenue</th>
                  <th className="py-3.5 px-3 text-center">Conv%</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-center">Tier</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={12} />)
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-14 text-center">
                      <Users className="size-9 text-ink-muted/30 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-ink-muted">
                        {members.length === 0 ? 'No team members yet' : 'No members match the filters'}
                      </p>
                      <p className="text-xs text-ink-muted/70 mt-1">
                        {members.length === 0
                          ? 'Invite team members to your workspace to start tracking performance.'
                          : 'Try clearing some filters to see more results.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => {
                    const isChecked = compareIds.includes(m.user_id)
                    const hasActivity = m.revenue > 0 || m.deals_won > 0 || m.assigned_leads > 0
                    return (
                      <tr
                        key={m.user_id}
                        className="hover:bg-surface-subtle transition-colors cursor-pointer group"
                        onClick={() => setSelectedMember(m)}
                      >
                        <td className="py-4 pl-5 pr-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCompare(m.user_id)}
                            title={isChecked ? 'Remove from comparison' : 'Add to comparison'}
                            className="rounded text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="grid size-8 place-items-center rounded-xl bg-brand-50 text-brand-700 font-bold border border-brand-100 shrink-0 text-sm">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-ink-primary group-hover:text-brand-600 transition-colors block truncate max-w-[120px]">
                                {m.name}
                              </span>
                              <span className="text-[11px] text-ink-muted truncate block max-w-[120px]">{m.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3 capitalize text-ink-secondary font-medium">{m.role}</td>
                        <td className={`py-4 px-3 text-center font-semibold ${!hasActivity ? 'text-ink-muted/50' : 'text-ink-primary'}`}>
                          {m.assigned_leads}
                        </td>
                        <td className={`py-4 px-3 text-center font-medium ${!hasActivity ? 'text-ink-muted/50' : 'text-ink-secondary'}`}>
                          {m.contacted}
                        </td>
                        <td className={`py-4 px-3 text-center font-medium ${!hasActivity ? 'text-ink-muted/50' : 'text-ink-secondary'}`}>
                          {m.meetings}
                        </td>
                        <td className={`py-4 px-3 text-center font-bold ${m.deals_won > 0 ? 'text-emerald-600' : 'text-ink-muted/50'}`}>
                          {m.deals_won}
                        </td>
                        <td className={`py-4 px-3 text-right font-extrabold ${m.revenue > 0 ? 'text-ink-primary' : 'text-ink-muted/50'}`}>
                          {formatCurrency(m.revenue)}
                        </td>
                        <td className={`py-4 px-3 text-center font-bold ${m.conversion_rate > 0 ? 'text-indigo-600' : 'text-ink-muted/50'}`}>
                          {m.conversion_rate}%
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              m.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.status === 'away'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              m.performance_score === 'Excellent'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : m.performance_score === 'Needs Attention'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {m.performance_score || '—'}
                          </span>
                        </td>
                        <td className="py-4 pl-3 pr-5 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:underline">
                            Details <ChevronRight className="size-3.5" />
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </ScrollShadowX>

        {/* Table footer summary */}
        {!loading && filteredMembers.length > 0 && (
          <div className="px-5 py-3 border-t border-line-subtle bg-surface-subtle/30 flex items-center justify-between text-[11px] text-ink-muted">
            <span>
              Showing <span className="font-semibold text-ink-secondary">{filteredMembers.length}</span> of{' '}
              <span className="font-semibold text-ink-secondary">{members.length}</span> members
            </span>
            {compareIds.length > 0 && (
              <span className="text-brand-600 font-semibold">
                {compareIds.length} selected for comparison
                {compareIds.length < 2 && ' — select one more to compare'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── 7. Follow-ups Requiring Attention ───────────────────────────────── */}
      <div className="rounded-2xl border border-line-default bg-surface-default shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-amber-600" />
            <h2 className="text-base font-bold text-ink-primary">Follow-ups Requiring Attention</h2>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
            {followUps.length} Overdue / Idle Leads
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-surface-subtle animate-pulse" />)}
          </div>
        ) : followUps.length === 0 ? (
          <div className="rounded-xl border border-line-default bg-surface-subtle p-8 text-center">
            <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink-primary">All caught up!</p>
            <p className="text-xs text-ink-muted mt-1">No leads are currently stalled or overdue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line-default text-[11px] font-bold uppercase tracking-wider text-ink-muted bg-surface-subtle/50">
                  <th className="py-3 px-4">Lead / Company</th>
                  <th className="py-3 px-4">Assigned Sales Rep</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Idle Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {followUps.slice(0, 8).map((f) => (
                  <tr key={f.id} className="hover:bg-surface-subtle/60">
                    <td className="py-3.5 px-4 font-bold text-ink-primary">
                      <a href={`/leads/${f.lead_id || f.id}`} className="hover:text-brand-600 hover:underline">
                        {f.lead_company}
                      </a>
                      {f.contact_name && <span className="block text-[11px] font-normal text-ink-muted">{f.contact_name}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-ink-secondary font-medium">{f.assigned_to_name}</td>
                    <td className="py-3.5 px-4 text-ink-muted">{f.last_contact ? new Date(f.last_contact).toLocaleDateString() : '—'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        f.priority === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {f.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        f.status === 'Overdue' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-rose-600">{f.days_idle} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Drawers & Modals ────────────────────────────────────────────────── */}
      <MemberDetailDrawer
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        workspaceKey={workspaceKey}
      />

      <MemberComparisonModal
        selectedMembers={compareIds}
        members={members}
        onClose={() => setShowCompareModal(false)}
      />
    </div>
  )
}
