import { Check, Copy, Download, Mail, RefreshCw, Send, ShieldCheck, Sparkles } from 'lucide-react'

import StatusBadge from '@/components/ui/StatusBadge'

export function EmailPreview({
  campaign,
  isGenerating,
  isSaving,
  isSending,
  onUpdateSubject,
  onUpdateBody,
  onSaveDraft,
  onSend,
  onCopy,
  copySuccess,
  onDownload,
  onRegenerate,
}) {
  if (isGenerating) {
    return (
      <div className="rounded-card border border-line-default bg-surface-default p-6 shadow-card space-y-4 animate-pulse">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-brand-500 animate-spin" />
          <div className="h-4 w-1/3 bg-surface-muted rounded" />
        </div>
        <div className="h-10 bg-surface-muted rounded-control w-full" />
        <div className="space-y-2 pt-2">
          <div className="h-4 bg-surface-muted rounded w-full" />
          <div className="h-4 bg-surface-muted rounded w-5/6" />
          <div className="h-4 bg-surface-muted rounded w-4/6" />
          <div className="h-4 bg-surface-muted rounded w-3/4" />
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-card border border-line-default bg-surface-default shadow-card min-h-[400px]">
        <Mail className="h-10 w-10 text-ink-muted mb-3" />
        <h3 className="text-sm font-semibold text-ink-primary">No Email Generated Yet</h3>
        <p className="text-xs text-ink-muted max-w-xs mt-1">
          Select a lead on the left and click "Generate Outreach Email" to preview your draft.
        </p>
      </div>
    )
  }

  // Backend uses campaign_status enum values: 'draft', 'sent', etc.
  const status = (campaign.status || '').toLowerCase()
  const isEditable = status === 'draft'

  return (
    <div className="rounded-card border border-line-default bg-surface-default p-5 shadow-card space-y-4">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line-default pb-3.5">
        <div>
          <h2 className="text-base font-bold text-ink-primary flex items-center space-x-2">
            <Mail className="h-4 w-4 text-brand-600" />
            <span>Generated AI Outreach Draft</span>
          </h2>
          <span className="text-[10px] text-ink-muted">
            {isEditable ? 'Editable while in draft' : 'This campaign has already been sent'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <StatusBadge status={campaign.status} />
          {isEditable && (
            <span className="hidden sm:inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span>Ready to Review</span>
            </span>
          )}
        </div>
      </div>

      {/* Subject Line */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink-primary">Subject Line</label>
        <input
          type="text"
          value={campaign.subject}
          onChange={(e) => onUpdateSubject(e.target.value)}
          disabled={!isEditable}
          className="w-full rounded-control border border-line-default bg-surface-subtle px-3 py-2 text-xs sm:text-sm text-ink-primary focus:border-brand-500 focus:bg-surface-default focus:outline-hidden focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
        />
      </div>

      {/* Editable Body Textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-ink-primary">Email Body Content</label>
          <span className="text-[10px] text-ink-muted">{isEditable ? 'Editable' : 'Locked'}</span>
        </div>
        <textarea
          rows={10}
          value={campaign.body}
          onChange={(e) => onUpdateBody(e.target.value)}
          disabled={!isEditable}
          className="w-full resize-none font-sans rounded-control border border-line-default bg-surface-subtle p-3.5 text-xs sm:text-sm text-ink-primary leading-relaxed focus:border-brand-500 focus:bg-surface-default focus:outline-hidden disabled:opacity-60"
        />
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line-default">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center space-x-1.5 rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs font-medium text-ink-primary hover:bg-surface-muted transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-ink-muted" />
            <span>Download .txt</span>
          </button>

          <button
            type="button"
            onClick={onCopy}
            className="flex items-center space-x-1.5 rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs font-medium text-ink-primary hover:bg-surface-muted transition-colors"
          >
            {copySuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-ink-muted" />
                <span>Copy Email</span>
              </>
            )}
          </button>

          {/* Regenerate — always visible when a campaign exists */}
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isGenerating}
            className="flex items-center space-x-1.5 rounded-control border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>
        </div>

        {isEditable && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSaving}
              className="flex items-center space-x-1.5 rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs font-medium text-ink-primary hover:bg-surface-muted transition-colors disabled:opacity-50"
            >
              <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <button
              type="button"
              onClick={onSend}
              disabled={isSending}
              className="flex items-center space-x-1.5 rounded-control bg-brand-500 px-4 py-2 text-xs font-semibold text-ink-inverse shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSending ? 'Sending...' : 'Send Email'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
