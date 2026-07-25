import { Activity, ArrowUpRight, Check, Sparkles } from '@/components/ui/icons'

function CompanyIntelligence({ insights }) {
  return (
    <article className="card xl:col-span-2">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-brand-50 text-brand-600"><Sparkles className="size-4" /></span>
        <div><h2 className="text-base font-semibold text-ink-primary">AI insights</h2><p className="mt-1 text-sm text-ink-muted">Signals synthesized from company, market, and engagement context.</p></div>
      </div>
      <ul className="mt-6 space-y-4">
        {insights.map((insight, index) => (
          <li className="flex gap-3" key={insight}>
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
            <div><p className="text-sm font-medium text-ink-secondary">Insight {index + 1}</p><p className="mt-1 text-sm leading-6 text-ink-muted">{insight}</p></div>
          </li>
        ))}
      </ul>
    </article>
  )
}

function LeadScoreCard({ company }) {
  const scoreLabel = company.score >= 80 ? 'High fit' : company.score >= 65 ? 'Good fit' : 'Developing fit'

  return (
    <article className="card">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-ink-secondary">Lead score</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-primary">{company.score}<span className="text-base font-medium text-ink-muted">/100</span></h2></div><span className="grid size-9 place-items-center rounded-control bg-surface-muted text-ink-muted"><Activity className="size-4" /></span></div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand-600" style={{ width: `${company.score}%` }} /></div>
      <div className="mt-3 flex items-center justify-between text-sm"><span className="font-medium text-success">{scoreLabel}</span><span className="text-ink-muted">Based on fit and intent</span></div>
    </article>
  )
}

function RecommendationList({ recommendations }) {
  return (
    <article className="card lg:col-span-2">
      <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-secondary"><ArrowUpRight className="size-4" /></span><div><h2 className="text-base font-semibold text-ink-primary">Recommended next steps</h2><p className="mt-1 text-sm text-ink-muted">Prioritized actions to move this account forward.</p></div></div>
      <ol className="mt-6 space-y-3">
        {recommendations.map((recommendation, index) => (
          <li className="flex gap-3" key={recommendation}><span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-medium text-ink-secondary">{index + 1}</span><p className="pt-0.5 text-sm leading-6 text-ink-secondary">{recommendation}</p></li>
        ))}
      </ol>
      <div className="mt-6 border-t border-line-default pt-4 text-sm text-ink-muted"><Check className="mr-2 inline size-4 text-success" />Recommendations are based on the current company profile.</div>
    </article>
  )
}

export { LeadScoreCard, RecommendationList }
export default CompanyIntelligence
