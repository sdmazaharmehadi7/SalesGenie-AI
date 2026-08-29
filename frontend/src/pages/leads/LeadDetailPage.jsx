import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Building2,
  Mail,
  Phone,
  DollarSign,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Briefcase,
  Flame,
  CheckCircle2,
  TrendingUp,
  Plus,
} from '@/components/ui/icons'
import { getLead, updateLead, deleteLead } from '@/services/api/leads'
import { getLatestLeadScore, generateLeadScore } from '@/services/api/leadScores'
import { getLatestCompanyInsight, generateCompanyInsight } from '@/services/api/companyInsights'
import { createOpportunity } from '@/services/api/opportunities'
import ActivityTimeline from '@/components/common/ActivityTimeline'
import { useWorkspaceKey } from '@/hooks/useWorkspaceKey'
import { listWorkspaceMembers } from '@/services/api/workspaces'
import { useToast } from '@/context/ToastContext'

const LEAD_STATUSES = [
  'new',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
]

export default function LeadDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { workspaceKey, activeWorkspace, isPersonal, isManager } = useWorkspaceKey()
  const { showToast } = useToast()

  const [lead, setLead] = useState(null)
  const [members, setMembers] = useState([])
  const [score, setScore] = useState(null)
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scoringAi, setScoringAi] = useState(false)
  const [analyzingAi, setAnalyzingAi] = useState(false)
  const [creatingOpp, setCreatingOpp] = useState(false)
  const [reassigning, setReassigning] = useState(false)

  const loadLeadData = async () => {
    setLoading(true)
    try {
      const leadData = await getLead(id)
      setLead(leadData)

      // Fetch AI score and company insight gracefully without blocking lead display
      const [scoreData, insightData] = await Promise.all([
        getLatestLeadScore(id).catch(() => null),
        getLatestCompanyInsight(id).catch(() => null),
      ])
      setScore(scoreData)
      setInsight(insightData)
    } catch (err) {
      console.error('Failed to load lead details:', err)
      setLead(null)
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    if (!activeWorkspace?.id || isPersonal) {
      setMembers([])
      return
    }
    try {
      const mems = await listWorkspaceMembers(activeWorkspace.id)
      setMembers(mems || [])
    } catch (err) {
      console.error('Failed to load members in LeadDetailPage:', err)
      setMembers([])
    }
  }

  useEffect(() => {
    loadLeadData()
    loadMembers()
  }, [id, workspaceKey])

  const handleScoreLead = async () => {
    setScoringAi(true)
    try {
      const newScore = await generateLeadScore(id)
      setScore(newScore)
    } catch (err) {
      console.error('Failed to generate lead score:', err)
    } finally {
      setScoringAi(false)
    }
  }

  const handleGenerateInsights = async () => {
    setAnalyzingAi(true)
    try {
      const newInsight = await generateCompanyInsight(id)
      setInsight(newInsight)
    } catch (err) {
      console.error('Failed to generate company insights:', err)
    } finally {
      setAnalyzingAi(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      const updated = await updateLead(id, { lead_status: newStatus })
      setLead(updated)
    } catch (err) {
      console.error('Failed to update lead status:', err)
    }
  }

  const handleConvertToDeal = async () => {
    setCreatingOpp(true)
    try {
      const opp = await createOpportunity({
        name: `${lead.company_name} - Initial Deal`,
        amount: lead.deal_value ? parseFloat(lead.deal_value) : 10000,
        stage: 'qualified',
        probability: score ? Math.round(score.conversion_probability * 100) : 50,
        lead_id: lead.id,
        account_id: lead.account_id || undefined,
        notes: `Converted from lead ${lead.contact_name || lead.company_name}`,
      })
      navigate(`/opportunities/${opp.id}`)
    } catch (err) {
      console.error('Failed to convert lead to opportunity:', err)
    } finally {
      setCreatingOpp(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this lead?')) return
    try {
      await deleteLead(id)
      navigate('/leads')
    } catch (err) {
      console.error('Failed to delete lead:', err)
    }
  }

  const handleAssignLead = async (newAssigneeId) => {
    setReassigning(true)
    try {
      const updated = await updateLead(id, { assigned_to: newAssigneeId || null })
      setLead(updated)
      showToast('Lead assignment updated successfully!', 'success')
    } catch (err) {
      console.error('Failed to reassign lead:', err)
      showToast('Failed to reassign lead.', 'error')
    } finally {
      setReassigning(false)
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

  const assignedMember = members.find((m) => m.user_id === (lead?.assigned_to || lead?.owner_id))

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="size-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-ink-muted">Lead not found.</p>
        <Link to="/leads" className="mt-2 inline-block text-xs font-semibold text-brand-600">
          &larr; Back to Leads
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Back Link */}
      <div>
        <Link
          to="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
        >
          <ArrowLeft className="size-3.5" />
          Back to Leads
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <Users className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Lead Profile</span>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 uppercase">
                  {lead.lead_status.replace('_', ' ')}
                </span>
                {assignedMember && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                    Assigned: {assignedMember.user_name || assignedMember.user_email}
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary">
                {lead.contact_name || lead.company_name}
              </h1>
              <p className="text-xs text-ink-secondary font-medium mt-0.5">
                {lead.company_name} {lead.industry ? `&bull; ${lead.industry}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleConvertToDeal}
              disabled={creatingOpp}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <Briefcase className="size-3.5" />
              {creatingOpp ? 'Converting...' : 'Convert to Opportunity'}
            </button>
            <button
              type="button"
              onClick={handleScoreLead}
              disabled={scoringAi}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles className={`size-3.5 ${scoringAi ? 'animate-spin' : ''}`} />
              {scoringAi ? 'Scoring...' : 'AI Lead Score'}
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

        {/* Lead Status Stepper */}
        <div className="mt-6 border-t border-line-default pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mr-2">Status:</span>
            {LEAD_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-all ${
                  lead.lead_status === st
                    ? 'border-brand-600 bg-brand-600 text-white shadow-2xs'
                    : 'border-line-default bg-surface-subtle text-ink-secondary hover:bg-surface-muted'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Score & Intelligence Widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Score Card */}
        <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">AI Lead Score</span>
              <Sparkles className="size-4 text-brand-600" />
            </div>
            {score ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-brand-600">{score.lead_score}</span>
                  <span className="text-sm font-semibold text-ink-muted">/ 100</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-ink-secondary mb-1">
                    <span>Conversion Probability</span>
                    <strong className="text-ink-primary">
                      {Math.round(score.conversion_probability * 100)}%
                    </strong>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all duration-500"
                      style={{ width: `${Math.round(score.conversion_probability * 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-ink-muted">
                  Last scored: {new Date(score.generated_at).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-ink-muted">
                No score generated yet. Click "AI Lead Score" to analyze this lead with Gemini.
              </div>
            )}
          </div>

          {!score && (
            <button
              type="button"
              onClick={handleScoreLead}
              disabled={scoringAi}
              className="mt-4 w-full rounded-lg bg-brand-50 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100"
            >
              Generate First Score
            </button>
          )}
        </div>

        {/* AI Company Insights Card */}
        <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-purple-600" />
              <h3 className="text-sm font-bold text-ink-primary">AI Company Intelligence</h3>
            </div>
            <button
              type="button"
              onClick={handleGenerateInsights}
              disabled={analyzingAi}
              className="text-xs font-bold text-brand-600 hover:underline"
            >
              {analyzingAi ? 'Analyzing...' : insight ? 'Regenerate' : 'Generate'}
            </button>
          </div>

          {insight ? (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-surface-subtle p-4 border border-line-default">
                <p className="font-semibold text-ink-secondary mb-1">Company Summary</p>
                <p className="text-ink-primary leading-relaxed">{insight.summary || 'No summary available.'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3.5">
                  <p className="font-bold text-brand-700 mb-1">Business Pain Points</p>
                  <p className="text-ink-secondary leading-relaxed">{insight.pain_points || 'None identified yet.'}</p>
                </div>
                <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3.5">
                  <p className="font-bold text-emerald-700 mb-1">Budget / Signals</p>
                  <p className="text-ink-secondary leading-relaxed">{insight.budget_signals || 'No signals recorded.'}</p>
                </div>
              </div>

              {insight.tech_stack && (
                <div className="rounded-xl bg-surface-subtle p-3 border border-line-default">
                  <span className="font-semibold text-ink-muted">Detected Tech Stack: </span>
                  <span className="text-ink-primary font-mono text-[11px]">{insight.tech_stack}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-ink-muted">
              Click "Generate" to run Gemini company intelligence and discovery research.
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout: Details & Activity Timeline */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Lead Info Column */}
        <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs lg:col-span-1 space-y-4">
          <h3 className="text-base font-bold text-ink-primary border-b border-line-default pb-3">Lead Information</h3>
          <dl className="space-y-3 text-xs">
            <div>
              <dt className="font-semibold text-ink-muted">Estimated Deal Value</dt>
              <dd className="mt-1 font-bold text-emerald-600">{formatCurrency(lead.deal_value)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-muted">Contact Name</dt>
              <dd className="mt-1 font-medium text-ink-primary">{lead.contact_name || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-muted">Email</dt>
              <dd className="mt-1 font-medium text-brand-600">{lead.email || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-muted">Phone</dt>
              <dd className="mt-1 font-medium text-ink-primary">{lead.phone || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-muted">Company</dt>
              <dd className="mt-1 font-medium text-ink-primary">{lead.company_name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-muted">Industry</dt>
              <dd className="mt-1 font-medium text-ink-primary">{lead.industry || '—'}</dd>
            </div>

            {/* Assignment Section */}
            {!isPersonal && (
              <div className="border-t border-line-default pt-3">
                <dt className="font-semibold text-ink-muted mb-1.5">Assigned Sales Rep</dt>
                {isManager && members.length > 0 ? (
                  <dd>
                    <select
                      className="input w-full text-xs font-medium"
                      value={lead.assigned_to || ''}
                      disabled={reassigning}
                      onChange={(e) => handleAssignLead(e.target.value)}
                    >
                      <option value="">(Unassigned / Creator)</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.user_name || m.user_email} ({m.role === 'manager' ? 'Manager' : 'Member'})
                        </option>
                      ))}
                    </select>
                  </dd>
                ) : (
                  <dd className="font-medium text-ink-primary">
                    {assignedMember ? (assignedMember.user_name || assignedMember.user_email) : 'Unassigned'}
                  </dd>
                )}
              </div>
            )}
          </dl>

          <div className="mt-6 border-t border-line-default pt-4">
            <Link
              to="/outreach-generator"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-default bg-surface-subtle py-2 text-xs font-semibold text-ink-primary hover:bg-surface-muted"
            >
              <Mail className="size-3.5" />
              Generate Outreach Email
            </Link>
          </div>
        </div>

        {/* Timeline Column */}
        <div className="lg:col-span-2">
          <ActivityTimeline leadId={lead.id} />
        </div>
      </div>
    </div>
  )
}
