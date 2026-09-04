import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Building2,
  Briefcase,
  DollarSign,
  TrendingUp,
  Clock,
  Plus,
  RefreshCw,
  Target,
  Sparkles,
  ShieldAlert,
  Flame,
  CheckCircle2,
  ArrowUpRight,
  ListTodo,
} from '@/components/ui/icons'
import { getCRMSummary, getCRMForecast } from '@/services/api/crmDashboard'
import { toggleTaskComplete } from '@/services/api/tasks'
import { useWorkspaceKey } from '@/hooks/useWorkspaceKey'
import AutomatedFollowUpsSection from './components/AutomatedFollowUpsSection'

export default function CRMDashboardPage() {
  const { workspaceKey } = useWorkspaceKey()
  const [summary, setSummary] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      const [sumData, foreData] = await Promise.all([
        getCRMSummary(),
        getCRMForecast().catch(() => null),
      ])
      setSummary(sumData)
      setForecast(foreData)
    } catch (err) {
      console.error('Failed to load CRM dashboard data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [workspaceKey])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handleToggleTask = async (taskId) => {
    try {
      await toggleTaskComplete(taskId)
      loadData()
    } catch (err) {
      console.error('Failed to toggle task:', err)
    }
  }

  const formatCurrency = (val) => {
    const num = Number(val) || 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="size-8 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              <Sparkles className="size-3.5" />
              Sales Intelligence CRM
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary sm:text-3xl">
            CRM Overview & Intelligence
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Manage your customer lifecycle, pipeline velocity, activities, and AI predictive forecasts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs font-semibold text-ink-secondary shadow-xs hover:bg-surface-muted transition-colors"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/pipeline"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-default bg-surface-default px-3.5 py-2 text-xs font-semibold text-ink-primary shadow-xs hover:bg-surface-muted transition-colors"
          >
            <Briefcase className="size-3.5 text-brand-600" />
            Kanban Pipeline
          </Link>
          <Link
            to="/opportunities"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition-colors"
          >
            <Plus className="size-3.5" />
            New Deal
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Leads */}
        <Link
          to="/leads"
          className="group relative overflow-hidden rounded-xl border border-line-default bg-surface-default p-5 shadow-xs transition-all hover:border-brand-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">Total Leads</span>
            <div className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
              <Users className="size-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink-primary">{summary?.total_leads || 0}</span>
            <span className="text-xs text-ink-muted">prospects</span>
          </div>
        </Link>

        {/* Total Accounts */}
        <Link
          to="/accounts"
          className="group relative overflow-hidden rounded-xl border border-line-default bg-surface-default p-5 shadow-xs transition-all hover:border-brand-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">Accounts</span>
            <div className="grid size-9 place-items-center rounded-lg bg-purple-50 text-purple-600 transition-transform group-hover:scale-110">
              <Building2 className="size-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink-primary">{summary?.total_accounts || 0}</span>
            <span className="text-xs text-ink-muted">companies</span>
          </div>
        </Link>

        {/* Pipeline Value */}
        <Link
          to="/pipeline"
          className="group relative overflow-hidden rounded-xl border border-line-default bg-surface-default p-5 shadow-xs transition-all hover:border-brand-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">Active Pipeline</span>
            <div className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-600 transition-transform group-hover:scale-110">
              <DollarSign className="size-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink-primary">
              {formatCurrency(summary?.pipeline_value)}
            </span>
            <span className="text-xs text-ink-muted">({summary?.open_opportunities_count || 0} open)</span>
          </div>
        </Link>

        {/* Won Revenue */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Won Revenue</span>
            <div className="grid size-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
              <TrendingUp className="size-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-300">
              {formatCurrency(summary?.won_revenue)}
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {summary?.win_rate || 0}% win rate
            </span>
          </div>
        </div>
      </div>

      {/* Automated Follow-up Recommendations & Next Steps Section (Milestone 4) */}
      <AutomatedFollowUpsSection
        recommendations={summary?.lead_recommendations || []}
        onRefresh={loadData}
      />

      {/* AI Predictive Analytics & Forecast Section */}
      <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-primary">AI Predictive Analytics & Sales Forecast</h2>
              <p className="text-xs text-ink-secondary">Live calculations driven by actual CRM deal flow and probability models.</p>
            </div>
          </div>
          {forecast?.has_sufficient_data && (
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-surface-muted px-3 py-1 text-xs">
                <span className="text-ink-muted">Expected Forecast: </span>
                <span className="font-bold text-brand-600">{formatCurrency(forecast?.expected_revenue_forecast)}</span>
              </div>
            </div>
          )}
        </div>

        {!forecast?.has_sufficient_data ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <ShieldAlert className="size-5 shrink-0 text-amber-600 mt-0.5 dark:text-amber-400" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300">Insufficient Historical Data for Reliable AI Forecasting</h4>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed dark:text-amber-300">
                  {forecast?.message || 'We need at least 3 active or closed opportunities in your pipeline to calculate reliable statistical win rates and projected revenue curves. Currently found ' + (forecast?.data_points_count || 0) + ' deals.'}
                </p>
                <div className="mt-3">
                  <Link
                    to="/opportunities"
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200"
                  >
                    Create and qualify deals to activate predictive models &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* High Potential Deals */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">High-Probability Deals</h3>
                </div>
                <span className="text-xs text-emerald-700 font-medium dark:text-emerald-400">{forecast.high_potential_deals?.length || 0} active</span>
              </div>
              <div className="space-y-2">
                {forecast.high_potential_deals?.length === 0 ? (
                  <p className="text-xs text-ink-muted py-2">No high-probability deals detected yet.</p>
                ) : (
                  forecast.high_potential_deals?.map((deal) => (
                    <Link
                      key={deal.id}
                      to={`/opportunities/${deal.id}`}
                      className="flex items-center justify-between rounded-lg bg-surface-default p-3 shadow-2xs border border-emerald-100 hover:border-emerald-300 transition-colors dark:border-emerald-500/20 dark:hover:border-emerald-500/40"
                    >
                      <div>
                        <p className="text-xs font-semibold text-ink-primary">{deal.name}</p>
                        <p className="text-[11px] text-ink-muted capitalize">Stage: {deal.stage}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(deal.amount)}</p>
                        <p className="text-[11px] font-semibold text-ink-secondary">{deal.probability || 60}% Prob.</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* At-Risk Deals */}
            <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-300">At-Risk Opportunities</h3>
                </div>
                <span className="text-xs text-rose-700 font-medium dark:text-rose-400">{forecast.at_risk_deals?.length || 0} detected</span>
              </div>
              <div className="space-y-2">
                {forecast.at_risk_deals?.length === 0 ? (
                  <p className="text-xs text-ink-muted py-2">No deals currently flagged at critical risk.</p>
                ) : (
                  forecast.at_risk_deals?.map((deal) => (
                    <Link
                      key={deal.id}
                      to={`/opportunities/${deal.id}`}
                      className="flex items-center justify-between rounded-lg bg-surface-default p-3 shadow-2xs border border-rose-100 hover:border-rose-300 transition-colors dark:border-rose-500/20 dark:hover:border-rose-500/40"
                    >
                      <div>
                        <p className="text-xs font-semibold text-ink-primary">{deal.name}</p>
                        <p className="text-[11px] text-rose-600 capitalize dark:text-rose-400">Stage: {deal.stage}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-ink-primary">{formatCurrency(deal.amount)}</p>
                        <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{deal.probability || 20}% Prob.</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout: Upcoming Tasks & Recent Activities */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <ListTodo className="size-4" />
              </div>
              <h2 className="text-base font-bold text-ink-primary">Upcoming Tasks</h2>
            </div>
            <Link
              to="/tasks"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              View All Tasks &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {(!summary?.upcoming_tasks || summary.upcoming_tasks.length === 0) ? (
              <div className="py-8 text-center text-xs text-ink-muted">
                No pending tasks. You're all caught up!
              </div>
            ) : (
              summary.upcoming_tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-xl border border-line-default bg-surface-subtle p-3.5 transition-colors hover:bg-surface-default"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      className="text-ink-muted hover:text-brand-600 transition-colors"
                      title="Mark as completed"
                    >
                      <CheckCircle2 className="size-5" />
                    </button>
                    <div>
                      <p className="text-xs font-semibold text-ink-primary">{task.title}</p>
                      {task.due_date && (
                        <p className="text-[11px] text-ink-muted">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      task.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700'
                        : task.priority === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent CRM Activities */}
        <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Clock className="size-4" />
              </div>
              <h2 className="text-base font-bold text-ink-primary">Recent Activity Feed</h2>
            </div>
            <span className="text-xs text-ink-muted">Live sync</span>
          </div>

          <div className="space-y-3">
            {(!summary?.recent_activities || summary.recent_activities.length === 0) ? (
              <div className="py-8 text-center text-xs text-ink-muted">
                No recent activity logged across the CRM.
              </div>
            ) : (
              summary.recent_activities.map((act) => (
                <div
                  key={act.id}
                  className="rounded-xl border border-line-default bg-surface-subtle p-3 transition-colors hover:bg-surface-default"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">
                      {act.interaction_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-ink-muted">
                      {new Date(act.interaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-primary font-medium">{act.summary || 'Interaction logged.'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
