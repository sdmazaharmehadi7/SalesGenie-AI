import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Building2,
  Users,
  DollarSign,
  Calendar,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Trash2,
  TrendingUp,
  ShieldAlert,
  Flame,
  Check,
  CheckCircle2,
} from '@/components/ui/icons'
import {
  getOpportunity,
  updateOpportunityStage,
  analyzeOpportunityDeal,
  deleteOpportunity,
} from '@/services/api/opportunities'
import ActivityTimeline from '@/components/common/ActivityTimeline'

const STAGES = [
  { key: 'new', label: 'New' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'demo', label: 'Demo' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Closed Won' },
  { key: 'lost', label: 'Closed Lost' },
]

export default function OpportunityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [opp, setOpp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzingAi, setAnalyzingAi] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState(null)

  const loadOpportunity = async () => {
    setLoading(true)
    try {
      const data = await getOpportunity(id)
      setOpp(data)
    } catch (err) {
      console.error('Failed to load opportunity:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOpportunity()
  }, [id])

  const handleStageClick = async (stageKey) => {
    try {
      const updated = await updateOpportunityStage(id, stageKey)
      setOpp(updated)
    } catch (err) {
      console.error('Failed to update stage:', err)
    }
  }

  const handleAnalyzeAI = async () => {
    setAnalyzingAi(true)
    try {
      const res = await analyzeOpportunityDeal(id)
      setAiAnalysis(res)
    } catch (err) {
      console.error('Failed to run AI risk analysis:', err)
    } finally {
      setAnalyzingAi(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this opportunity?')) return
    try {
      await deleteOpportunity(id)
      navigate('/opportunities')
    } catch (err) {
      console.error('Failed to delete opportunity:', err)
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

  if (!opp) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-ink-muted">Opportunity not found.</p>
        <Link to="/opportunities" className="mt-2 inline-block text-xs font-semibold text-brand-600">
          &larr; Back to Opportunities
        </Link>
      </div>
    )
  }

  const currentStageIndex = STAGES.findIndex((s) => s.key === opp.stage)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Back Link */}
      <div>
        <Link
          to="/opportunities"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
        >
          <ArrowLeft className="size-3.5" />
          Back to Deals & Pipeline
        </Link>
      </div>

      {/* Deal Header */}
      <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
              <Briefcase className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Opportunity</span>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 uppercase">
                  {opp.stage}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary">{opp.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-secondary">
                <span>Deal Value: <strong className="text-ink-primary font-bold">{formatCurrency(opp.amount)}</strong></span>
                <span>Probability: <strong className="text-ink-primary">{opp.probability ?? 20}%</strong></span>
                {opp.expected_close_date && (
                  <span>Target Close: <strong className="text-ink-primary">{new Date(opp.expected_close_date).toLocaleDateString()}</strong></span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleAnalyzeAI}
              disabled={analyzingAi}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:from-amber-600 hover:to-brand-700 disabled:opacity-50 transition-all"
            >
              <Sparkles className={`size-3.5 ${analyzingAi ? 'animate-spin' : ''}`} />
              {analyzingAi ? 'Analyzing Deal Health...' : 'AI Risk Analysis & Next Step'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        </div>

        {/* Stage Progression Stepper */}
        <div className="mt-8 border-t border-line-default pt-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-3">
            Pipeline Stage Progression (Click to advance stage)
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {STAGES.map((s, idx) => {
              const isCurrent = s.key === opp.stage
              const isPast = idx < currentStageIndex && opp.stage !== 'lost'

              let btnClass = 'bg-surface-subtle text-ink-secondary border-line-default hover:bg-surface-muted'
              if (isCurrent) {
                btnClass = s.key === 'won'
                  ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                  : s.key === 'lost'
                  ? 'bg-slate-700 text-white border-slate-700 font-bold shadow-xs'
                  : 'bg-brand-600 text-white border-brand-600 font-bold shadow-xs'
              } else if (isPast) {
                btnClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
              }

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleStageClick(s.key)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all ${btnClass}`}
                >
                  {isPast && <Check className="size-3" />}
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* AI Deal Risk & Action Analysis Section */}
      {aiAnalysis && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/40 via-surface-default to-brand-50/30 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-amber-500 text-white">
                <Sparkles className="size-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-primary">Gemini Deal Intelligence & Risk Assessment</h3>
                <p className="text-xs text-ink-muted">Automated opportunity health diagnostic</p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                aiAnalysis.risk_level === 'Low'
                  ? 'bg-emerald-100 text-emerald-800'
                  : aiAnalysis.risk_level === 'Critical' || aiAnalysis.risk_level === 'High'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Risk Level: {aiAnalysis.risk_level}
            </span>
          </div>

          <div className="mb-4 rounded-xl bg-surface-default p-4 border border-line-default shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">Recommended Next-Best Action</h4>
            <p className="mt-1 text-sm font-semibold text-ink-primary">{aiAnalysis.next_best_action}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-surface-default p-4 border border-line-default">
              <div className="flex items-center gap-1.5 text-rose-700 mb-2">
                <ShieldAlert className="size-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Identified Risk Factors</h4>
              </div>
              <ul className="space-y-1.5">
                {aiAnalysis.risk_factors?.map((factor, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-ink-secondary">
                    <span className="size-1.5 rounded-full bg-rose-500" />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-surface-default p-4 border border-line-default">
              <div className="flex items-center gap-1.5 text-emerald-700 mb-2">
                <Flame className="size-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Tactical Recommendations</h4>
              </div>
              <ul className="space-y-1.5">
                {aiAnalysis.recommendations?.map((rec, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-ink-secondary">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Deal Details & Activity Timeline */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Deal Details Column */}
        <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs lg:col-span-1 space-y-5">
          <h3 className="text-base font-bold text-ink-primary border-b border-line-default pb-3">Deal Information</h3>

          <dl className="space-y-4 text-xs">
            <div>
              <dt className="font-semibold text-ink-muted">Expected Revenue Contribution</dt>
              <dd className="mt-1 text-sm font-bold text-emerald-600">
                {formatCurrency((opp.amount || 0) * ((opp.probability ?? 20) / 100))}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-ink-muted">Stage</dt>
              <dd className="mt-1 font-semibold text-ink-primary uppercase">{opp.stage}</dd>
            </div>

            <div>
              <dt className="font-semibold text-ink-muted">Win / Close Status</dt>
              <dd className="mt-1 text-ink-secondary">
                {opp.is_closed ? (opp.is_won ? 'Closed Won 🎉' : 'Closed Lost') : 'Open in Pipeline'}
              </dd>
            </div>

            {opp.account_id && (
              <div>
                <dt className="font-semibold text-ink-muted">Linked Account</dt>
                <dd className="mt-1">
                  <Link to={`/accounts/${opp.account_id}`} className="font-semibold text-brand-600 hover:underline flex items-center gap-1">
                    <Building2 className="size-3" />
                    View Account
                  </Link>
                </dd>
              </div>
            )}

            {opp.contact_id && (
              <div>
                <dt className="font-semibold text-ink-muted">Key Contact</dt>
                <dd className="mt-1">
                  <Link to={`/contacts/${opp.contact_id}`} className="font-semibold text-brand-600 hover:underline flex items-center gap-1">
                    <Users className="size-3" />
                    View Contact
                  </Link>
                </dd>
              </div>
            )}

            {opp.notes && (
              <div className="border-t border-line-default pt-4">
                <dt className="font-semibold text-ink-muted">Strategy Notes</dt>
                <dd className="mt-1 text-xs text-ink-secondary leading-relaxed bg-surface-subtle p-3 rounded-lg border border-line-subtle">
                  {opp.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Timeline Column */}
        <div className="lg:col-span-2">
          <ActivityTimeline opportunityId={opp.id} />
        </div>
      </div>
    </div>
  )
}
