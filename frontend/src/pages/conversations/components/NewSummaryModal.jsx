import { useState } from 'react'
import { AlertCircle, Sparkles, X } from 'lucide-react'

const INTERACTION_TYPE_OPTIONS = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'demo', label: 'Demo' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
]

function NewSummaryModal({ error, isGenerating, leads, onClose, onGenerate }) {
  const [leadId, setLeadId] = useState('')
  const [interactionType, setInteractionType] = useState('call')
  const [transcript, setTranscript] = useState('')

  const canSubmit = leadId && transcript.trim().length > 0 && !isGenerating

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    const result = await onGenerate(leadId, transcript.trim(), interactionType)
    if (result?.success) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Generate a new AI conversation summary"
    >
      <div className="absolute inset-0 bg-ink-primary/20 backdrop-blur-sm" />

      <form
        className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-surface bg-surface-default shadow-overlay"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line-default bg-surface-default px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-ink-primary">New AI Summary</h2>
          </div>
          <button
            aria-label="Close"
            className="rounded-control p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink-primary transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm text-ink-muted">
            Paste a raw call, meeting, or email transcript. The AI provider will generate a summary and
            action items, and log it against the selected lead.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-primary" htmlFor="new-summary-lead">
              Lead
            </label>
            <select
              className="input"
              id="new-summary-lead"
              onChange={(e) => setLeadId(e.target.value)}
              value={leadId}
            >
              <option value="">Select a lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.contact_name || 'Unnamed Contact'} — {lead.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-primary" htmlFor="new-summary-type">
              Interaction Type
            </label>
            <select
              className="input"
              id="new-summary-type"
              onChange={(e) => setInteractionType(e.target.value)}
              value={interactionType}
            >
              {INTERACTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-primary" htmlFor="new-summary-transcript">
              Transcript
            </label>
            <textarea
              className="input h-auto min-h-[160px] resize-y py-2.5"
              id="new-summary-transcript"
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the raw conversation transcript here…"
              value={transcript}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-control bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-100">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-line-default bg-surface-default px-6 py-4">
          <button className="btn btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn btn-primary gap-1.5" disabled={!canSubmit} type="submit">
            <Sparkles className={['size-4', isGenerating ? 'animate-spin' : ''].join(' ')} />
            {isGenerating ? 'Summarizing…' : 'Generate Summary'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewSummaryModal
