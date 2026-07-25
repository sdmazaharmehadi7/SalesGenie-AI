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

const metrics = [
  { label: 'Total leads', value: '1,284', change: '+12.5%', icon: Users },
  { label: 'Qualified leads', value: '486', change: '+8.2%', icon: Check },
  { label: 'Conversion rate', value: '18.6%', change: '+2.4%', icon: Activity },
  { label: 'Revenue', value: '$84,260', change: '+16.8%', icon: ArrowUpRight },
]

const monthlyLeads = [
  { month: 'Jan', leads: 84 },
  { month: 'Feb', leads: 106 },
  { month: 'Mar', leads: 98 },
  { month: 'Apr', leads: 127 },
  { month: 'May', leads: 142 },
  { month: 'Jun', leads: 162 },
  { month: 'Jul', leads: 154 },
]

const funnelData = [
  { name: 'Captured', value: 1284, fill: '#3b6eea' },
  { name: 'Qualified', value: 486, fill: '#5c91f6' },
  { name: 'Proposal', value: 212, fill: '#7da8f8' },
  { name: 'Won', value: 94, fill: '#bcd4ff' },
]

const pipelineData = [
  { stage: 'Discovery', value: 34 },
  { stage: 'Qualification', value: 26 },
  { stage: 'Proposal', value: 18 },
  { stage: 'Negotiation', value: 12 },
  { stage: 'Closed won', value: 10 },
]

const activities = [
  { action: 'Maya Chen moved to Qualified', detail: 'Lead score updated to 84', time: '12 min ago', icon: Users },
  { action: 'Proposal sent to Northstar Labs', detail: 'Enterprise plan · $24,000', time: '45 min ago', icon: Mail },
  { action: 'Call summary generated', detail: 'Orbit Systems discovery call', time: '2 hr ago', icon: Sparkles },
]

const tasks = [
  { title: 'Follow up with Maya Chen', meta: 'Today · High priority' },
  { title: 'Review Q3 outreach sequence', meta: 'Today · Marketing' },
  { title: 'Prepare Northstar proposal', meta: 'Tomorrow · Sales' },
]

const meetings = [
  { title: 'Discovery call · Orbit Systems', time: '10:00 AM – 10:30 AM', people: '3 attendees' },
  { title: 'Pipeline review', time: '1:30 PM – 2:00 PM', people: 'Sales team' },
  { title: 'Demo · Pine & Co.', time: '4:00 PM – 4:45 PM', people: '2 attendees' },
]

const tooltipStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 8px 24px rgb(15 23 42 / 0.10)',
  fontSize: '12px',
}

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

function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-brand-600">Monday, July 24</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-primary">Good morning, Sales Team</h1>
          <p className="mt-2 text-sm text-ink-muted">Here’s what’s happening across your pipeline today.</p>
        </div>
        <Button leftIcon={<Plus className="size-4" />}>Add lead</Button>
      </header>

      <section aria-label="Pipeline overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
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
              <p className="mt-1.5 text-xs text-ink-muted"><span className="font-medium text-success">{metric.change}</span> from last month</p>
            </article>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="card min-h-[22rem] xl:col-span-2">
          <SectionHeader action={<button className="text-sm font-medium text-brand-600 hover:text-brand-700" type="button">View report</button>} description="New leads created over the last seven months">
            Monthly leads
          </SectionHeader>
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
                <YAxis axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1' }} formatter={(value) => [value, 'Leads']} />
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
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value.toLocaleString(), 'Leads']} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive={false}>
                  <LabelList dataKey="name" fill="#475569" position="right" stroke="none" />
                  {funnelData.map((entry) => <Cell fill={entry.fill} key={entry.name} />)}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <article className="card min-h-[22rem] xl:col-span-3">
          <SectionHeader action={<button className="text-sm font-medium text-brand-600 hover:text-brand-700" type="button">View pipeline</button>} description="$428,000 across active opportunities">
            Sales pipeline
          </SectionHeader>
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={pipelineData} layout="vertical" margin={{ top: 0, right: 16, left: 22, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                <XAxis axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} type="number" unit="%" />
                <YAxis axisLine={false} dataKey="stage" tick={{ fill: '#475569', fontSize: 12 }} tickLine={false} type="category" width={86} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(value) => [`${value}%`, 'Share of pipeline']} />
                <Bar dataKey="value" fill="#475569" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card xl:col-span-2">
          <SectionHeader action={<button aria-label="More activity options" className="rounded-control p-1 text-ink-muted hover:bg-surface-muted" type="button"><MoreHorizontal className="size-5" /></button>} description="Latest sales movement">
            Recent activity
          </SectionHeader>
          <div className="divide-y divide-line-default">
            {activities.map((activity) => {
              const Icon = activity.icon

              return (
                <div className="flex gap-3 py-3 first:pt-0 last:pb-0" key={activity.action}>
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted"><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-primary">{activity.action}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">{activity.detail}</p>
                  </div>
                  <time className="shrink-0 text-xs text-ink-muted">{activity.time}</time>
                </div>
              )
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="card">
          <SectionHeader action={<button className="text-sm font-medium text-brand-600 hover:text-brand-700" type="button">View all</button>} description="Keep your day on track">
            Upcoming tasks
          </SectionHeader>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div className="flex items-start gap-3" key={task.title}>
                <button aria-label={`Complete ${task.title}`} className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-line-strong text-transparent hover:border-brand-500 hover:text-brand-600" type="button"><Check className="size-3" /></button>
                <div><p className="text-sm font-medium text-ink-primary">{task.title}</p><p className="mt-0.5 text-xs text-ink-muted">{task.meta}</p></div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <SectionHeader action={<button className="text-sm font-medium text-brand-600 hover:text-brand-700" type="button">Calendar</button>} description="Today’s scheduled conversations">
            Recent meetings
          </SectionHeader>
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div className="flex gap-3" key={meeting.title}>
                <span className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted"><Calendar className="size-4" /></span>
                <div><p className="text-sm font-medium text-ink-primary">{meeting.title}</p><p className="mt-0.5 text-xs text-ink-muted">{meeting.time} · {meeting.people}</p></div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <SectionHeader description="Start common sales workflows">Quick actions</SectionHeader>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <Button className="justify-start" leftIcon={<Plus className="size-4" />} variant="secondary">Add a lead</Button>
            <Button className="justify-start" leftIcon={<Mail className="size-4" />} variant="secondary">Create outreach</Button>
            <Button className="justify-start" leftIcon={<FileText className="size-4" />} variant="secondary">Add a note</Button>
          </div>
        </article>
      </section>
    </div>
  )
}

export default DashboardPage
