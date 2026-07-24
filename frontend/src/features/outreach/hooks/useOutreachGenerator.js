import { useCallback, useState } from 'react'
import {
  generateOutreachEmail,
  INDUSTRY_OPTIONS,
  LENGTH_OPTIONS,
  SAMPLE_PROSPECTS,
  TONE_OPTIONS,
} from '../data/mockOutreachData'

export function useOutreachGenerator() {
  const [formData, setFormData] = useState({
    prospectName: 'Sarah Jenkins',
    jobTitle: 'Chief Technology Officer',
    companyName: 'Acme Corp',
    industry: 'Enterprise SaaS',
    painPoint: 'Manual CRM lead enrichment delays cutting sales team output.',
    valueProp: 'SalesGenie AI automated lead scoring and real-time webhook sync.',
    tone: 'consultative',
    length: 'medium',
  })

  const [generatedEmail, setGeneratedEmail] = useState(() =>
    generateOutreachEmail({
      prospectName: 'Sarah Jenkins',
      jobTitle: 'Chief Technology Officer',
      companyName: 'Acme Corp',
      industry: 'Enterprise SaaS',
      painPoint: 'Manual CRM lead enrichment delays cutting sales team output.',
      valueProp: 'SalesGenie AI automated lead scoring and real-time webhook sync.',
      tone: 'consultative',
      length: 'medium',
    })
  )

  const [isGenerating, setIsGenerating] = useState(false)
  const [history, setHistory] = useState([])
  const [copySuccess, setCopySuccess] = useState(false)

  const updateFormField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const loadSampleProspect = useCallback((sample) => {
    setFormData((prev) => ({ ...prev, ...sample }))
  }, [])

  const generateEmail = useCallback(() => {
    setIsGenerating(true)
    setTimeout(() => {
      const newEmail = generateOutreachEmail(formData)
      setGeneratedEmail(newEmail)
      setHistory((prev) => [newEmail, ...prev.slice(0, 4)])
      setIsGenerating(false)
    }, 600)
  }, [formData])

  const regenerateEmail = useCallback(() => {
    generateEmail()
  }, [generateEmail])

  const selectSubject = useCallback((subject) => {
    setGeneratedEmail((prev) => (prev ? { ...prev, selectedSubject: subject } : null))
  }, [])

  const updateBody = useCallback((newBody) => {
    setGeneratedEmail((prev) => (prev ? { ...prev, body: newBody } : null))
  }, [])

  const copyEmailToClipboard = useCallback(async () => {
    if (!generatedEmail) return
    const textToCopy = `Subject: ${generatedEmail.selectedSubject}\n\n${generatedEmail.body}`
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Copy failed: ', err)
    }
  }, [generatedEmail])

  const downloadEmailAsTxt = useCallback(() => {
    if (!generatedEmail) return
    const content = `Subject: ${generatedEmail.selectedSubject}\n\n${generatedEmail.body}`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Outreach_${formData.companyName.replace(/\s+/g, '_')}_${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [formData.companyName, generatedEmail])

  return {
    formData,
    updateFormField,
    loadSampleProspect,
    generatedEmail,
    isGenerating,
    generateEmail,
    regenerateEmail,
    selectSubject,
    updateBody,
    copyEmailToClipboard,
    copySuccess,
    downloadEmailAsTxt,
    history,
    toneOptions: TONE_OPTIONS,
    lengthOptions: LENGTH_OPTIONS,
    industryOptions: INDUSTRY_OPTIONS,
    sampleProspects: SAMPLE_PROSPECTS,
  }
}
