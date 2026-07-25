import { Check, Copy, Download, Mail, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'

export function EmailPreview({
  generatedEmail,
  isGenerating,
  onSelectSubject,
  onUpdateBody,
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

  if (!generatedEmail) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-card border border-line-default bg-surface-default shadow-card min-h-[400px]">
        <Mail className="h-10 w-10 text-ink-muted mb-3" />
        <h3 className="text-sm font-semibold text-ink-primary">No Email Generated Yet</h3>
        <p className="text-xs text-ink-muted max-w-xs mt-1">
          Fill out the prospect form on the left and click "Generate Email Sequence" to preview your draft.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-line-default bg-surface-default p-5 shadow-card space-y-4">
      {/* Header & Quality Score Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line-default pb-3.5">
        <div>
          <h2 className="text-base font-bold text-ink-primary flex items-center space-x-2">
            <Mail className="h-4 w-4 text-brand-600" />
            <span>Generated AI Outreach Draft</span>
          </h2>
          <span className="text-[10px] text-ink-muted">Generated at {generatedEmail.generatedAt}</span>
        </div>

        {/* Quality Badges */}
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>Spam Risk: {generatedEmail.spamScore}</span>
          </span>
          <span className="hidden sm:inline-flex items-center space-x-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-700 border border-brand-100">
            <span>Open Rate: {generatedEmail.estOpenRate}</span>
          </span>
        </div>
      </div>

      {/* Subject Line Selection */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink-primary">
          Subject Line Alternatives (Click to Select)
        </label>
        <div className="space-y-1.5">
          {generatedEmail.subjects.map((subj, idx) => {
            const isSelected = subj === generatedEmail.selectedSubject
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectSubject(subj)}
                className={`flex w-full items-center justify-between p-2.5 text-left rounded-control border text-xs transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/50 font-medium text-brand-800 ring-1 ring-brand-500'
                    : 'border-line-default bg-surface-subtle text-ink-primary hover:bg-surface-muted'
                }`}
              >
                <span className="truncate pr-2">Subject: {subj}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-brand-600 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Editable Body Textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-ink-primary">
            Email Body Content
          </label>
          <span className="text-[10px] text-ink-muted">Editable</span>
        </div>
        <textarea
          rows={10}
          value={generatedEmail.body}
          onChange={(e) => onUpdateBody(e.target.value)}
          className="w-full resize-none font-sans rounded-control border border-line-default bg-surface-subtle p-3.5 text-xs sm:text-sm text-ink-primary leading-relaxed focus:border-brand-500 focus:bg-surface-default focus:outline-hidden"
        />
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line-default">
        <button
          type="button"
          onClick={onRegenerate}
          className="flex items-center space-x-1.5 rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs font-medium text-ink-primary hover:bg-surface-muted transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5 text-ink-muted" />
          <span>Regenerate Variation</span>
        </button>

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
            className="flex items-center space-x-1.5 rounded-control bg-brand-500 px-4 py-2 text-xs font-semibold text-ink-inverse shadow-xs hover:bg-brand-600 transition-colors"
          >
            {copySuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-ink-inverse" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Email</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
