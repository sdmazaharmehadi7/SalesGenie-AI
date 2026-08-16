import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  Plus,
  Search,
  RefreshCw,
  X,
  Sparkles,
  DollarSign,
  TrendingUp,
} from '@/components/ui/icons'
import { getOpportunities, createOpportunity } from '@/services/api/opportunities'

const STAGE_ORDER = [
  'new',
  'qualified',
  'demo',
  'proposal',
  'negotiation',
  'won',
  'lost',
]

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    stage: 'new',
    probability: 20,
    expected_close_date: '',
    notes: '',
  })

  const loadDeals = async () => {
    setLoading(true)
    try {
      const data = await getOpportunities({
        page,
        page_size: 20,
        stage: stageFilter || undefined,
        search,
      })
      setOpportunities(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to load opportunities:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeals()
  }, [page, search, stageFilter])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createOpportunity({
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        probability: formData.probability ? parseInt(formData.probability, 10) : undefined,
        expected_close_date: formData.expected_close_date || undefined,
      })
      setShowCreateModal(false)
      setFormData({
        name: '',
        amount: '',
        stage: 'new',
        probability: 20,
        expected_close_date: '',
        notes: '',
      })
      await loadDeals()
    } catch (err) {
      console.error('Failed to create deal:', err)
    }
  }

  const formatCurrency = (val) => {
    const num = Number(val) || 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              <Briefcase className="size-3.5" />
              Opportunities
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary">
            Deals & Opportunities
          </h1>
          <p className="text-xs text-ink-secondary">
            Manage sales pipeline deals, probabilities, and expected close dates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/pipeline"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-default bg-surface-default px-3.5 py-2 text-xs font-semibold text-ink-primary shadow-xs hover:bg-surface-muted transition-colors"
          >
            <TrendingUp className="size-3.5 text-brand-600" />
            Kanban Board
          </Link>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition-colors"
          >
            <Plus className="size-3.5" />
            New Deal
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line-default bg-surface-default p-3 shadow-xs">
        <div className="flex flex-1 items-center gap-2">
          <Search className="size-4 text-ink-muted ml-2" />
          <input
            type="text"
            placeholder="Search deals by name or notes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full bg-transparent text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-line-default bg-surface-subtle px-3 py-1.5 text-xs font-medium text-ink-primary focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Stages</option>
            {STAGE_ORDER.map((stg) => (
              <option key={stg} value={stg}>
                {stg.charAt(0).toUpperCase() + stg.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Deals Table */}
      <div className="overflow-hidden rounded-xl border border-line-default bg-surface-default shadow-xs">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="size-6 animate-spin text-brand-600" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="py-16 text-center text-xs text-ink-muted">
            No deals found. Click "New Deal" to populate your sales pipeline.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line-default bg-surface-subtle font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3.5">Deal Name</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Stage</th>
                  <th className="px-5 py-3.5">Probability</th>
                  <th className="px-5 py-3.5">Close Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-default text-ink-primary">
                {opportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-surface-subtle transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-brand-600">
                      <Link to={`/opportunities/${opp.id}`} className="hover:underline flex items-center gap-1.5">
                        <Briefcase className="size-3.5 text-ink-muted" />
                        {opp.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-ink-primary">
                      {formatCurrency(opp.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-700">
                        {opp.stage}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-ink-secondary">
                      {opp.probability ?? 20}%
                    </td>
                    <td className="px-5 py-3.5 text-ink-secondary">
                      {opp.expected_close_date
                        ? new Date(opp.expected_close_date).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/opportunities/${opp.id}`}
                        className="rounded-md border border-line-default px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                      >
                        Deal Room
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line-default bg-surface-default p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink-primary">Create New Opportunity</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-ink-muted hover:text-ink-primary"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary">Deal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Globex Enterprise Platform License"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="75000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  >
                    {STAGE_ORDER.map((stg) => (
                      <option key={stg} value={stg}>
                        {stg.charAt(0).toUpperCase() + stg.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary">Notes & Deal Strategy</label>
                <textarea
                  rows={3}
                  placeholder="Key stakeholders, competitive situation, pricing notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-line-default px-4 py-2 text-xs font-medium text-ink-secondary hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-xs"
                >
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
