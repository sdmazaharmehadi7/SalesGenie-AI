// Maps raw backend Lead / LeadScore / CompanyInsight API shapes into the
// flat view-model shape the Lead Intelligence UI (LeadCard, RightSidebar,
// ActionModals) renders.

export const STATUS_LABELS = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
}

export function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return 'N/A'
  const num = Number(value)
  if (Number.isNaN(num)) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num)
}

export function timeAgo(dateStr) {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return 'N/A'
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay} days ago`
  return date.toLocaleDateString()
}

export function buyingIntentFromProbability(prob) {
  if (prob === null || prob === undefined) return 'Unscored'
  if (prob >= 0.7) return 'High'
  if (prob >= 0.4) return 'Medium'
  return 'Low'
}

/**
 * @param {object} lead - raw LeadRead/LeadListItem from the backend
 * @param {object|null} score - raw LeadScoreRead from the backend (or null)
 * @param {object|null} insight - raw CompanyInsightRead from the backend (or null)
 */
export function mapLeadIntelligence(lead, score, insight) {
  return {
    _raw: lead,
    id: lead.id,
    name: lead.contact_name || 'Unnamed Contact',
    company: lead.company_name,
    industry: lead.industry || 'Unspecified',
    email: lead.email,
    phone: lead.phone,
    avatar: initials(lead.contact_name || lead.company_name),

    score: score ? score.lead_score : null,
    conversionProbability: score ? score.conversion_probability : null,
    scoreGeneratedAt: score ? score.generated_at : null,
    buyingIntent: buyingIntentFromProbability(score?.conversion_probability),

    estimatedDealValue: formatCurrency(lead.deal_value),
    dealValueNum: lead.deal_value ? Number(lead.deal_value) : 0,

    status: lead.lead_status,
    statusLabel: STATUS_LABELS[lead.lead_status] || lead.lead_status,

    updatedAt: lead.updated_at,
    lastInteraction: timeAgo(lead.updated_at),

    insight: insight
      ? {
          businessNeeds: insight.business_needs,
          opportunities: insight.opportunities,
          industryAnalysis: insight.industry_analysis,
          generatedAt: insight.generated_at,
        }
      : null,

    hasScore: Boolean(score),
    hasInsight: Boolean(insight),
  }
}
