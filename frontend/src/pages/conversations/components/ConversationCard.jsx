import { useState } from 'react'
import { Building2, Calendar, Check, ChevronDown, Copy, Download, Eye, Sparkles } from 'lucide-react'

import SentimentBadge from './SentimentBadge'

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ initials }) {
  const colors = {
    P: 'bg-violet-100 text-violet-700',
    M: 'bg-blue-100 text-blue-700',
    E: 'bg-emerald-100 text-emerald-700',
    D: 'bg-amber-100 text-amber-700',
    A: 'bg-rose-100 text-rose-700',
    R: 'bg-slate-100 text-slate-700',
  }
  const first = initials?.[0] ?? '?'
  const colorClass = colors[first] ?? 'bg-brand-50 text-brand-700'
  return (
    <span
      className={[
        'inline-grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold',
        colorClass,
      ].join(' ')}
    >
      {initials}
    </span>
  )
}

// ── List section (action items) ────────────────────────────────────────────────
function BulletList({ items }) {
  if (!items?.length) {
    return <p className="text-sm text-ink-muted">No action items were logged for this interaction.</p>
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li className="flex items-start gap-2 text-sm text-ink-secondary" key={i}>
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400" />
          {item}
        </li>
      ))}
    </ul>
  )
}

// ── Copy toast ────────────────────────────────────────────────────────────────
function useCopyToast() {
  const [copied, setCopied] = useState(false)
  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return { copied, copy }
}

// ── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({ icon: Icon, label, onClick, active }) {
  return (
    <button
      aria-label={label}
      className={[
        'inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary',
      ].join(' ')}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-3.5" />
      {active ? 'Copied!' : label}
    </button>
  )
}

// ── Expandable summary text ───────────────────────────────────────────────────
function ExpandableSummary({ text }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 200
  return (
    <div>
      <p className={['text-sm leading-relaxed text-ink-secondary', !expanded && isLong ? 'line-clamp-3' : ''].join(' ')}>
        {text}
      </p>
      {isLong && (
        <button
          className="mt-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}

// ── Main conversation card ────────────────────────────────────────────────────
function ConversationCard({ onViewDetails, summary }) {
  const [open, setOpen] = useState(false)
  const { copied, copy } = useCopyToast()

  const formattedDate = new Date(summary.meetingDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const copyText = [
    `Company: ${summary.company}`,
    `Contact: ${summary.contact}`,
    `Interaction: ${summary.interactionType} on ${formattedDate}`,
    '',
    'Summary:',
    summary.aiSummary,
    '',
    'Action Items:',
    summary.actionItems.length
      ? summary.actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')
      : 'None logged.',
  ].join('\n')

  const handleDownload = () => {
    const blob = new Blob([copyText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `summary-${summary.company.replace(/\s+/g, '-').toLowerCase()}-${summary.meetingDate.slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <article className="card-interactive group overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar initials={summary.contactInitials} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-ink-primary truncate">{summary.contact}</p>
              <SentimentBadge type={summary.interactionType} />
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
              <Building2 className="size-3" />
              <span className="font-medium text-ink-secondary">{summary.company}</span>
              {summary.industry && (
                <>
                  <span>·</span>
                  <span>{summary.industry}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Meeting meta */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Calendar className="size-3" />
            <time dateTime={summary.meetingDate}>{formattedDate}</time>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-brand-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">AI Summary</span>
        </div>
        <ExpandableSummary text={summary.aiSummary} />
      </div>

      {/* Collapsible details */}
      <div className="mt-4">
        <button
          aria-controls={`details-${summary.id}`}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink-secondary transition-colors"
          onClick={() => setOpen(!open)}
          type="button"
        >
          <ChevronDown className={['size-3.5 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')} />
          {open ? 'Hide details' : 'View action items'}
        </button>

        {open && (
          <div className="mt-4 border-t border-line-default pt-4" id={`details-${summary.id}`}>
            <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">Action Items</h4>
            <BulletList items={summary.actionItems} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-line-default pt-3">
        <ActionBtn
          active={copied}
          icon={copied ? Check : Copy}
          label="Copy Summary"
          onClick={() => copy(copyText)}
        />
        <ActionBtn icon={Download} label="Download" onClick={handleDownload} />
        <ActionBtn icon={Eye} label="View Details" onClick={() => onViewDetails(summary)} />
      </div>
    </article>
  )
}

export default ConversationCard
