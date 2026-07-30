import { useCallback, useEffect, useState } from 'react'

import api from '@/services/api/client'
import { generateCompanyInsight, getLatestCompanyInsight } from '@/services/api/companyInsights'
import { generateLeadScore, getLatestLeadScore } from '@/services/api/leadScores'

import { mapLeadIntelligence } from '../utils/leadMapper'

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.error?.message || err?.message || fallback
}

/**
 * Loads leads (Module 3) together with their latest AI lead score
 * (Module 6) and latest AI company insight (Module 4), and exposes actions
 * to (re)generate either for a given lead. This is the data layer behind
 * the Lead Intelligence page.
 */
export function useLeadIntelligence() {
  const [leads, setLeads] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generatingIds, setGeneratingIds] = useState(() => new Set())

  const loadLeads = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/leads', { params: { page: 1, page_size: 50 } })
      const rawLeads = data.items || []

      const enriched = await Promise.all(
        rawLeads.map(async (lead) => {
          const [score, insight] = await Promise.all([
            getLatestLeadScore(lead.id),
            getLatestCompanyInsight(lead.id),
          ])
          return mapLeadIntelligence(lead, score, insight)
        })
      )

      setLeads(enriched)
    } catch (err) {
      console.error('Failed to load lead intelligence data:', err)
      setError(extractErrorMessage(err, 'Failed to load leads. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const generateForLead = useCallback(async (leadId) => {
    setGeneratingIds((prev) => new Set(prev).add(leadId))
    try {
      const [score, insight] = await Promise.all([
        generateLeadScore(leadId),
        generateCompanyInsight(leadId),
      ])

      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? mapLeadIntelligence(l._raw, score, insight) : l))
      )

      return { success: true }
    } catch (err) {
      console.error(`Failed to generate AI insights for lead ${leadId}:`, err)
      return {
        success: false,
        message: extractErrorMessage(err, 'Failed to generate AI insights for this lead.'),
      }
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }, [])

  const generateAll = useCallback(async () => {
    const targets = leads.map((l) => l.id)
    const results = await Promise.all(targets.map((id) => generateForLead(id)))
    const failures = results.filter((r) => !r.success)
    return { total: results.length, failed: failures.length }
  }, [leads, generateForLead])

  return {
    leads,
    isLoading,
    error,
    generatingIds,
    reload: loadLeads,
    generateForLead,
    generateAll,
  }
}
