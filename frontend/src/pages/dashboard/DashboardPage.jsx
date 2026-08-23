import { useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getDashboardSummary } from '@/services/api/dashboard'
import { getLeads, createLead } from '@/services/api/leads'
import { listWorkspaceMembers } from '@/services/api/workspaces'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { useWorkspaceKey } from '@/hooks/useWorkspaceKey'

import Button from '@/components/ui/Button'
import {
  Activity,
  ArrowUpRight,
  Calendar,
  Check,
  FileText,
  Mail,
  MoreHorizontal,
  Plus,
  Sparkles,
  Users,
} from '@/components/ui/icons'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
}

const FUNNEL_COLORS = ['#3b6eea', '#5c91f6', '#7da8f8', '#bcd4ff', '#d9e6ff']

const tooltipStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 8px 24px rgb(15 23 42 / 0.10)',
  fontSize: '12px',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Group leads by the month they were created (past 7 months). */
function buildMonthlyGrowth(leads) {
  const now = new Date()
  const result = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const count = leads.filter((l) => {
      const c = new Date(l.updated_at || l.created_at || Date.now())
      return c.getFullYear() === year && c.getMonth() === month
    }).length
    result.push({ month: MONTHS[month], leads: count })
  }
  return result
}

/** Map backend stages into funnel-chart data. */
function buildFunnelData(stages) {
  const byStatus = Object.fromEntries((stages || []).map((s) => [s.status, s.count]))
  const order = ['new', 'qualified', 'proposal', 'negotiation', 'closed_won']
  return order.map((status, i) => ({
    name: STATUS_LABELS[status] || status,
    value: byStatus[status] || 0,
    fill: FUNNEL_COLORS[i],
  }))
}

/** Map backend stages into pipeline bar chart data. */
function buildPipelineData(stages) {
  const total = stages.reduce((sum, s) => sum + s.count, 0) || 1
  const order = ['new', 'qualified', 'proposal', 'negotiation', 'closed_won']
  return order
    .filter((s) => stages.some((st) => st.status === s))
    .map((status) => {
      const found = stages.find((s) => s.status === status)
      return {
        stage: STATUS_LABELS[status] || status,
        value: found ? Math.round((found.count / total) * 100) : 0,
      }
    })
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ action, children, description }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-ink-primary">{children}</h2>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

function MetricSkeleton() {
  return (
    <article className="card animate-pulse p-5">
      <div className="mb-4 h-4 w-28 rounded bg-surface-muted" />
      <div className="h-8 w-20 rounded bg-surface-muted" />
    </article>
  )
}

// ─── Lead Form ────────────────────────────────────────────────────────────────
const EMPTY_LEAD = { company_name: '', industry: '', contact_name: '', email: '', phone: '', deal_value: '', lead_status: 'new' }

function AddLeadModal({ open, onClose, onSave, isSaving, members = [] }) {
  const defaultManagerId = members.find((m) => m.role === 'manager')?.user_id || members[0]?.user_id || ''
  const [form, setForm] = useState(EMPTY_LEAD)

  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY_LEAD,
        assigned_to: defaultManagerId || undefined,
      })
    }
  }, [open, defaultManagerId])

  if (!open) return null

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      ...form,
      deal_value: form.deal_value ? Number(form.deal_value) : null,
      assigned_to: form.assigned_to || defaultManagerId || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-card bg-surface-default shadow-overlay">
        <div className="flex items-center justify-between border-b border-line-default p-5">
          <h2 className="text-base font-semibold text-ink-primary">Add lead</h2>
          <button className="rounded-control p-1.5 text-ink-muted hover:bg-surface-muted" onClick={onClose} type="button">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {[
              ['Company Name *', 'company_name', 'text', true],
              ['Industry', 'industry', 'text', false],
              ['Contact Name', 'contact_name', 'text', false],
              ['Email', 'email', 'email', false],
              ['Phone', 'phone', 'text', false],
              ['Deal Value', 'deal_value', 'number', false],
            ].map(([label, field, type, required]) => (
              <label className="space-y-1.5" key={field}>
                <span className="text-sm font-medium text-ink-secondary">{label}</span>
                <input
                  className="input"
                  type={type}
                  required={required}
                  value={form[field] || ''}
                  onChange={(e) => update(field, e.target.value)}
                  min={type === 'number' ? 0 : undefined}
                />
              </label>
            ))}
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-ink-secondary">Status</span>
              <select className="input" value={form.lead_status} onChange={(e) => update('lead_status', e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            {members && members.length > 0 && (
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-ink-secondary">Assign to Member</span>
                <select
                  className="input"
                  value={form.assigned_to || defaultManagerId}
                  onChange={(e) => update('assigned_to', e.target.value)}
                >
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user_name || m.user_email} ({m.role === 'manager' ? 'Manager — Default' : 'Team Member'})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-line-default p-5">
            <Button onClick={onClose} type="button" variant="secondary" disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Creating…' : 'Create lead'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
function DashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { workspaceKey, activeWorkspace, isPersonal, isManager } = useWorkspaceKey()

  const [summary, setSummary] = useState(null)
  const [leads, setLeads] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const loadData = useCallback(async () => {
    setLoading(true)
    setSummary(null)
    setLeads([])
    try {
      const [summaryData, leadsData] = await Promise.all([
        getDashboardSummary(),
        getLeads({ page_size: 100 }),
      ])
      setSummary(summaryData)
      setLeads(leadsData.items || [])
    } catch (err) {
      showToast('Failed to load dashboard data.', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [showToast, workspaceKey])

  const loadMembers = useCallback(async () => {
    if (!activeWorkspace?.id || isPersonal) {
      setMembers([])
      return
    }
    try {
      const mems = await listWorkspaceMembers(activeWorkspace.id)
      setMembers(mems || [])
    } catch (err) {
      console.error('Failed to load members for dashboard:', err)
      setMembers([])
    }
  }, [activeWorkspace?.id, isPersonal])

  // Re-fetch data whenever workspace changes
  useEffect(() => {
    loadData()
    loadMembers()
  }, [loadData, loadMembers])

  // ── Derived data ─────────────────────────────────────────────────────────────
  const monthlyLeads = buildMonthlyGrowth(leads)
  const funnelData = summary ? buildFunnelData(summary.stages) : []
  const pipelineData = summary ? buildPipelineData(summary.stages) : []

  const qualifiedLeads = (summary?.stages || []).find((s) => s.status === 'qualified')?.count ?? 0

  const metrics = [
    { label: 'Total Leads', value: summary?.total_leads ?? '—', icon: Users },
    { label: 'Qualified Leads', value: qualifiedLeads ?? '—', icon: Check },
    { label: 'Conversion Rate', value: summary ? `${Number(summary.conversion_rate).toFixed(1)}%` : '—', icon: Activity },
    { label: 'Pipeline Value', value: summary ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(Number(summary.pipeline_value)) : '—', icon: ArrowUpRight },
  ]

  // Recent leads (last 5 by updated_at)
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5)

  const handleAddLead = async (data) => {
    setIsSaving(true)
    try {
      await createLead(data)
      showToast('Lead created successfully!', 'success')
      setShowAddModal(false)
      await loadData()
    } catch (err) {
      const detail = err?.response?.data?.detail
      showToast(typeof detail === 'string' ? detail : 'Failed to create lead.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AddLeadModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddLead}
        isSaving={isSaving}
        members={members}
      />

      {/* Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-brand-600">{today}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-primary">
            {greeting}, {user?.name?.split(' ')[0] || 'Sales Team'}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-block size-2 rounded-full ${
              isPersonal ? 'bg-blue-500' : isManager ? 'bg-indigo-500' : 'bg-emerald-500'
            }`} />
            <p className="text-sm text-ink-muted">
              {isPersonal
                ? "Here's what's happening across your personal pipeline today."
                : isManager
                ? `${activeWorkspace?.name || 'Workspace'} — Manager Dashboard`
                : `${activeWorkspace?.name || 'Workspace'} — Your assigned pipeline`
              }
            </p>
          </div>
        </div>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setShowAddModal(true)}>
          Add lead
        </Button>
      </header>

      {/* KPI Metrics */}
      <section aria-label="Pipeline overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
          : metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <article className="card p-5" key={metric.label}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-ink-secondary">{metric.label}</p>
                    <span className="grid size-8 place-items-center rounded-control bg-surface-muted text-ink-muted">
                      <Icon className="size-4" strokeWidth={1.8} />
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight text-ink-primary">{metric.value}</p>
                </article>
              )
            })}
      </section>

      {/* Charts row 1 */}
      <section className="grid gap-6 xl:grid-cols-3">
        <article className="card min-h-[22rem] xl:col-span-2">
          <SectionHeader description="New leads created over the last 7 months">Monthly leads</SectionHeader>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={monthlyLeads} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3b6eea" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3b6eea" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1' }} formatter={(v) => [v, 'Leads']} />
                <Area dataKey="leads" fill="url(#leadFill)" fillOpacity={1} stroke="#3b6eea" strokeWidth={2.5} type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card min-h-[22rem]">
          <SectionHeader description="From first touch to closed won">Conversion funnel</SectionHeader>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <FunnelChart>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString(), 'Leads']} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive={false}>
                  <LabelList dataKey="name" fill="#475569" position="right" stroke="none" />
                  {funnelData.map((entry) => <Cell fill={entry.fill} key={entry.name} />)}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {/* Charts row 2 */}
      <section className="grid gap-6 xl:grid-cols-5">
        <article className="card min-h-[22rem] xl:col-span-3">
          <SectionHeader
            action={<p className="text-sm text-ink-muted">${Number(summary?.pipeline_value || 0).toLocaleString()} total</p>}
            description="Distribution across active opportunities"
          >
            Sales pipeline
          </SectionHeader>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={pipelineData} layout="vertical" margin={{ top: 0, right: 16, left: 22, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                <XAxis axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} type="number" unit="%" />
                <YAxis axisLine={false} dataKey="stage" tick={{ fill: '#475569', fontSize: 12 }} tickLine={false} type="category" width={86} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(v) => [`${v}%`, 'Share']} />
                <Bar dataKey="value" fill="#475569" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Recent leads */}
        <article className="card xl:col-span-2">
          <SectionHeader
            action={<button className="text-sm font-medium text-brand-600 hover:text-brand-700" onClick={() => window.location.href = '/leads'} type="button">View all</button>}
            description="Latest sales movement"
          >
            Recent leads
          </SectionHeader>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="mt-0.5 size-8 shrink-0 rounded-control bg-surface-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-surface-muted" />
                    <div className="h-2.5 w-20 rounded bg-surface-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentLeads.length === 0 ? (
            <p className="text-sm text-ink-muted">No leads yet. Add your first lead to get started.</p>
          ) : (
            <div className="divide-y divide-line-default">
              {recentLeads.map((lead) => (
                <div className="flex gap-3 py-3 first:pt-0 last:pb-0" key={lead.id}>
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
                    <Users className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-primary">{lead.company_name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {STATUS_LABELS[lead.lead_status] || lead.lead_status}
                      {lead.deal_value ? ` · $${Number(lead.deal_value).toLocaleString()}` : ''}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-ink-muted">
                    {new Date(lead.updated_at).toLocaleDateString()}
                  </time>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {/* Quick actions */}
      <section className="grid gap-6 xl:grid-cols-3">
        <article className="card xl:col-span-1">
          <SectionHeader description="Start common sales workflows">Quick actions</SectionHeader>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <Button className="justify-start" leftIcon={<Plus className="size-4" />} onClick={() => setShowAddModal(true)} variant="secondary">Add a lead</Button>
            <Button className="justify-start" leftIcon={<Mail className="size-4" />} onClick={() => window.location.href = '/outreach-generator'} variant="secondary">Create outreach</Button>
            <Button className="justify-start" leftIcon={<FileText className="size-4" />} onClick={() => window.location.href = '/conversation-summary'} variant="secondary">New summary</Button>
          </div>
        </article>

        {/* Pipeline stats */}
        <article className="card xl:col-span-2">
          <SectionHeader description="Current stage breakdown">Pipeline stages</SectionHeader>
          {loading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-6 animate-pulse rounded bg-surface-muted" />)}
            </div>
          ) : (
            <div className="space-y-2.5">
              {(summary?.stages || []).map((stage) => {
                const total = summary.total_leads || 1
                const pct = Math.round((stage.count / total) * 100)
                return (
                  <div key={stage.status} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs font-medium text-ink-secondary">{STATUS_LABELS[stage.status] || stage.status}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-surface-muted h-2">
                      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs text-ink-muted">{stage.count}</span>
                  </div>
                )
              })}
              {(summary?.stages || []).length === 0 && (
                <p className="text-sm text-ink-muted">No pipeline data yet.</p>
              )}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}

export default DashboardPage
