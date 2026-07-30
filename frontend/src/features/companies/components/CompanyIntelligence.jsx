import { Loader2, RefreshCw } from 'lucide-react'

import { Activity, ArrowUpRight, Check, Sparkles } from '@/components/ui/icons'
import Button from '@/components/ui/Button'

function CompanyIntelligence({ insight, isLoading, isGenerating, error, onGenerate }) {
  const items = insight
    ? [
        insight.industry_analysis ? { label: 'Industry analysis', text: insight.industry_analysis } : null,
        insight.business_needs ? { label: 'Business needs', text: insight.business_needs } : null,
        insight.opportunities ? { label: 'Opportunities', text: insight.opportunities } : null,
      ].filter(Boolean)
    : []

  return (
    <article className="card xl:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-control bg-brand-50 text-brand-600"><Sparkles className="size-4" /></span>
          <div><h2 className="text-base font-semibold text-ink-primary">AI insights</h2><p className="mt-1 text-sm text-ink-muted">Signals synthesized from company and industry context.</p></div>
        </div>
        {insight ? (
          <Button onClick={onGenerate} variant="secondary" size="sm" disabled={isGenerating || isLoading} leftIcon={<RefreshCw className={`size-3.5 ${isGenerating ? 'animate-spin' : ''}`} />}>
            {isGenerating ? 'Regenerating…' : 'Regenerate'}
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> Loading company insights…</div>
      ) : items.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li className="flex gap-3" key={item.label}>
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
              <div><p className="text-sm font-medium text-ink-secondary">{item.label}</p><p className="mt-1 text-sm leading-6 text-ink-muted">{item.text}</p></div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 flex flex-col items-start gap-3 border-t border-line-default pt-4 text-sm">
          <p className="text-ink-muted">No AI company insight has been generated for this account yet.</p>
          <Button onClick={onGenerate} disabled={isGenerating} leftIcon={<Sparkles className="size-3.5" />}>
            {isGenerating ? 'Generating…' : 'Generate AI insights'}
          </Button>
        </div>
      )}
    </article>
  )
}

function LeadScoreCard({ score, isLoading }) {
  const hasScore = Boolean(score)
  const value = hasScore ? score.lead_score : null
  const scoreLabel = !hasScore ? 'Not yet scored' : value >= 80 ? 'High fit' : value >= 65 ? 'Good fit' : 'Developing fit'

  return (
    <article className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-secondary">Lead score</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-primary">
            {isLoading ? '—' : (value ?? '—')}<span className="text-base font-medium text-ink-muted">/100</span>
          </h2>
        </div>
        <span className="grid size-9 place-items-center rounded-control bg-surface-muted text-ink-muted"><Activity className="size-4" /></span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand-600" style={{ width: `${hasScore ? value : 0}%` }} /></div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-medium text-success">{isLoading ? 'Loading…' : scoreLabel}</span>
        <span className="text-ink-muted">
          {hasScore ? `${Math.round(score.conversion_probability * 100)}% conversion probability` : 'Based on fit and intent'}
        </span>
      </div>
    </article>
  )
}

function RecommendationList({ insight, isLoading }) {
  // The backend doesn't produce a separate "recommendations" field — this
  // surfaces the real AI-generated opportunities/needs as focus areas
  // rather than inventing content that isn't backed by the API.
  const recommendations = insight
    ? [insight.opportunities, insight.business_needs].filter(Boolean)
    : []

  return (
    <article className="card lg:col-span-2">
      <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-secondary"><ArrowUpRight className="size-4" /></span><div><h2 className="text-base font-semibold text-ink-primary">Recommended focus areas</h2><p className="mt-1 text-sm text-ink-muted">Derived from the latest AI company insight.</p></div></div>

      {isLoading ? (
        <p className="mt-6 text-sm text-ink-muted">Loading…</p>
      ) : recommendations.length > 0 ? (
        <>
          <ol className="mt-6 space-y-3">
            {recommendations.map((recommendation, index) => (
              <li className="flex gap-3" key={recommendation}><span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-medium text-ink-secondary">{index + 1}</span><p className="pt-0.5 text-sm leading-6 text-ink-secondary">{recommendation}</p></li>
            ))}
          </ol>
          <div className="mt-6 border-t border-line-default pt-4 text-sm text-ink-muted"><Check className="mr-2 inline size-4 text-success" />Based on the current AI company insight.</div>
        </>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">Generate AI insights for this company to see recommended focus areas.</p>
      )}
    </article>
  )
}

export { LeadScoreCard, RecommendationList }
export default CompanyIntelligence
