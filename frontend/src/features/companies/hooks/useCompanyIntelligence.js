import { useCallback, useEffect, useState } from 'react'

import { getLeads } from '@/services/api/leads'
import { generateCompanyInsight, getLatestCompanyInsight } from '@/services/api/companyInsights'
import { generateLeadScore, getLatestLeadScore } from '@/services/api/leadScores'
import { formatCurrency, initials, STATUS_LABELS } from '@/features/intelligence/utils/leadMapper'

function extractErrorMessage(err, fallback) {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  return err?.response?.data?.error?.message || err?.message || fallback
}

// A "company" in this view is simply a Lead (Module 3) viewed through its
// company-facing fields, since the backend has no separate Company entity.
function mapCompany(lead) {
  const domain = lead.email && lead.email.includes('@') ? lead.email.split('@')[1] : null

  return {
    id: lead.id,
    name: lead.company_name,
    domain,
    industry: lead.industry || 'Unspecified',
    contactName: lead.contact_name,
    email: lead.email,
    phone: lead.phone,
    dealValue: formatCurrency(lead.deal_value),
    status: lead.lead_status,
    statusLabel: STATUS_LABELS[lead.lead_status] || lead.lead_status,
    avatar: initials(lead.company_name),
  }
}

/**
 * Loads leads (Module 3) as "companies" and, for the currently selected
 * one, its latest AI company insight (Module 4) and AI lead score
 * (Module 6) — generating fresh ones on demand via the real backend AI
 * endpoints. This is the data layer behind the Company Analysis page.
 */
export function useCompanyIntelligence() {
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [insight, setInsight] = useState(null)
  const [score, setScore] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const loadCompanies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getLeads()
      const items = (data.items || []).map(mapCompany)
      setCompanies(items)
      setSelectedId((prev) => (prev && items.some((c) => c.id === prev) ? prev : items[0]?.id ?? null))
    } catch (err) {
      console.error('Failed to load companies:', err)
      setError(extractErrorMessage(err, 'Failed to load companies. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  const loadDetail = useCallback(async (leadId) => {
    if (!leadId) {
      setInsight(null)
      setScore(null)
      return
    }
    setIsDetailLoading(true)
    setDetailError(null)
    try {
      const [latestScore, latestInsight] = await Promise.all([
        getLatestLeadScore(leadId),
        getLatestCompanyInsight(leadId),
      ])
      setScore(latestScore)
      setInsight(latestInsight)
    } catch (err) {
      console.error(`Failed to load intelligence for company ${leadId}:`, err)
      setDetailError(extractErrorMessage(err, 'Failed to load company intelligence.'))
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDetail(selectedId)
  }, [selectedId, loadDetail])

  const generateProfile = useCallback(async (leadId) => {
    if (!leadId) return { success: false, message: 'No company selected.' }
    setIsGenerating(true)
    setDetailError(null)
    try {
      const [newScore, newInsight] = await Promise.all([
        generateLeadScore(leadId),
        generateCompanyInsight(leadId),
      ])
      setScore(newScore)
      setInsight(newInsight)
      return { success: true }
    } catch (err) {
      console.error(`Failed to generate intelligence for company ${leadId}:`, err)
      const message = extractErrorMessage(err, 'Failed to generate AI insights for this company.')
      setDetailError(message)
      return { success: false, message }
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    companies,
    isLoading,
    error,
    reload: loadCompanies,
    selectedId,
    setSelectedId,
    insight,
    score,
    isDetailLoading,
    detailError,
    isGenerating,
    generateProfile,
  }
}
