import { useState } from 'react'
import {
  Sparkles,
  Building2,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Eye,
  Send,
  FilePlus,
  MessageSquare,
  TrendingUp,
  Target,
  Zap,
  CheckCircle2,
} from 'lucide-react'

export function LeadCard({
  lead,
  onViewProfile,
  onGenerateEmail,
  onScheduleMeeting,
  onAddNote,
}) {
  const [expandedInsights, setExpandedInsights] = useState(true)
  const [activeTab, setActiveTab] = useState('summary') // 'summary' | 'painPoints' | 'strategy'

  // Score color logic
  const getScoreColor = (score) => {
    if (score >= 85)
      return {
        badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 border-emerald-300',
        ring: 'stroke-emerald-500',
        bg: 'bg-emerald-500',
        text: 'text-emerald-700',
      }
    if (score >= 60)
      return {
        badge: 'bg-brand-50 text-brand-700 ring-brand-200 border-brand-300',
        ring: 'stroke-brand-500',
        bg: 'bg-brand-500',
        text: 'text-brand-700',
      }
    return {
      badge: 'bg-amber-50 text-amber-700 ring-amber-200 border-amber-300',
      ring: 'stroke-amber-500',
      bg: 'bg-amber-500',
      text: 'text-amber-700',
    }
  }

  // Intent badge color
  const getIntentBadge = (intent) => {
    switch (intent) {
      case 'High':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const scoreStyle = getScoreColor(lead.score)

  return (
    <article className="card-interactive group overflow-hidden border border-line-default bg-surface-default hover:shadow-floating transition-all duration-200">
      {/* Top Bar / Header info */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5 pb-4">
        {/* Contact Info & Avatar */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-indigo-700 text-white font-bold text-base shadow-xs">
            {lead.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-ink-primary truncate hover:text-brand-600 transition-colors cursor-pointer" onClick={() => onViewProfile(lead)}>
                {lead.name}
              </h3>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getIntentBadge(
                  lead.buyingIntent
                )}`}
              >
                <Zap className="size-3 mr-1 fill-current" />
                {lead.buyingIntent} Intent
              </span>
            </div>

            <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-ink-secondary">{lead.title}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-ink-primary font-medium">
                <Building2 className="size-3 text-ink-muted" />
                {lead.company}
              </span>
            </p>

            <div className="mt-2 flex items-center gap-3 text-xs text-ink-muted flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {lead.location}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 rounded bg-surface-muted px-1.5 py-0.5 text-ink-secondary">
                {lead.industry}
              </span>
              <span>•</span>
              <span className="text-ink-secondary">{lead.companySize} employees</span>
            </div>
          </div>
        </div>

        {/* Score & Deal Value Badge */}
        <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-line-default">
          <div className="flex items-center gap-2">
            <div className="relative size-11 grid place-items-center">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="stroke-surface-muted"
                  strokeWidth="3.5"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${scoreStyle.ring} transition-all duration-500`}
                  strokeDasharray={`${lead.score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className={`absolute text-xs font-extrabold ${scoreStyle.text}`}>
                {lead.score}
              </span>
            </div>
            <div className="text-right sm:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">AI Score</p>
              <p className="text-xs font-bold text-ink-primary">
                {lead.score >= 80 ? 'Hot Lead' : lead.score >= 50 ? 'Warm Lead' : 'Cold Lead'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase font-semibold text-ink-muted">Est. Value</p>
            <p className="text-sm font-extrabold text-brand-600">{lead.estimatedDealValue}</p>
          </div>
        </div>
      </div>

      {/* Attributes Strip */}
      <div className="mx-5 my-1 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-card bg-surface-muted/70 p-2.5 text-xs">
        <div>
          <span className="text-ink-muted block text-[10px]">Decision Maker</span>
          <span className="font-semibold text-ink-primary flex items-center gap-1">
            {lead.isDecisionMaker ? (
              <>
                <UserCheck className="size-3.5 text-emerald-600" /> Yes
              </>
            ) : (
              <>
                <UserX className="size-3.5 text-slate-400" /> No
              </>
            )}
          </span>
        </div>

        <div>
          <span className="text-ink-muted block text-[10px]">Last Contact</span>
          <span className="font-medium text-ink-primary flex items-center gap-1">
            <Clock className="size-3 text-ink-muted" />
            {lead.lastInteraction}
          </span>
        </div>

        <div>
          <span className="text-ink-muted block text-[10px]">Status</span>
          <span className="font-semibold text-brand-700">{lead.status}</span>
        </div>

        <div>
          <span className="text-ink-muted block text-[10px]">Best Time</span>
          <span className="font-medium text-ink-secondary truncate block" title={lead.aiInsights.bestTimeToContact}>
            {lead.aiInsights.bestTimeToContact.split(',')[0]}
          </span>
        </div>
      </div>

      {/* AI Insights Card / Section */}
      <div className="m-5 mt-3 rounded-card border border-brand-200/80 bg-gradient-to-br from-brand-50/70 via-indigo-50/40 to-surface-default p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-full bg-brand-600 text-white">
              <Sparkles className="size-3.5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">
              AI Insights & Action Plan
            </h4>
          </div>

          <button
            onClick={() => setExpandedInsights(!expandedInsights)}
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
          >
            {expandedInsights ? 'Collapse' : 'Expand'}
            {expandedInsights ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>

        {expandedInsights && (
          <div className="mt-3 space-y-3 pt-2 border-t border-brand-200/60 text-xs">
            {/* Why Promising */}
            <div>
              <p className="font-semibold text-ink-primary flex items-center gap-1.5 text-xs mb-1">
                <Target className="size-3.5 text-brand-600" /> Why this lead is promising:
              </p>
              <p className="text-ink-secondary leading-relaxed pl-5">
                {lead.aiInsights.whyPromising}
              </p>
            </div>

            {/* Sub-tabs or key callouts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Pain points */}
              <div className="rounded bg-white/80 p-2.5 border border-line-default space-y-1">
                <p className="font-semibold text-ink-primary flex items-center gap-1">
                  <TrendingUp className="size-3.5 text-amber-600" /> Key Pain Points
                </p>
                <ul className="space-y-1 pl-1">
                  {lead.aiInsights.painPoints.map((point, idx) => (
                    <li key={idx} className="text-ink-secondary flex items-start gap-1.5">
                      <span className="size-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Approach */}
              <div className="rounded bg-white/80 p-2.5 border border-line-default space-y-1">
                <p className="font-semibold text-ink-primary flex items-center gap-1">
                  <CheckCircle2 className="size-3.5 text-emerald-600" /> Recommended Strategy
                </p>
                <p className="text-ink-secondary leading-relaxed">
                  {lead.aiInsights.recommendedApproach}
                </p>
                <div className="pt-1.5 border-t border-line-default/60 flex items-center justify-between text-[11px]">
                  <span className="text-ink-muted">Channel:</span>
                  <span className="font-medium text-brand-700">{lead.aiInsights.recommendedChannel}</span>
                </div>
              </div>
            </div>

            {/* Suggested Next Action */}
            <div className="rounded-card bg-emerald-50/80 border border-emerald-200/80 p-2.5 flex items-start gap-2 text-emerald-900">
              <Zap className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-800">Suggested Next Action: </span>
                <span className="text-xs font-medium text-emerald-900">{lead.aiInsights.suggestedNextAction}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-default px-5 py-3 bg-surface-muted/30">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onViewProfile(lead)}
            className="btn btn-secondary btn-sm gap-1.5"
          >
            <Eye className="size-3.5" />
            View Profile
          </button>

          <button
            onClick={() => onGenerateEmail(lead)}
            className="btn btn-primary btn-sm gap-1.5 bg-brand-600 hover:bg-brand-700"
          >
            <Send className="size-3.5" />
            Generate Email
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onScheduleMeeting(lead)}
            className="btn btn-outline btn-sm gap-1.5"
          >
            <Calendar className="size-3.5 text-brand-600" />
            Schedule Meeting
          </button>

          <button
            onClick={() => onAddNote(lead)}
            className="btn btn-ghost btn-sm gap-1.5 text-ink-secondary"
          >
            <FilePlus className="size-3.5" />
            Add Note
          </button>
        </div>
      </div>
    </article>
  )
}
