import { useState } from 'react'
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
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// ─── Design tokens (in-file) ──────────────────────────────────────────────────
const C = {
  brand: '#3b6eea',
  brand2: '#5c91f6',
  brand3: '#8eb8ff',
  emerald: '#16a36a',
  amber: '#d97706',
  rose: '#e11d48',
  violet: '#7c3aed',
  slate: '#64748b',
  sky: '#0ea5e9',
}

const tooltipStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  boxShadow: '0 8px 24px rgb(15 23 42 / 0.10)',
  fontSize: '12px',
  backgroundColor: '#ffffff',
}

// ─── Dummy data ───────────────────────────────────────────────────────────────
const revenueData = [
  { month: 'Jan', revenue: 38000, target: 35000 },
  { month: 'Feb', revenue: 42000, target: 38000 },
  { month: 'Mar', revenue: 39500, target: 40000 },
  { month: 'Apr', revenue: 51000, target: 44000 },
  { month: 'May', revenue: 58000, target: 48000 },
  { month: 'Jun', revenue: 62000, target: 52000 },
  { month: 'Jul', revenue: 71000, target: 56000 },
  { month: 'Aug', revenue: 68000, target: 60000 },
  { month: 'Sep', revenue: 74000, target: 64000 },
  { month: 'Oct', revenue: 81000, target: 68000 },
  { month: 'Nov', revenue: 84260, target: 72000 },
  { month: 'Dec', revenue: 91000, target: 76000 },
]

const funnelData = [
  { name: 'Leads Captured', value: 4820, fill: C.brand },
  { name: 'Contacted',      value: 3140, fill: C.brand2 },
  { name: 'Qualified',      value: 1860, fill: C.brand3 },
  { name: 'Proposal Sent',  value: 940,  fill: '#bcd4ff' },
  { name: 'Closed Won',     value: 412,  fill: '#d9e6ff' },
]

const leadSourceData = [
  { name: 'Organic Search', value: 34 },
  { name: 'Paid Ads',       value: 22 },
  { name: 'Referral',       value: 18 },
  { name: 'LinkedIn',       value: 14 },
  { name: 'Email Campaign', value: 8  },
  { name: 'Direct',         value: 4  },
]

const PIE_COLORS = [C.brand, C.sky, C.emerald, C.violet, C.amber, C.slate]

const weeklyData = [
  { day: 'Mon', calls: 24, emails: 58, meetings: 6 },
  { day: 'Tue', calls: 32, emails: 71, meetings: 9 },
  { day: 'Wed', calls: 28, emails: 63, meetings: 11 },
  { day: 'Thu', calls: 41, emails: 84, meetings: 8 },
  { day: 'Fri', calls: 35, emails: 77, meetings: 13 },
  { day: 'Sat', calls: 12, emails: 31, meetings: 3 },
  { day: 'Sun', calls: 6,  emails: 18, meetings: 1 },
]

const conversionData = [
  { month: 'Jan', rate: 14.2, industry: 12.0 },
  { month: 'Feb', rate: 15.8, industry: 12.1 },
  { month: 'Mar', rate: 13.9, industry: 12.3 },
  { month: 'Apr', rate: 17.1, industry: 12.5 },
  { month: 'May', rate: 18.4, industry: 12.4 },
  { month: 'Jun', rate: 19.6, industry: 12.6 },
  { month: 'Jul', rate: 21.0, industry: 12.7 },
  { month: 'Aug', rate: 20.3, industry: 12.8 },
  { month: 'Sep', rate: 22.5, industry: 13.0 },
  { month: 'Oct', rate: 23.1, industry: 13.1 },
  { month: 'Nov', rate: 24.8, industry: 13.2 },
]

// ─── Top stats data ───────────────────────────────────────────────────────────
const topStats = [
  {
    label: 'Total Leads',
    value: '4,820',
    change: '+12.5%',
    positive: true,
    sub: 'vs last month',
    accent: 'blue',
    sparkValues: [62, 70, 65, 78, 88, 82, 96, 100],
  },
  {
    label: 'Conversion Rate',
    value: '24.8%',
    change: '+3.2pp',
    positive: true,
    sub: 'vs last month',
    accent: 'emerald',
    sparkValues: [55, 60, 58, 66, 72, 78, 85, 100],
  },
  {
    label: 'Emails Generated',
    value: '12,340',
    change: '+8.9%',
    positive: true,
    sub: 'vs last month',
    accent: 'violet',
    sparkValues: [45, 52, 60, 58, 70, 76, 88, 100],
  },
  {
    label: 'Revenue',
    value: '$84,260',
    change: '+16.8%',
    positive: true,
    sub: 'vs last month',
    accent: 'amber',
    sparkValues: [50, 55, 52, 64, 72, 80, 90, 100],
  },
  {
    label: 'AI Requests',
    value: '38,910',
    change: '+24.1%',
    positive: true,
    sub: 'vs last month',
    accent: 'sky',
    sparkValues: [30, 40, 42, 55, 62, 74, 88, 100],
  },
]

const accentMap = {
  blue:   { bg: 'bg-brand-50',   text: 'text-brand-600',   spark: C.brand,   badge: 'bg-brand-50 text-brand-700 ring-brand-100' },
  emerald:{ bg: 'bg-emerald-50', text: 'text-emerald-600', spark: C.emerald, badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  violet: { bg: 'bg-violet-50',  text: 'text-violet-600',  spark: C.violet,  badge: 'bg-violet-50 text-violet-700 ring-violet-100' },
  amber:  { bg: 'bg-amber-50',   text: 'text-amber-600',   spark: C.amber,   badge: 'bg-amber-50 text-amber-700 ring-amber-100' },
  sky:    { bg: 'bg-sky-50',     text: 'text-sky-600',     spark: C.sky,     badge: 'bg-sky-50 text-sky-700 ring-sky-100' },
}

// ─── Spark line (tiny inline chart) ──────────────────────────────────────────
function SparkLine({ color, data }) {
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - v
    return `${x},${y}`
  }).join(' ')
  return (
    <svg className="h-10 w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <polyline
        fill="none"
        points={pts}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ stat }) {
  const a = accentMap[stat.accent]
  return (
    <article className="card flex flex-col gap-3 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink-secondary">{stat.label}</p>
        <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', a.badge].join(' ')}>
          {stat.change}
        </span>
      </div>
      <p className={['text-2xl font-semibold tracking-tight', a.text].join(' ')}>
        {stat.value}
      </p>
      <SparkLine color={a.spark} data={stat.sparkValues} />
      <p className="text-xs text-ink-disabled">{stat.positive ? '▲' : '▼'} {stat.sub}</p>
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

// ─── Period toggle ────────────────────────────────────────────────────────────
function PeriodToggle({ active, onChange, options }) {
  return (
    <div className="flex rounded-control bg-surface-muted p-0.5 text-xs font-medium">
      {options.map((opt) => (
        <button
          className={[
            'rounded-[5px] px-2.5 py-1 transition-colors',
            active === opt
              ? 'bg-surface-default text-ink-primary shadow-xs'
              : 'text-ink-muted hover:text-ink-secondary',
          ].join(' ')}
          key={opt}
          onClick={() => onChange(opt)}
          type="button"
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-card border border-line-default bg-surface-default p-3 shadow-floating text-xs">
      <p className="mb-1.5 font-semibold text-ink-primary">{label}</p>
      {payload.map((p) => (
        <p className="text-ink-secondary" key={p.dataKey}>
          <span style={{ color: p.color }}>●</span>{' '}
          {p.name}: <span className="font-medium text-ink-primary">${(p.value / 1000).toFixed(1)}k</span>
        </p>
      ))}
    </div>
  )
}

function PercentTooltip({ active, payload, label }) {
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

function ActivityTooltip({ active, payload, label }) {
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

function RevenueChart() {
  const [period, setPeriod] = useState('12M')
  const count = period === '3M' ? 3 : period === '6M' ? 6 : 12
  const data = revenueData.slice(-count)

  return (
    <article className="card">
      <ChartHeader
        action={<PeriodToggle active={period} onChange={setPeriod} options={['3M', '6M', '12M']} />}
        description="Actual vs target revenue"
        title="Revenue Growth"
      />
      <div className="flex gap-4 mb-4">
        <LegendDot color={C.brand} label="Actual" />
        <LegendDot color={C.brand3} label="Target" />
      </div>
      <div className="h-64">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="revActual" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={C.brand} stopOpacity={0.18} />
                <stop offset="100%" stopColor={C.brand} stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="revTarget" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={C.brand3} stopOpacity={0.12} />
                <stop offset="100%" stopColor={C.brand3} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
            <YAxis axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
            <Tooltip content={<RevenueTooltip />} cursor={{ stroke: '#e2e8f0' }} />
            <Area dataKey="target" fill="url(#revTarget)" fillOpacity={1} name="Target" stroke={C.brand3} strokeDasharray="4 3" strokeWidth={2} type="monotone" />
            <Area dataKey="revenue" fill="url(#revActual)" fillOpacity={1} name="Actual" stroke={C.brand} strokeWidth={2.5} type="monotone" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}

function SalesFunnelChart() {
  return (
    <article className="card">
      <ChartHeader description="Leads through each pipeline stage" title="Sales Funnel" />
      <div className="h-72">
        <ResponsiveContainer height="100%" width="100%">
          <FunnelChart>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [value.toLocaleString(), name]}
            />
            <Funnel dataKey="value" data={funnelData} isAnimationActive labelLine>
              <LabelList
                dataKey="name"
                fill="#475569"
                fontSize={11}
                position="right"
                stroke="none"
              />
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
    </article>
  )
}

function LeadSourcesChart() {
  return (
    <article className="card">
      <ChartHeader description="Where your leads are coming from" title="Lead Sources" />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="h-52 w-full sm:w-52 shrink-0">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={leadSourceData}
                dataKey="value"
                innerRadius={52}
                labelLine={false}
                label={renderPieLabel}
                outerRadius={90}
                paddingAngle={2}
              >
                {leadSourceData.map((_, i) => (
                  <Cell fill={PIE_COLORS[i % PIE_COLORS.length]} key={i} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, name) => [`${v}%`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend table */}
        <div className="flex-1 space-y-2">
          {leadSourceData.map((item, i) => (
            <div className="flex items-center gap-2" key={item.name}>
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
              <span className="flex-1 truncate text-sm text-ink-secondary">{item.name}</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${item.value}%`, backgroundColor: PIE_COLORS[i] }}
                />
              </div>
              <span className="w-8 text-right text-xs font-medium text-ink-primary">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

function WeeklyActivityChart() {
  return (
    <article className="card">
      <ChartHeader description="Calls, emails, and meetings per day" title="Weekly Activity" />
      <div className="flex gap-4 mb-4">
        <LegendDot color={C.brand} label="Calls" />
        <LegendDot color={C.emerald} label="Emails" />
        <LegendDot color={C.amber} label="Meetings" />
      </div>
      <div className="h-64">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart barGap={2} data={weeklyData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
            <YAxis axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
            <Tooltip content={<ActivityTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar barSize={10} dataKey="calls" fill={C.brand} name="Calls" radius={[3, 3, 0, 0]} />
            <Bar barSize={10} dataKey="emails" fill={C.emerald} name="Emails" radius={[3, 3, 0, 0]} />
            <Bar barSize={10} dataKey="meetings" fill={C.amber} name="Meetings" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}

function MonthlyConversionChart() {
  return (
    <article className="card">
      <ChartHeader description="Your conversion rate vs. industry average" title="Monthly Conversion Rate" />
      <div className="flex gap-4 mb-4">
        <LegendDot color={C.brand} label="SalesGenie" />
        <LegendDot color={C.slate} label="Industry avg." />
      </div>
      <div className="h-64">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={conversionData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
            <YAxis axisLine={false} domain={[10, 28]} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<PercentTooltip />} cursor={{ stroke: '#e2e8f0' }} />
            <Line
              dataKey="industry"
              dot={false}
              name="Industry avg."
              stroke={C.slate}
              strokeDasharray="4 3"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              activeDot={{ r: 5, strokeWidth: 0 }}
              dataKey="rate"
              dot={false}
              name="SalesGenie"
              stroke={C.brand}
              strokeWidth={2.5}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion highlight */}
      <div className="mt-4 flex items-center gap-3 rounded-card bg-emerald-50 px-4 py-3">
        <span className="text-lg">🚀</span>
        <p className="text-sm text-emerald-800">
          Your conversion rate is{' '}
          <span className="font-semibold">
            {(conversionData.at(-1).rate - conversionData.at(-1).industry).toFixed(1)}pp
          </span>{' '}
          above the industry average this month.
        </p>
      </div>
    </article>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600">Performance Overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-primary">Analytics</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Track revenue, pipeline health, and team activity in one place.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live · Last updated just now
        </div>
      </header>

      {/* Top stats */}
      <section aria-label="Top statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {topStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      {/* Row 1: Revenue Growth (wide) + Sales Funnel */}
      <section aria-label="Revenue and funnel charts" className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RevenueChart />
        </div>
        <div className="xl:col-span-2">
          <SalesFunnelChart />
        </div>
      </section>

      {/* Row 2: Lead Sources + Weekly Activity */}
      <section aria-label="Lead sources and activity charts" className="grid gap-6 xl:grid-cols-2">
        <LeadSourcesChart />
        <WeeklyActivityChart />
      </section>

      {/* Row 3: Monthly Conversion (full width) */}
      <section aria-label="Conversion rate chart">
        <MonthlyConversionChart />
      </section>
    </div>
  )
}

export default AnalyticsPage
