import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarClock,
  FileText,
  Filter,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

import { DATE_OPTIONS, INTERACTION_TYPES } from './data/summaryData'
import ConversationCard from './components/ConversationCard'
import SentimentBadge from './components/SentimentBadge'
import NewSummaryModal from './components/NewSummaryModal'
import { useConversationSummaries } from './hooks/useConversationSummaries'

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }) {
  const accentMap = {
    blue: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <article className="card flex items-center gap-4">
      <span className={['grid size-10 shrink-0 place-items-center rounded-card', accentMap[accent] ?? accentMap.slate].join(' ')}>
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <div>
        <p className="text-xl font-semibold tracking-tight text-ink-primary">{value}</p>
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
    </article>
  )
}

// ─── Filter select ────────────────────────────────────────────────────────────
function FilterSelect({ icon: Icon, onChange, options, value }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
      <select
        className="input h-10 cursor-pointer appearance-none pl-9 pr-8 text-sm"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
        <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  )
}

// ─── Active filter pill ───────────────────────────────────────────────────────
function FilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
      {label}
      <button
        aria-label={`Remove filter: ${label}`}
        className="ml-0.5 rounded-full hover:text-brand-900"
        onClick={onRemove}
        type="button"
      >
        <X className="size-3" />
      </button>
    </span>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ hasSummaries, onClear, onNew, query }) {
  if (!hasSummaries) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong bg-surface-subtle py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-ink-muted">
          <Sparkles className="size-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-primary">No conversation summaries yet</p>
          <p className="mt-1 text-sm text-ink-muted">Generate your first AI summary from a call or meeting transcript.</p>
        </div>
        <button className="btn btn-primary btn-sm gap-1.5" onClick={onNew} type="button">
          <Plus className="size-3.5" />
          New Summary
        </button>
      </div>
    )
  }

  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong bg-surface-subtle py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-ink-muted">
        <Search className="size-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink-primary">No summaries found</p>
        <p className="mt-1 text-sm text-ink-muted">
          {query ? <>No results for <strong>"{query}"</strong>.</> : 'Try adjusting your filters.'}
        </p>
      </div>
      <button className="btn btn-secondary btn-sm" onClick={onClear} type="button">
        Clear all filters
      </button>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="card animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-surface-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-surface-muted" />
          <div className="h-2.5 w-24 rounded bg-surface-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-full rounded bg-surface-muted" />
        <div className="h-2.5 w-5/6 rounded bg-surface-muted" />
        <div className="h-2.5 w-3/4 rounded bg-surface-muted" />
      </div>
    </div>
  )
}

function isWithinRange(dateStr, range) {
  if (range === 'All Time') return true
  const date = new Date(dateStr)
  const now = new Date()
  const days = { 'Last 7 Days': 7, 'Last 30 Days': 30, 'Last 90 Days': 90 }
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - days[range])
  return date >= cutoff
}

const ALL_COMPANIES = 'All Companies'
const ALL_TYPES = 'All Types'

// ─── Main page ────────────────────────────────────────────────────────────────
function ConversationSummaryPage() {
  const {
    leads,
    summaries,
    isLoading,
    error,
    reload,
    generateSummary,
    isGenerating,
    generateError,
    setGenerateError,
  } = useConversationSummaries()

  const [search, setSearch] = useState('')
  const [company, setCompany] = useState(ALL_COMPANIES)
  const [interactionType, setInteractionType] = useState(ALL_TYPES)
  const [dateRange, setDateRange] = useState('All Time')
  const [detailSummary, setDetailSummary] = useState(null)
  const [showNewSummary, setShowNewSummary] = useState(false)

  const companyOptions = useMemo(() => {
    const unique = Array.from(new Set(summaries.map((s) => s.company))).sort()
    return [ALL_COMPANIES, ...unique]
  }, [summaries])

  const typeOptions = useMemo(
    () => [
      { value: ALL_TYPES, label: ALL_TYPES },
      ...Object.entries(INTERACTION_TYPES).map(([value, cfg]) => ({ value, label: cfg.label })),
    ],
    []
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return summaries.filter((s) => {
      const matchesSearch =
        !q ||
        s.company.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q) ||
        s.aiSummary.toLowerCase().includes(q)
      const matchesCompany = company === ALL_COMPANIES || s.company === company
      const matchesType = interactionType === ALL_TYPES || s.interactionType === interactionType
      const matchesDate = isWithinRange(s.meetingDate, dateRange)
      return matchesSearch && matchesCompany && matchesType && matchesDate
    })
  }, [search, company, interactionType, dateRange, summaries])

  // Stats
  const withActionItems = summaries.filter((s) => s.actionItems.length > 0).length
  const companiesCovered = new Set(summaries.map((s) => s.company)).size
  const thisWeek = summaries.filter((s) => isWithinRange(s.meetingDate, 'Last 7 Days')).length

  const hasActiveFilters =
    search || company !== ALL_COMPANIES || interactionType !== ALL_TYPES || dateRange !== 'All Time'

  const clearAll = () => {
    setSearch('')
    setCompany(ALL_COMPANIES)
    setInteractionType(ALL_TYPES)
    setDateRange('All Time')
  }

  return (
    <>
      {detailSummary && (
        <DetailModalWrapper onClose={() => setDetailSummary(null)} summary={detailSummary} />
      )}

      {showNewSummary && (
        <NewSummaryModal
          error={generateError}
          isGenerating={isGenerating}
          leads={leads}
          onClose={() => {
            setShowNewSummary(false)
            setGenerateError(null)
          }}
          onGenerate={generateSummary}
        />
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-brand-500" />
              <p className="text-sm font-medium text-brand-600">AI-Powered</p>
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-primary">
              Conversation Summaries
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Review AI-generated summaries and action items from your sales calls, meetings, and demos.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm text-ink-muted">
              {isLoading ? 'Loading…' : `${summaries.length} summaries total`}
            </span>
            <button className="btn btn-primary gap-1.5" onClick={() => setShowNewSummary(true)} type="button">
              <Plus className="size-4" />
              New Summary
            </button>
          </div>
        </header>

        {/* Error state */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-card bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-100">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button className="btn btn-secondary btn-sm gap-1.5" onClick={reload} type="button">
              <RefreshCw className="size-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Stats row */}
        <section aria-label="Summary statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard accent="blue" icon={FileText} label="Total Summaries" value={isLoading ? '—' : summaries.length} />
          <StatCard accent="emerald" icon={ListChecks} label="With Action Items" value={isLoading ? '—' : withActionItems} />
          <StatCard accent="slate" icon={Building2} label="Companies Covered" value={isLoading ? '—' : companiesCovered} />
          <StatCard accent="amber" icon={CalendarClock} label="Logged This Week" value={isLoading ? '—' : thisWeek} />
        </section>

        {/* Filters */}
        <section aria-label="Filters" className="card p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                aria-label="Search summaries"
                className="input h-10 pl-9"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company, contact, or keyword…"
                type="search"
                value={search}
              />
              {search && (
                <button
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary"
                  onClick={() => setSearch('')}
                  type="button"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Company filter */}
            <FilterSelect icon={Building2} onChange={setCompany} options={companyOptions} value={company} />

            {/* Interaction type filter */}
            <FilterSelect icon={Filter} onChange={setInteractionType} options={typeOptions} value={interactionType} />

            {/* Date filter */}
            <FilterSelect icon={Calendar} onChange={setDateRange} options={DATE_OPTIONS} value={dateRange} />

            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm gap-1.5" onClick={clearAll} type="button">
                <Filter className="size-3.5" />
                Clear filters
              </button>
            )}
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-line-default pt-3">
              {search && <FilterPill label={`Search: "${search}"`} onRemove={() => setSearch('')} />}
              {company !== ALL_COMPANIES && <FilterPill label={company} onRemove={() => setCompany(ALL_COMPANIES)} />}
              {interactionType !== ALL_TYPES && (
                <FilterPill
                  label={INTERACTION_TYPES[interactionType]?.label ?? interactionType}
                  onRemove={() => setInteractionType(ALL_TYPES)}
                />
              )}
              {dateRange !== 'All Time' && <FilterPill label={dateRange} onRemove={() => setDateRange('All Time')} />}
              <span className="text-xs text-ink-muted self-center">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </section>

        {/* Conversation cards grid */}
        <section aria-label="Conversation summaries" className="grid gap-4 xl:grid-cols-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : filtered.length > 0 ? (
            filtered.map((summary) => (
              <ConversationCard key={summary.id} onViewDetails={setDetailSummary} summary={summary} />
            ))
          ) : (
            <EmptyState
              hasSummaries={summaries.length > 0}
              onClear={clearAll}
              onNew={() => setShowNewSummary(true)}
              query={search}
            />
          )}
        </section>
      </div>
    </>
  )
}

// Detail modal wrapper — renders the full-screen modal
function DetailModalWrapper({ onClose, summary }) {
  const formattedDate = new Date(summary.meetingDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detail view for ${summary.company}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink-primary/20 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-surface bg-surface-default shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line-default bg-surface-default px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
              {summary.contactInitials}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-primary">{summary.contact}</p>
              <p className="text-xs text-ink-muted">{summary.company}</p>
            </div>
          </div>
          <button
            className="rounded-control p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink-primary transition-colors"
            onClick={onClose}
            aria-label="Close detail modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Meta */}
          <div className="flex flex-wrap gap-3">
            <SentimentBadge type={summary.interactionType} />
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <Calendar className="size-3.5" />
              {formattedDate}
            </span>
          </div>

          {/* AI Summary */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-brand-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-600">AI Summary</h2>
            </div>
            <p className="text-sm leading-relaxed text-ink-secondary">{summary.aiSummary}</p>
          </div>

          {/* Action Items */}
          <div>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">Action Items</h3>
            {summary.actionItems.length ? (
              <ul className="space-y-1.5">
                {summary.actionItems.map((a, i) => (
                  <li className="flex items-start gap-2 text-sm text-ink-secondary" key={i}>
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400" />
                    {a}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">No action items were logged for this interaction.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConversationSummaryPage
