import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Sparkles, X, RefreshCw, Send, CheckCircle2, AlertCircle } from '@/components/ui/icons'
import { getGmailStatus, sendGmailEmail } from '@/services/api/gmail'
import { useToast } from '@/context/ToastContext'
import api from '@/services/api/client'

export default function SendEmailModal({ isOpen, onClose, lead, onSuccess }) {
  const { showToast } = useToast()
  const [gmailStatus, setGmailStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [sending, setSending] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)

  const [toEmail, setToEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [trackOpens, setTrackOpens] = useState(true)

  useEffect(() => {
    if (!isOpen) return

    setToEmail(lead?.email || '')
    setSubject(lead?.company_name ? `Following up — ${lead.company_name} & SalesGenie` : 'Follow up')
    setBody('')

    async function checkStatus() {
      setLoadingStatus(true)
      try {
        const data = await getGmailStatus()
        setGmailStatus(data)
      } catch (err) {
        console.error('Failed to get Gmail status in modal:', err)
        setGmailStatus({ is_connected: false })
      } finally {
        setLoadingStatus(false)
      }
    }
    checkStatus()
  }, [isOpen, lead])

  if (!isOpen) return null

  const handleGenerateAiDraft = async () => {
    setGeneratingAi(true)
    try {
      // Call backend AI email endpoint with lead context
      const res = await api.post('/ai/v1/email', {
        company_name: lead?.company_name || 'Prospect Company',
        contact_name: lead?.contact_name || 'Prospect',
        industry: lead?.industry || 'Technology',
        email_type: 'follow_up',
        key_points: [
          'Checking in on initial discussion and business requirements',
          'Explore potential partnership and solution alignment',
          'Offer brief 15-minute introductory call this week',
        ],
      })
      const aiData = res.data
      if (aiData.subject_options && aiData.subject_options.length > 0) {
        setSubject(aiData.subject_options[0])
      }
      if (aiData.email_body) {
        setBody(aiData.email_body)
      }
      showToast('AI drafted follow-up email! Review and edit before sending.', 'success')
    } catch (err) {
      console.error('AI draft generation failed, using template:', err)
      // High-quality fallback template
      setSubject(`Quick follow-up with ${lead?.company_name || 'your team'}`)
      setBody(
        `Hi ${lead?.contact_name || 'there'},\n\nI hope your week is off to a great start. I'm following up on our recent conversation regarding ${lead?.company_name || 'your initiatives'}.\n\nI'd love to schedule a brief 15-minute call this week to share how SalesGenie can assist your sales pipeline and answer any questions you might have.\n\nWould Thursday or Friday afternoon work well for a quick chat?\n\nBest regards,\n`
      )
      showToast('Generated follow-up draft. Review and edit before sending.', 'info')
    } finally {
      setGeneratingAi(false)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!toEmail.trim()) {
      showToast('Please provide a recipient email address.', 'error')
      return
    }
    if (!subject.trim() || !body.trim()) {
      showToast('Subject and body cannot be empty.', 'error')
      return
    }

    setSending(true)
    try {
      await sendGmailEmail({
        lead_id: lead?.id || null,
        to_email: toEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        track_opens: trackOpens,
      })

      showToast('Email sent via your connected Gmail account!', 'success')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || 'Failed to send email via Gmail.'
      showToast(msg, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-line-default bg-surface-default shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line-default px-6 py-4 bg-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Mail className="size-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink-primary">Compose Email via Gmail</h3>
              <p className="text-[11px] text-ink-muted">
                {lead?.contact_name ? `${lead.contact_name} • ` : ''}{lead?.company_name || 'CRM Lead'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink-primary transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4">

          {/* Account Status Banner */}
          {loadingStatus ? (
            <div className="rounded-xl border border-line-default bg-surface-subtle p-3 text-xs text-ink-muted animate-pulse">
              Checking Gmail connection...
            </div>
          ) : gmailStatus?.is_connected ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>
                  Sending from your verified Gmail: <strong className="font-semibold">{gmailStatus.provider_email}</strong>
                </span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                OAuth Active
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-600 shrink-0" />
                <span>
                  Gmail is not connected. You need to authorize your Gmail account before sending.
                </span>
              </div>
              <Link
                to="/settings/email"
                className="font-bold underline text-amber-800 hover:text-amber-900 shrink-0"
              >
                Connect Gmail →
              </Link>
            </div>
          )}

          {/* Recipient */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              To (Lead Email)
            </label>
            <input
              type="email"
              required
              placeholder="lead@company.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="w-full rounded-xl border border-line-default bg-surface-default px-3.5 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Subject with AI Assistant Action */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-ink-secondary">Subject</label>
              <button
                type="button"
                onClick={handleGenerateAiDraft}
                disabled={generatingAi}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline disabled:opacity-50"
              >
                <Sparkles className={`size-3 ${generatingAi ? 'animate-spin' : ''}`} />
                {generatingAi ? 'Drafting with AI...' : 'Draft with SalesGenie AI'}
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. SalesGenie Introduction & Strategy"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-line-default bg-surface-default px-3.5 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Message Body (Review & Edit before sending)
            </label>
            <textarea
              rows={8}
              required
              placeholder="Type your message here, or click 'Draft with SalesGenie AI' above..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-xl border border-line-default bg-surface-default p-3.5 text-xs text-ink-primary font-mono focus:border-brand-500 focus:outline-none leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              🔒 AI emails strictly require manual review and send approval. AI will never send emails automatically.
            </p>
          </div>

          {/* Open Tracking Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-line-default bg-surface-subtle p-3">
            <div>
              <span className="text-xs font-semibold text-ink-primary block">Real Open Tracking</span>
              <span className="text-[11px] text-ink-muted block">
                Attach a 1x1 transparent tracking pixel to alert you in-app when the recipient opens this email.
              </span>
            </div>
            <input
              type="checkbox"
              id="trackOpensCheck"
              checked={trackOpens}
              onChange={(e) => setTrackOpens(e.target.checked)}
              className="size-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line-default">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line-default px-4 py-2 text-xs font-semibold text-ink-secondary hover:bg-surface-subtle transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={sending || !gmailStatus?.is_connected}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {sending ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Sending via Gmail...
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
