import { Flame, TrendingUp, CheckCircle, Zap, ArrowUpRight, Award, BarChart3 } from 'lucide-react'

export function RightSidebar({ leads, onSelectLead }) {
  // Compute analytics from lead list (only leads with a real AI score count
  // toward score-based stats; leads not yet scored are excluded rather than
  // treated as 0, so the average isn't dragged down by ungenerated leads).
  const scoredLeads = leads.filter((l) => l.hasScore)

  const hotLeads = scoredLeads
    .filter((l) => l.score >= 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  const avgScore = scoredLeads.length
    ? Math.round(scoredLeads.reduce((acc, l) => acc + l.score, 0) / scoredLeads.length)
    : 0

  const totalQualified = leads.filter(
    (l) => l.status === 'qualified' || l.status === 'negotiation'
  ).length

  const highIntentCount = leads.filter((l) => l.buyingIntent === 'High').length
  const conversionPrediction = Math.min(
    92,
    Math.round((highIntentCount / (leads.length || 1)) * 100 + 35)
  )

  return (
    <aside className="space-y-5">
      {/* Overview Stat Cards */}
      <div className="card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-ink-primary flex items-center justify-between border-b border-line-default pb-3">
          <span>AI Intelligence Summary</span>
          <span className="flex items-center gap-1 text-[11px] font-normal text-emerald-600">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Average Lead Score */}
          <div className="rounded-card bg-brand-50/80 border border-brand-100 p-3 dark:bg-brand-500/10 dark:border-brand-500/20">
            <div className="flex items-center justify-between text-brand-700 dark:text-brand-300">
              <span className="text-[11px] font-medium">Avg Lead Score</span>
              <Award className="size-4" />
            </div>
            <p className="text-2xl font-extrabold text-brand-700 mt-1 dark:text-brand-300">{avgScore}</p>
            <p className="text-[10px] text-brand-600 mt-0.5 dark:text-brand-400">out of 100 max</p>
          </div>

          {/* Qualified Leads */}
          <div className="rounded-card bg-emerald-50/80 border border-emerald-100 p-3 dark:bg-emerald-500/10 dark:border-emerald-500/20">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
              <span className="text-[11px] font-medium">Qualified Leads</span>
              <CheckCircle className="size-4" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1 dark:text-emerald-400">{totalQualified}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5 dark:text-emerald-400">High opportunity</p>
          </div>
        </div>

        {/* Conversion Prediction */}
        <div className="rounded-card border border-line-default bg-surface-muted/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-primary">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="size-4 text-brand-600" />
              Conversion Likelihood
            </span>
            <span className="text-brand-600 font-bold">{conversionPrediction}%</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-line-default">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${conversionPrediction}%` }}
            />
          </div>
          <p className="text-[11px] text-ink-muted leading-tight">
            AI estimates <span className="font-semibold text-ink-primary">{conversionPrediction}%</span> of your top prospects will advance to proposal stage this month.
          </p>
        </div>
      </div>

      {/* Top Hot Leads Widget */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-line-default pb-3">
          <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-1.5">
            <Flame className="size-4 text-amber-500 fill-amber-500" />
            Top Hot Leads
          </h3>
          <span className="text-xs text-ink-muted font-medium">{hotLeads.length} leads</span>
        </div>

        <div className="space-y-2.5">
          {hotLeads.length === 0 ? (
            <p className="text-xs text-ink-muted text-center py-4">
              No leads scored ≥ 80 yet. Run AI scoring on your leads to highlight top opportunities.
            </p>
          ) : (
            hotLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="flex items-center justify-between gap-2 rounded-card border border-line-default p-2.5 hover:border-brand-300 hover:bg-brand-50/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-indigo-700 text-white text-xs font-bold">
                    {lead.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-primary truncate group-hover:text-brand-600 transition-colors">
                      {lead.name}
                    </p>
                    <p className="text-[11px] text-ink-muted truncate">
                      {lead.company}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-xs px-2 py-0.5 ring-1 ring-emerald-200">
                    {lead.score}
                  </span>
                  <ArrowUpRight className="size-3.5 text-ink-muted group-hover:text-brand-600" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Recommendations Card */}
      <div className="rounded-card border border-indigo-200 bg-gradient-to-br from-indigo-50 to-brand-50 p-4 space-y-2 text-xs dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-brand-500/10">
        <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
          <Zap className="size-4 text-indigo-600 dark:text-indigo-400" />
          <span>Smart Assistant Tip</span>
        </div>
        <p className="text-indigo-800 leading-relaxed dark:text-indigo-300">
          Leads with buying intent <span className="font-semibold text-emerald-700 dark:text-emerald-400">"High"</span> respond 3.2x faster to direct executive emails sent between 10:00 AM and 11:30 AM.
        </p>
      </div>
    </aside>
  )
}
