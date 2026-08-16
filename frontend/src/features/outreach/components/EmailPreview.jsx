import { AlertCircle, Check, Copy, Download, ExternalLink, Mail, RefreshCw, Sparkles } from 'lucide-react'

import StatusBadge from '@/components/ui/StatusBadge'

export function EmailPreview({
  campaign,
  isGenerating,
  isSaving,
  isOpeningGmail,
  gmailOpened,
  gmailNotice,
  onUpdateSubject,
  onUpdateBody,
  onSaveDraft,
  onOpenGmail,
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

  const isEditable = true

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
            Edit your draft below, then click "Open in Gmail" to review and send from your Gmail account.
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <StatusBadge status={campaign.status === 'sent' ? 'Sent' : 'Draft'} />
          {gmailOpened && (
            <span className="inline-flex items-center space-x-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-700 border border-brand-200">
              <Check className="h-3 w-3 text-brand-600" />
              <span>Opened in Gmail</span>
            </span>
          )}
        </div>
      </div>

      {/* Gmail Notice / Fallback Banner */}
      {gmailNotice && (
        <div className="flex items-start space-x-2 rounded-control border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold">
              {typeof gmailNotice === 'object' && gmailNotice.type === 'blocked'
                ? 'Pop-up Blocked by Browser'
                : 'Notice'}
            </p>
            <p className="mt-0.5">
              {typeof gmailNotice === 'string' ? gmailNotice : gmailNotice.text}
            </p>
            {typeof gmailNotice === 'object' && gmailNotice.url && (
              <div className="mt-2">
                <a
                  href={gmailNotice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 font-semibold text-brand-700 underline hover:text-brand-900"
                >
                  <span>Click here to open Gmail</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gmail Opened Success Banner */}
      {gmailOpened && !gmailNotice && (
        <div className="flex items-center justify-between rounded-control border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
          <div className="flex items-center space-x-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Gmail Compose opened in a new tab with recipient, subject, and body pre-filled.</span>
          </div>
          <button
            type="button"
            onClick={onOpenGmail}
            className="font-medium underline text-emerald-700 hover:text-emerald-900 ml-2 shrink-0"
          >
            Re-open
          </button>
        </div>
      )}

      {/* Subject Line */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink-primary">Subject Line</label>
        <input
          type="text"
          value={campaign.subject}
          onChange={(e) => onUpdateSubject(e.target.value)}
          className="w-full rounded-control border border-line-default bg-surface-subtle px-3 py-2 text-xs sm:text-sm text-ink-primary focus:border-brand-500 focus:bg-surface-default focus:outline-hidden focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Editable Body Textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-ink-primary">Email Body Content</label>
          <span className="text-[10px] text-ink-muted">Editable</span>
        </div>
        <textarea
          rows={10}
          value={campaign.body}
          onChange={(e) => onUpdateBody(e.target.value)}
          className="w-full resize-none font-sans rounded-control border border-line-default bg-surface-subtle p-3.5 text-xs sm:text-sm text-ink-primary leading-relaxed focus:border-brand-500 focus:bg-surface-default focus:outline-hidden"
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

          {/* Regenerate */}
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
            onClick={onOpenGmail}
            disabled={isOpeningGmail}
            className="flex items-center space-x-1.5 rounded-control bg-brand-500 px-4 py-2 text-xs font-semibold text-ink-inverse shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
            title="Open in Gmail web compose to review and send from your account"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{isOpeningGmail ? 'Opening...' : 'Open in Gmail'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
