import { useCallback, useEffect, useState } from 'react'
import { getLeads } from '@/services/api/leads'
import {
  generateCampaign,
  getCampaigns,
  updateCampaign,
} from '@/services/api/outreach'
import { useWorkspaceKey } from '@/hooks/useWorkspaceKey'

function mapCampaign(c) {
  if (!c) return null
  return {
    id: c.id,
    leadId: c.lead_id,
    subject: c.email_subject,
    body: c.email_content,
    status: c.campaign_status,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    _raw: c,
  }
}

function extractErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.detail)) {
    return data.detail.map((d) => d.msg || d.message).filter(Boolean).join(' ') || fallback
  }
  if (data?.error?.message) return data.error.message
  return err?.message || fallback
}

export function useOutreachGenerator() {
  const { workspaceKey } = useWorkspaceKey()
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [selectedLeadId, setSelectedLeadId] = useState('')

  const [campaign, setCampaign] = useState(null)
  const [history, setHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isOpeningGmail, setIsOpeningGmail] = useState(false)
  const [gmailOpened, setGmailOpened] = useState(false)
  const [gmailNotice, setGmailNotice] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [error, setError] = useState(null)

  // 1. Fetch leads on mount / workspace change
  const loadLeads = useCallback(async () => {
    setLeadsLoading(true)
    setError(null)
    setLeads([])
    setSelectedLeadId('')
    setCampaign(null)
    setHistory([])
    try {
      const data = await getLeads({ page_size: 100 })
      const items = data.items || []
      setLeads(items)
      if (items.length > 0) {
        setSelectedLeadId(items[0].id)
      }
    } catch (err) {
      console.error('Failed to load leads:', err)
      setError(extractErrorMessage(err, 'Failed to load leads.'))
    } finally {
      setLeadsLoading(false)
    }
  }, [workspaceKey])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  // Selected lead object
  const selectedLead = leads.find((l) => l.id === selectedLeadId) || null

  // 2. Fetch campaign history whenever selectedLeadId changes
  const loadCampaignHistory = useCallback(async (leadId) => {
    if (!leadId) {
      setHistory([])
      setCampaign(null)
      return
    }
    setIsHistoryLoading(true)
    try {
      const { data } = await getCampaigns(leadId)
      const mapped = (data || []).map(mapCampaign).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      setHistory(mapped)
      setCampaign(mapped[0] || null)
    } catch (err) {
      console.error(`Failed to load campaigns for lead ${leadId}:`, err)
      setHistory([])
      setCampaign(null)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedLeadId) {
      loadCampaignHistory(selectedLeadId)
      setGmailOpened(false)
      setGmailNotice(null)
    }
  }, [selectedLeadId, loadCampaignHistory])

  const selectLead = useCallback((leadId) => {
    setSelectedLeadId(leadId)
    setError(null)
    setGmailOpened(false)
    setGmailNotice(null)
  }, [])

  // 3. Generate AI Outreach Email
  const generateEmail = useCallback(async () => {
    if (!selectedLeadId) return
    setIsGenerating(true)
    setError(null)
    setGmailOpened(false)
    setGmailNotice(null)
    try {
      const { data } = await generateCampaign(selectedLeadId)
      const mapped = mapCampaign(data)
      setCampaign(mapped)
      setHistory((prev) => [mapped, ...prev.filter((h) => h.id !== mapped.id)])
    } catch (err) {
      console.error('Failed to generate outreach email:', err)
      setError(extractErrorMessage(err, 'Failed to generate outreach email. Please try again.'))
    } finally {
      setIsGenerating(false)
    }
  }, [selectedLeadId])

  // 4. Update Subject / Body locally
  const updateSubject = useCallback((newSubject) => {
    setCampaign((prev) => (prev ? { ...prev, subject: newSubject } : null))
  }, [])

  const updateBody = useCallback((newBody) => {
    setCampaign((prev) => (prev ? { ...prev, body: newBody } : null))
  }, [])

  // 5. Save Draft
  const saveDraft = useCallback(async () => {
    if (!selectedLeadId || !campaign) return
    setIsSaving(true)
    setError(null)
    try {
      const { data } = await updateCampaign(selectedLeadId, campaign.id, {
        email_subject: campaign.subject,
        email_content: campaign.body,
      })
      const mapped = mapCampaign(data)
      setCampaign(mapped)
      setHistory((prev) => prev.map((h) => (h.id === mapped.id ? mapped : h)))
    } catch (err) {
      console.error('Failed to save draft:', err)
      setError(extractErrorMessage(err, 'Failed to save email draft.'))
    } finally {
      setIsSaving(false)
    }
  }, [selectedLeadId, campaign])

  // 6. Open in Gmail Compose (Synchronous window.open to prevent popup blocking)
  const openInGmail = useCallback(() => {
    if (!selectedLeadId || !campaign) return
    setError(null)
    setGmailNotice(null)

    const recipient = (selectedLead?.email || '').trim()
    const subject = (campaign.subject || '').trim()
    const body = (campaign.body || '').trim()

    const encodedTo = encodeURIComponent(recipient)
    const encodedSubject = encodeURIComponent(subject)
    const encodedBody = encodeURIComponent(body)

    const fullGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`

    let targetUrl = fullGmailUrl
    let openedWindow = null

    // Check if URL length exceeds standard browser URL limit (~2000 chars)
    if (fullGmailUrl.length > 2000) {
      const shortUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}`
      targetUrl = shortUrl

      // Copy body to clipboard as fallback
      const fullDraft = `To: ${recipient}\nSubject: ${subject}\n\n${body}`
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(body || fullDraft).catch((e) => console.warn('Clipboard write failed:', e))
      }

      openedWindow = window.open(shortUrl, '_blank')
      setGmailNotice({
        type: 'warning',
        url: shortUrl,
        text: 'Due to length limits, the email body was copied to your clipboard. Paste (Ctrl+V / Cmd+V) directly into Gmail Compose.',
      })
    } else {
      // Direct synchronous window.open within user gesture
      openedWindow = window.open(fullGmailUrl, '_blank')
    }

    // Check if popup was blocked by browser
    if (!openedWindow || openedWindow.closed || typeof openedWindow.closed === 'undefined') {
      const fullDraft = `To: ${recipient}\nSubject: ${subject}\n\n${body}`
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(fullDraft).catch((e) => console.warn('Clipboard write failed:', e))
      }
      setGmailNotice({
        type: 'blocked',
        url: targetUrl,
        text: 'Gmail was blocked by your browser. Click the link below to open Gmail or use the copied email content from your clipboard.',
      })
    }

    setGmailOpened(true)

    // Background auto-save draft in PostgreSQL (non-blocking)
    if (campaign.id) {
      updateCampaign(selectedLeadId, campaign.id, {
        email_subject: campaign.subject,
        email_content: campaign.body,
      })
        .then(({ data }) => {
          const mapped = mapCampaign(data)
          setCampaign(mapped)
          setHistory((prev) => prev.map((h) => (h.id === mapped.id ? mapped : h)))
        })
        .catch((saveErr) => console.warn('Background auto-save draft failed:', saveErr))
    }
  }, [selectedLeadId, selectedLead, campaign])

  // 7. Select campaign from history
  const selectCampaignFromHistory = useCallback((c) => {
    setCampaign(c)
    setGmailOpened(false)
    setGmailNotice(null)
  }, [])

  // 8. Copy to Clipboard
  const copyEmailToClipboard = useCallback(async () => {
    if (!campaign) return
    const recipient = selectedLead?.email ? `To: ${selectedLead.email}\n` : ''
    const textToCopy = `${recipient}Subject: ${campaign.subject}\n\n${campaign.body}`
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Copy failed: ', err)
    }
  }, [campaign, selectedLead])

  // 9. Download as .txt
  const downloadEmailAsTxt = useCallback(() => {
    if (!campaign) return
    const recipient = selectedLead?.email ? `To: ${selectedLead.email}\n` : ''
    const content = `${recipient}Subject: ${campaign.subject}\n\n${campaign.body}`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const companyName = selectedLead?.company_name || 'Prospect'
    link.download = `Outreach_${companyName.replace(/\s+/g, '_')}_${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [campaign, selectedLead])

  return {
    leads,
    leadsLoading,
    selectedLeadId,
    selectedLead,
    selectLead,

    campaign,
    isGenerating,
    isSaving,
    isOpeningGmail,
    gmailOpened,
    gmailNotice,
    error,

    generateEmail,
    updateSubject,
    updateBody,
    saveDraft,
    openInGmail,

    history,
    isHistoryLoading,
    selectCampaignFromHistory,

    copyEmailToClipboard,
    copySuccess,
    downloadEmailAsTxt,
  }
}
