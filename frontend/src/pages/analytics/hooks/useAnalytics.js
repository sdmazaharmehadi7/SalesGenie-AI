import { useCallback, useEffect, useState } from 'react'

import { getLeads } from '@/services/api/leads'
import { listInteractions } from '@/services/api/conversations'
import { getCampaigns } from '@/services/api/outreach'
import { getDashboardSummary, getSnapshotHistory, recordSnapshot } from '@/services/api/analytics'

const STATUS_LABELS = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const INTERACTION_TYPE_KEYS = ['call', 'email', 'meeting', 'demo', 'other']

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.error?.message || err?.message || fallback
}

/** Builds the funnel series from the live `stages` breakdown, in pipeline
 * order, keeping closed-lost out of the funnel visual (it's a dead end,
 * not a stage leads flow through) but returning its count separately. */
function mapStages(stages) {
  const byStatus = Object.fromEntries((stages || []).map((s) => [s.status, s.count]))
  const funnelOrder = ['new', 'qualified', 'proposal', 'negotiation', 'closed_won']
  const funnel = funnelOrder.map((status) => ({
    name: STATUS_LABELS[status],
    status,
    value: byStatus[status] || 0,
  }))
  return { funnel, closedLost: byStatus.closed_lost || 0 }
}

/** Groups leads by their `industry` field into a pie-chart-ready series. */
function bucketByIndustry(leads) {
  const map = new Map()
  for (const lead of leads) {
    const key = lead.industry?.trim() || 'Unspecified'
    map.set(key, (map.get(key) || 0) + 1)
  }
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

/** Buckets every logged interaction (across all leads) by weekday and
 * interaction type, Monday-first, for the weekly activity chart. */
function bucketByWeekday(interactions) {
  const buckets = WEEKDAY_LABELS.map((day) => ({
    day,
    call: 0,
    email: 0,
    meeting: 0,
    demo: 0,
    other: 0,
  }))
  for (const interaction of interactions) {
    const jsDay = new Date(interaction.interaction_date).getDay() // 0 = Sun
    const mondayFirstIndex = (jsDay + 6) % 7
    const key = INTERACTION_TYPE_KEYS.includes(interaction.interaction_type)
      ? interaction.interaction_type
      : 'other'
    buckets[mondayFirstIndex][key] += 1
  }
  return buckets
}

function mapSnapshot(snapshot) {
  return {
    id: snapshot.id,
    date: snapshot.generated_at,
    conversionRate: Number(snapshot.conversion_rate),
    pipelineValue: Number(snapshot.pipeline_value),
  }
}

/**
 * Loads everything the Analytics page renders:
 *  - the live dashboard summary (conversion rate, pipeline value, stage
 *    breakdown) from `GET /dashboard/summary`
 *  - this user's historical snapshots from `GET /dashboard/snapshots`,
 *    used for the trend charts
 *  - leads (for the industry breakdown) and, per lead, sales interactions
 *    and outreach campaigns (for weekly activity + outreach totals) —
 *    there's no cross-lead aggregate endpoint for either, so this fans out
 *    one request per lead, same pattern as the Conversation Summary and
 *    Lead Intelligence pages.
 */
export function useAnalytics() {
  const [summary, setSummary] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [industryBreakdown, setIndustryBreakdown] = useState([])
  const [weeklyActivity, setWeeklyActivity] = useState([])
  const [totalInteractions, setTotalInteractions] = useState(0)
  const [totalCampaigns, setTotalCampaigns] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [isRecordingSnapshot, setIsRecordingSnapshot] = useState(false)
  const [snapshotError, setSnapshotError] = useState(null)

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [summaryRes, snapshotsRes, leadsData] = await Promise.all([
        getDashboardSummary(),
        getSnapshotHistory(30),
        getLeads(),
      ])

      setSummary(summaryRes.data)

      const sortedSnapshots = [...snapshotsRes.data]
        .sort((a, b) => new Date(a.generated_at) - new Date(b.generated_at))
        .map(mapSnapshot)
      setSnapshots(sortedSnapshots)

      const leadItems = leadsData.items || []
      setIndustryBreakdown(bucketByIndustry(leadItems))

      const perLead = await Promise.all(
        leadItems.map(async (lead) => {
          const [interactionsRes, campaignsRes] = await Promise.all([
            listInteractions(lead.id).catch((err) => {
              console.error(`Failed to load interactions for lead ${lead.id}:`, err)
              return { data: [] }
            }),
            getCampaigns(lead.id).catch((err) => {
              console.error(`Failed to load campaigns for lead ${lead.id}:`, err)
              return { data: [] }
            }),
          ])
          const interactions = Array.isArray(interactionsRes?.data)
            ? interactionsRes.data
            : Array.isArray(interactionsRes)
              ? interactionsRes
              : []
          const campaigns = Array.isArray(campaignsRes?.data)
            ? campaignsRes.data
            : Array.isArray(campaignsRes)
              ? campaignsRes
              : []
          return { interactions, campaigns }
        })
      )

      const allInteractions = perLead.flatMap((p) => p.interactions || [])
      const allCampaigns = perLead.flatMap((p) => p.campaigns || [])

      setWeeklyActivity(bucketByWeekday(allInteractions))
      setTotalInteractions(allInteractions.length)
      setTotalCampaigns(allCampaigns.length)
    } catch (err) {
      console.error('Failed to load analytics data:', err)
      setError(extractErrorMessage(err, 'Unable to load analytics. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const addSnapshot = useCallback(async () => {
    setIsRecordingSnapshot(true)
    setSnapshotError(null)
    try {
      await recordSnapshot()
      const { data } = await getSnapshotHistory(30)
      setSnapshots([...data].sort((a, b) => new Date(a.generated_at) - new Date(b.generated_at)).map(mapSnapshot))
      return { success: true }
    } catch (err) {
      console.error('Failed to record snapshot:', err)
      const message = extractErrorMessage(err, 'Unable to record a snapshot. Please try again.')
      setSnapshotError(message)
      return { success: false, message }
    } finally {
      setIsRecordingSnapshot(false)
    }
  }, [])

  const { funnel, closedLost } = summary
    ? mapStages(summary.stages)
    : { funnel: [], closedLost: 0 }

  return {
    isLoading,
    error,
    reload: loadAll,

    totalLeads: summary?.total_leads ?? 0,
    conversionRate: summary ? Number(summary.conversion_rate) : 0,
    pipelineValue: summary ? Number(summary.pipeline_value) : 0,
    funnel,
    closedLost,

    industryBreakdown,
    weeklyActivity,
    totalInteractions,
    totalCampaigns,

    snapshots,
    isRecordingSnapshot,
    snapshotError,
    addSnapshot,
  }
}
