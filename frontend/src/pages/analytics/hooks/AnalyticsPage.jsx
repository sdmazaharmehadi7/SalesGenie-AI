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
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertCircle, Camera, RefreshCw, Sparkles } from 'lucide-react'

import { useAnalytics } from './hooks/useAnalytics'

// ─── Design tokens (in-file) ──────────────────────────────────────────────────
const C = {
  brand: '#3b6eea',
  brand2: '#5c91f6',
  brand3: '#8eb8ff',
  brand4: '#bcd4ff',
  brand5: '#d9e6ff',
  emerald: '#16a36a',
  amber: '#d97706',
  rose: '#e11d48',
  violet: '#7c3aed',
  slate: '#64748b',
  sky: '#0ea5e9',
}

const FUNNEL_COLORS = [C.brand, C.brand2, C.brand3, C.brand4, C.brand5]
const INDUSTRY_COLORS = [C.brand, C.sky, C.emerald, C.violet, C.amber, C.slate, C.rose]

const tooltipStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  boxShadow: '0 8px 24px rgb(15 23 42 / 0.10)',
  fontSize: '12px',
  backgroundColor: '#ffffff',
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
function formatCompactCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    value || 0
  )
}

function formatShortDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Stat card ────────────────────────────────────────────────────────────────
const accentMap = {
  blue: { bg: 'bg-brand-50', text: 'text-brand-600', badge: 'bg-brand-50 text-brand-700 ring-brand-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', badge: 'bg-violet-50 text-violet-700 ring-violet-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 ring-amber-100' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600', badge: 'bg-sky-50 text-sky-700 ring-sky-100' },
}

function StatCard({ accent, change, label, value }) {
  const a = accentMap[accent]
  return (
    <article className="card flex flex-col gap-3 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink-secondary">{label}</p>
        {change && (
          <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', a.badge].join(' ')}>
            {change}
          </span>
        )}
      </div>
      <p className={['text-2xl font-semibold tracking-tight', a.text].join(' ')}>{value}</p>
    </article>
  )
}

function StatCardSkeleton() {
  return (
    <article className="card flex flex-col gap-3 overflow-hidden animate-pulse">
      <div className="h-3 w-20 rounded bg-surface-muted" />
      <div className="h-7 w-24 rounded bg-surface-muted" />
    </article>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function ChartHeader({ action, description, title }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-ink-primary">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Legend dot ──────────────────────────────────────────────────────────────
function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

// ─── Chart empty state (used when there isn't enough real data yet) ─────────
function ChartEmptyState({ action, description, height = 'h-64' }) {
  return (
    <div className={['flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong bg-surface-subtle text-center', height].join(' ')}>
      <p className="text-sm text-ink-muted px-6">{description}</p>
      {action}
    </div>
  )
}

// ─── Custom Tooltips ──────────────────────────────────────────────────────────
function CurrencyTooltip({ active, label, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-card border border-line-default bg-surface-default p-3 shadow-floating text-xs">
      <p className="mb-1.5 font-semibold text-ink-primary">{label}</p>
      {payload.map((p) => (
        <p className="text-ink-secondary" key={p.dataKey}>
          <span style={{ color: p.color }}>●</span>{' '}
          {p.name}: <span className="font-medium text-ink-primary">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

function PercentTooltip({ active, label, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-card border border-line-default bg-surface-default p-3 shadow-floating text-xs">
      <p className="mb-1.5 font-semibold text-ink-primary">{label}</p>
      {payload.map((p) => (
        <p className="text-ink-secondary" key={p.dataKey}>
          <span style={{ color: p.color }}>●</span>{' '}
          {p.name}: <span className="font-medium text-ink-primary">{p.value}%</span>
        </p>
      ))}
    </div>
  )
}

function ActivityTooltip({ active, label, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-card border border-line-default bg-surface-default p-3 shadow-floating text-xs">
      <p className="mb-1.5 font-semibold text-ink-primary">{label}</p>
      {payload.map((p) => (
        <p className="text-ink-secondary" key={p.dataKey}>
          <span style={{ color: p.color }}>●</span>{' '}
          {p.name}: <span className="font-medium text-ink-primary">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Custom pie label ─────────────────────────────────────────────────────────
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text dominantBaseline="central" fill="#ffffff" fontSize={11} fontWeight={600} textAnchor="middle" x={x} y={y}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function PipelineValueTrendChart({ isRecording, onRecord, snapshots }) {
  const data = snapshots.map((s) => ({ date: formatShortDate(s.date), pipelineValue: s.pipelineValue }))

  return (
    <article className="card">
      <ChartHeader description="Open pipeline value at each recorded snapshot" title="Pipeline Value Trend" />
      {snapshots.length === 0 ? (
        <ChartEmptyState
          action={
            <button className="btn btn-secondary btn-sm gap-1.5" disabled={isRecording} onClick={onRecord} type="button">
              <Camera className="size-3.5" />
              {isRecording ? 'Recording…' : 'Record First Snapshot'}
            </button>
          }
          description="No snapshots recorded yet. Record one to start tracking pipeline value over time."
        />
      ) : (
        <>
          <div className="flex gap-4 mb-4">
            <LegendDot color={C.brand} label="Pipeline value" />
          </div>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="pipelineValueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={C.brand} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={C.brand} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                <YAxis
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={formatCompactCurrency}
                />
                <Tooltip content={<CurrencyTooltip />} cursor={{ stroke: '#e2e8f0' }} />
                <Area
                  dataKey="pipelineValue"
                  fill="url(#pipelineValueFill)"
                  fillOpacity={1}
                  name="Pipeline value"
                  stroke={C.brand}
                  strokeWidth={2.5}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </article>
  )
}

function SalesFunnelChart({ closedLost, funnel }) {
  const data = funnel.map((f, i) => ({ ...f, fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }))
  const total = data.reduce((acc, f) => acc + f.value, 0)

  return (
    <article className="card">
      <ChartHeader description="Leads currently in each pipeline stage" title="Sales Funnel" />
      {total === 0 ? (
        <ChartEmptyState description="No leads in the pipeline yet." height="h-72" />
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer height="100%" width="100%">
              <FunnelChart>
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value.toLocaleString(), name]} />
                <Funnel dataKey="value" data={data} isAnimationActive labelLine>
                  <LabelList dataKey="name" fill="#475569" fontSize={11} position="right" stroke="none" />
                  <LabelList
                    dataKey="value"
                    fill="#ffffff"
                    fontSize={11}
                    fontWeight={600}
                    position="center"
                    stroke="none"
                    formatter={(v) => v.toLocaleString()}
                  />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
          {closedLost > 0 && (
            <p className="mt-2 text-xs text-ink-muted">{closedLost.toLocaleString()} lead{closedLost !== 1 ? 's' : ''} closed lost (not shown above).</p>
          )}
        </>
      )}
    </article>
  )
}

function IndustryBreakdownChart({ industries }) {
  const TOP_N = 6
  let data = industries
  if (industries.length > TOP_N) {
    const top = industries.slice(0, TOP_N)
    const otherTotal = industries.slice(TOP_N).reduce((acc, i) => acc + i.value, 0)
    data = [...top, { name: 'Other', value: otherTotal }]
  }
  const total = data.reduce((acc, i) => acc + i.value, 0)
  const withPercent = data.map((d) => ({ ...d, percent: total ? Math.round((d.value / total) * 100) : 0 }))

  return (
    <article className="card">
      <ChartHeader description="Leads grouped by industry" title="Leads by Industry" />
      {total === 0 ? (
        <ChartEmptyState description="No leads with industry data yet." />
      ) : (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="h-52 w-full sm:w-52 shrink-0">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={withPercent}
                  dataKey="value"
                  innerRadius={52}
                  labelLine={false}
                  label={renderPieLabel}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {withPercent.map((_, i) => (
                    <Cell fill={INDUSTRY_COLORS[i % INDUSTRY_COLORS.length]} key={i} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [v, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-2">
            {withPercent.map((item, i) => (
              <div className="flex items-center gap-2" key={item.name}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length] }} />
                <span className="flex-1 truncate text-sm text-ink-secondary">{item.name}</span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${item.percent}%`, backgroundColor: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length] }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-medium text-ink-primary">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

function WeeklyActivityChart({ activity }) {
  const total = activity.reduce((acc, day) => acc + day.call + day.email + day.meeting + day.demo + day.other, 0)

  return (
    <article className="card">
      <ChartHeader description="Logged interactions by day and type" title="Weekly Activity" />
      {total === 0 ? (
        <ChartEmptyState description="No conversation interactions logged yet." />
      ) : (
        <>
          <div className="flex flex-wrap gap-4 mb-4">
            <LegendDot color={C.brand} label="Calls" />
            <LegendDot color={C.emerald} label="Emails" />
            <LegendDot color={C.amber} label="Meetings" />
            <LegendDot color={C.violet} label="Demos" />
            <LegendDot color={C.slate} label="Other" />
          </div>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart barGap={2} data={activity} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                <YAxis axisLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                <Tooltip content={<ActivityTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar barSize={8} dataKey="call" fill={C.brand} name="Calls" radius={[3, 3, 0, 0]} />
                <Bar barSize={8} dataKey="email" fill={C.emerald} name="Emails" radius={[3, 3, 0, 0]} />
                <Bar barSize={8} dataKey="meeting" fill={C.amber} name="Meetings" radius={[3, 3, 0, 0]} />
                <Bar barSize={8} dataKey="demo" fill={C.violet} name="Demos" radius={[3, 3, 0, 0]} />
                <Bar barSize={8} dataKey="other" fill={C.slate} name="Other" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </article>
  )
}

function ConversionTrendChart({ isRecording, onRecord, snapshots }) {
  const data = snapshots.map((s) => ({ date: formatShortDate(s.date), rate: s.conversionRate }))
  const latest = snapshots.at(-1)
  const first = snapshots[0]
  const delta = snapshots.length >= 2 ? latest.conversionRate - first.conversionRate : null

  return (
    <article className="card">
      <ChartHeader description="Your closed-won conversion rate over time" title="Conversion Rate Trend" />
      {snapshots.length === 0 ? (
        <ChartEmptyState
          action={
            <button className="btn btn-secondary btn-sm gap-1.5" disabled={isRecording} onClick={onRecord} type="button">
              <Camera className="size-3.5" />
              {isRecording ? 'Recording…' : 'Record First Snapshot'}
            </button>
          }
          description="No snapshots recorded yet. Record one to start tracking your conversion rate over time."
        />
      ) : (
        <>
          <div className="flex gap-4 mb-4">
            <LegendDot color={C.brand} label="Conversion rate" />
          </div>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<PercentTooltip />} cursor={{ stroke: '#e2e8f0' }} />
                <Line
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  dataKey="rate"
                  dot={snapshots.length < 8}
                  name="Conversion rate"
                  stroke={C.brand}
                  strokeWidth={2.5}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {delta !== null && (
            <div className={['mt-4 flex items-center gap-3 rounded-card px-4 py-3', delta >= 0 ? 'bg-emerald-50' : 'bg-red-50'].join(' ')}>
              <span className="text-lg">{delta >= 0 ? '🚀' : '📉'}</span>
              <p className={['text-sm', delta >= 0 ? 'text-emerald-800' : 'text-red-800'].join(' ')}>
                Your conversion rate has {delta >= 0 ? 'risen' : 'fallen'}{' '}
                <span className="font-semibold">{Math.abs(delta).toFixed(1)}pp</span> since your first recorded snapshot.
              </p>
            </div>
          )}
        </>
      )}
    </article>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const {
    addSnapshot,
    closedLost,
    conversionRate,
    error,
    funnel,
    industryBreakdown,
    isLoading,
    isRecordingSnapshot,
    pipelineValue,
    reload,
    snapshotError,
    snapshots,
    totalCampaigns,
    totalInteractions,
    totalLeads,
    weeklyActivity,
  } = useAnalytics()

  const latestSnapshot = snapshots.at(-1)
  const firstSnapshot = snapshots[0]
  const conversionChange =
    snapshots.length >= 2 ? `${(latestSnapshot.conversionRate - firstSnapshot.conversionRate >= 0 ? '+' : '')}${(latestSnapshot.conversionRate - firstSnapshot.conversionRate).toFixed(1)}pp` : null
  const pipelineChange =
    snapshots.length >= 2 && firstSnapshot.pipelineValue
      ? `${(((latestSnapshot.pipelineValue - firstSnapshot.pipelineValue) / firstSnapshot.pipelineValue) * 100 >= 0 ? '+' : '')}${(((latestSnapshot.pipelineValue - firstSnapshot.pipelineValue) / firstSnapshot.pipelineValue) * 100).toFixed(1)}%`
      : null

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600">Performance Overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-primary">Analytics</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Track pipeline health, lead mix, and team activity in one place.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live pipeline data
          </span>
          <button
            className="btn btn-secondary btn-sm gap-1.5"
            disabled={isRecordingSnapshot}
            onClick={addSnapshot}
            type="button"
          >
            <Camera className="size-3.5" />
            {isRecordingSnapshot ? 'Recording…' : 'Record Snapshot'}
          </button>
        </div>
      </header>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-card bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-100">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button className="btn btn-secondary btn-sm gap-1.5" onClick={reload} type="button">
            <RefreshCw className="size-3.5" />
            Retry
          </button>
        </div>
      )}
      {snapshotError && (
        <div className="flex items-center gap-2 rounded-card bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-100">
          <AlertCircle className="size-4 shrink-0" />
          <span>{snapshotError}</span>
        </div>
      )}

      {/* Top stats */}
      <section aria-label="Top statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard accent="blue" label="Total Leads" value={totalLeads.toLocaleString()} />
            <StatCard accent="emerald" change={conversionChange} label="Conversion Rate" value={`${conversionRate}%`} />
            <StatCard accent="amber" change={pipelineChange} label="Pipeline Value" value={formatCompactCurrency(pipelineValue)} />
            <StatCard accent="violet" label="Outreach Emails" value={totalCampaigns.toLocaleString()} />
            <StatCard accent="sky" label="Conversations Logged" value={totalInteractions.toLocaleString()} />
          </>
        )}
      </section>

      {!isLoading && totalLeads === 0 && !error && (
        <div className="flex items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface-subtle px-4 py-4 text-sm text-ink-muted">
          <Sparkles className="size-4 shrink-0 text-brand-500" />
          No leads yet — add leads to start seeing pipeline analytics here.
        </div>
      )}

      {/* Row 1: Pipeline Value Trend (wide) + Sales Funnel */}
      <section aria-label="Pipeline value and funnel charts" className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <PipelineValueTrendChart isRecording={isRecordingSnapshot} onRecord={addSnapshot} snapshots={snapshots} />
        </div>
        <div className="xl:col-span-2">
          <SalesFunnelChart closedLost={closedLost} funnel={funnel} />
        </div>
      </section>

      {/* Row 2: Leads by Industry + Weekly Activity */}
      <section aria-label="Industry and activity charts" className="grid gap-6 xl:grid-cols-2">
        <IndustryBreakdownChart industries={industryBreakdown} />
        <WeeklyActivityChart activity={weeklyActivity} />
      </section>

      {/* Row 3: Conversion Rate Trend (full width) */}
      <section aria-label="Conversion rate chart">
        <ConversionTrendChart isRecording={isRecordingSnapshot} onRecord={addSnapshot} snapshots={snapshots} />
      </section>
    </div>
  )
}

export default AnalyticsPage
