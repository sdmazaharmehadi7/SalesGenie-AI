import { useCallback, useEffect, useState } from 'react'

import { getLeads } from '@/services/api/leads'
import { listInteractions, summarizeInteraction } from '@/services/api/conversations'

function initials(name) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '??'
}

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.error?.message || err?.message || fallback
}

/** Maps a raw `SalesInteractionRead` (backend) + its parent lead into the
 * shape the Conversation Summary UI renders. */
function mapInteraction(interaction, lead) {
  return {
    id: interaction.id,
    leadId: interaction.lead_id,
    company: lead?.company_name || 'Unknown Company',
    contact: lead?.contact_name || 'Unknown Contact',
    contactInitials: initials(lead?.contact_name),
    industry: lead?.industry || null,
    interactionType: interaction.interaction_type,
    meetingDate: interaction.interaction_date,
    aiSummary: interaction.summary || 'No AI summary is available for this interaction yet.',
    actionItems: interaction.action_items || [],
  }
}

/**
 * Loads every logged sales interaction (Module 4 — Conversation
 * Intelligence) across all leads owned/visible to the current user, and
 * exposes an action to summarize a new transcript with AI.
 *
 * The backend scopes interactions per-lead (`GET /leads/{id}/interactions`)
 * with no cross-lead listing endpoint, so this loads the lead list once and
 * fans out one request per lead, matching the pattern used by
 * `useLeadIntelligence`.
 */
export function useConversationSummaries() {
  const [leads, setLeads] = useState([])
  const [summaries, setSummaries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const leadsData = await getLeads()
      const leadItems = leadsData.items || []
      setLeads(leadItems)

      const perLead = await Promise.all(
        leadItems.map(async (lead) => {
          try {
            const { data } = await listInteractions(lead.id)
            return data.map((interaction) => mapInteraction(interaction, lead))
          } catch (err) {
            console.error(`Failed to load interactions for lead ${lead.id}:`, err)
            return []
          }
        })
      )

      const flattened = perLead.flat().sort((a, b) => new Date(b.meetingDate) - new Date(a.meetingDate))
      setSummaries(flattened)
    } catch (err) {
      console.error('Failed to load conversation summaries:', err)
      setError(extractErrorMessage(err, 'Unable to load conversation summaries. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const generateSummary = useCallback(
    async (leadId, transcript, interactionType) => {
      setIsGenerating(true)
      setGenerateError(null)
      try {
        const { data } = await summarizeInteraction(leadId, {
          transcript,
          interaction_type: interactionType,
        })
        const lead = leads.find((l) => l.id === leadId)
        const mapped = mapInteraction(data, lead)
        setSummaries((prev) => [mapped, ...prev])
        return { success: true, summary: mapped }
      } catch (err) {
        console.error('Failed to summarize transcript:', err)
        const message = extractErrorMessage(err, 'Unable to generate a summary. Please try again.')
        setGenerateError(message)
        return { success: false, message }
      } finally {
        setIsGenerating(false)
      }
    },
    [leads]
  )

  return {
    leads,
    summaries,
    isLoading,
    error,
    reload: loadAll,
    generateSummary,
    isGenerating,
    generateError,
    setGenerateError,
  }
}
