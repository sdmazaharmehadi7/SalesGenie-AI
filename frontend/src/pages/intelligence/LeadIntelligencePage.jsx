import { useState, useMemo } from 'react'
import {
  Sparkles,
  Search,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  X,
  Plus,
  Users,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  FileQuestion,
} from 'lucide-react'

import { INITIAL_LEADS, INDUSTRIES, STATUSES, SCORE_RANGES } from './data/intelligenceData'
import { LeadCard } from './components/LeadCard'
import { RightSidebar } from './components/RightSidebar'
import { LeadSkeleton } from './components/LeadSkeleton'
import { ProfileModal, EmailModal, MeetingModal, NoteModal } from './components/ActionModals'

function LeadIntelligencePage() {
  const [leads, setLeads] = useState(INITIAL_LEADS)
  const [isLoading, setIsLoading] = useState(false)

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('All Industries')
  const [selectedStatus, setSelectedStatus] = useState('All Statuses')
  const [selectedScoreRange, setSelectedScoreRange] = useState('All Scores')
  const [sortBy, setSortBy] = useState('score-desc') // 'score-desc' | 'updated-desc' | 'value-desc'

  // Modal active states
  const [profileModalLead, setProfileModalLead] = useState(null)
  const [emailModalLead, setEmailModalLead] = useState(null)
  const [meetingModalLead, setMeetingModalLead] = useState(null)
  const [noteModalLead, setNoteModalLead] = useState(null)

  // Quick Notification Toast
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Filter & Sort Logic
  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        // Search query
        const query = searchQuery.toLowerCase().trim()
        const matchesSearch =
          !query ||
          lead.name.toLowerCase().includes(query) ||
          lead.company.toLowerCase().includes(query) ||
          lead.industry.toLowerCase().includes(query) ||
          lead.title.toLowerCase().includes(query)

        // Industry filter
        const matchesIndustry =
          selectedIndustry === 'All Industries' || lead.industry === selectedIndustry

        // Status filter
        const matchesStatus =
          selectedStatus === 'All Statuses' || lead.status === selectedStatus

        // Score range filter
        let matchesScore = true
        if (selectedScoreRange === 'Hot Leads (80-100)') {
          matchesScore = lead.score >= 80
        } else if (selectedScoreRange === 'Warm Leads (50-79)') {
          matchesScore = lead.score >= 50 && lead.score <= 79
        } else if (selectedScoreRange === 'Cold Leads (0-49)') {
          matchesScore = lead.score < 50
        }

        return matchesSearch && matchesIndustry && matchesStatus && matchesScore
      })
      .sort((a, b) => {
        if (sortBy === 'score-desc') {
          return b.score - a.score
        }
        if (sortBy === 'updated-desc') {
          return new Date(b.updatedAt) - new Date(a.updatedAt)
        }
        if (sortBy === 'value-desc') {
          return b.dealValueNum - a.dealValueNum
        }
        return 0
      })
  }, [leads, searchQuery, selectedIndustry, selectedStatus, selectedScoreRange, sortBy])

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedIndustry('All Industries')
    setSelectedStatus('All Statuses')
    setSelectedScoreRange('All Scores')
    setSortBy('score-desc')
  }

  // Simulate refreshing AI data
  const handleRefreshData = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      showToast('AI Lead Scores & Insights re-calculated.')
    }, 700)
  }

  // Add note handler
  const handleAddNoteSave = (leadId, noteText) => {
    setLeads((prevLeads) =>
      prevLeads.map((l) =>
        l.id === leadId
          ? {
              ...l,
              lastInteraction: 'Just now',
              aiInsights: {
                ...l.aiInsights,
                suggestedNextAction: `Note added: "${noteText.slice(0, 45)}..."`,
              },
            }
          : l
      )
    )
    showToast('Note added successfully!')
  }

  const hasActiveFilters =
    searchQuery ||
    selectedIndustry !== 'All Industries' ||
    selectedStatus !== 'All Statuses' ||
    selectedScoreRange !== 'All Scores'

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-card bg-surface-inverse text-ink-inverse px-4 py-2.5 shadow-floating text-sm font-medium animate-fade-in">
          <Sparkles className="size-4 text-brand-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
              <Sparkles className="size-3.5 text-brand-600" />
              AI Intelligence Suite
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-primary">
            Lead Intelligence
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            AI-powered insights to prioritize leads and increase conversion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLoading(!isLoading)}
            className="btn btn-secondary btn-sm gap-1.5 text-xs"
            title="Toggle Skeleton Loader Preview"
          >
            {isLoading ? 'Show Content' : 'Simulate Skeleton'}
          </button>
          <button
            onClick={handleRefreshData}
            className="btn btn-primary btn-sm gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh AI Scoring
          </button>
        </div>
      </header>

      {/* Search & Filters Card */}
      <section aria-label="Filters bar" className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              placeholder="Search by lead name, company, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input h-10 pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Lead Score Filter */}
          <div className="min-w-[160px]">
            <select
              value={selectedScoreRange}
              onChange={(e) => setSelectedScoreRange(e.target.value)}
              className="input h-10 cursor-pointer text-sm"
            >
              {SCORE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </div>

          {/* Industry Filter */}
          <div className="min-w-[150px]">
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="input h-10 cursor-pointer text-sm"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[140px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input h-10 cursor-pointer text-sm"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="min-w-[160px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input h-10 cursor-pointer text-sm font-medium"
            >
              <option value="score-desc">Highest AI Score</option>
              <option value="updated-desc">Recently Updated</option>
              <option value="value-desc">Highest Deal Value</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="btn btn-ghost btn-sm gap-1 text-xs text-ink-muted hover:text-ink-primary"
            >
              <X className="size-3.5" /> Clear Filters
            </button>
          )}
        </div>

        {/* Filter Summary Counter */}
        <div className="flex items-center justify-between pt-2 border-t border-line-default text-xs text-ink-muted">
          <span>
            Showing <strong className="text-ink-primary">{filteredLeads.length}</strong> of{' '}
            {leads.length} leads
          </span>
          {hasActiveFilters && (
            <span className="text-brand-600 font-medium">Filtered Results Active</span>
          )}
        </div>
      </section>

      {/* Main Grid: Leads Cards Column + Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Center Column: Lead Cards */}
        <main className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <>
              <LeadSkeleton />
              <LeadSkeleton />
              <LeadSkeleton />
            </>
          ) : filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onViewProfile={(l) => setProfileModalLead(l)}
                onGenerateEmail={(l) => setEmailModalLead(l)}
                onScheduleMeeting={(l) => setMeetingModalLead(l)}
                onAddNote={(l) => setNoteModalLead(l)}
              />
            ))
          ) : (
            /* Professional Empty State */
            <div className="card flex flex-col items-center justify-center p-12 text-center space-y-4 border-dashed border-2">
              <div className="grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600">
                <FileQuestion className="size-7" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-semibold text-ink-primary">
                  No leads match your criteria
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  We couldn't find any lead matching your selected search query or filters. Try adjusting the filters or search term.
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="btn btn-secondary btn-sm gap-1.5"
              >
                <X className="size-3.5" />
                Reset All Filters
              </button>
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <RightSidebar
          leads={leads}
          onSelectLead={(l) => setProfileModalLead(l)}
        />
      </div>

      {/* Interactive Modals */}
      {profileModalLead && (
        <ProfileModal
          lead={profileModalLead}
          onClose={() => setProfileModalLead(null)}
        />
      )}

      {emailModalLead && (
        <EmailModal
          lead={emailModalLead}
          onClose={() => setEmailModalLead(null)}
        />
      )}

      {meetingModalLead && (
        <MeetingModal
          lead={meetingModalLead}
          onClose={() => setMeetingModalLead(null)}
        />
      )}

      {noteModalLead && (
        <NoteModal
          lead={noteModalLead}
          onClose={() => setNoteModalLead(null)}
          onAddNote={handleAddNoteSave}
        />
      )}
    </div>
  )
}

export default LeadIntelligencePage
