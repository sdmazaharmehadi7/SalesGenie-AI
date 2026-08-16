import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  DollarSign,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  X,
} from '@/components/ui/icons'
import {
  getPipelineBoard,
  updateOpportunityStage,
  createOpportunity,
} from '@/services/api/opportunities'

const STAGE_ORDER = [
  'new',
  'qualified',
  'demo',
  'proposal',
  'negotiation',
  'won',
  'lost',
]

const STAGE_COLORS = {
  new: 'border-t-blue-500 bg-blue-50/20',
  qualified: 'border-t-indigo-500 bg-indigo-50/20',
  demo: 'border-t-purple-500 bg-purple-50/20',
  proposal: 'border-t-amber-500 bg-amber-50/20',
  negotiation: 'border-t-orange-500 bg-orange-50/20',
  won: 'border-t-emerald-500 bg-emerald-50/20',
  lost: 'border-t-slate-400 bg-slate-50/20',
}

export default function PipelinePage() {
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [movingId, setMovingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    stage: 'new',
    probability: 20,
    expected_close_date: '',
    notes: '',
  })

  const loadPipeline = async () => {
    try {
      const data = await getPipelineBoard()
      setBoard(data)
    } catch (err) {
      console.error('Failed to load pipeline board:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadPipeline()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadPipeline()
  }

  const handleStageChange = async (oppId, newStage) => {
    setMovingId(oppId)
    try {
      await updateOpportunityStage(oppId, newStage)
      await loadPipeline()
    } catch (err) {
      console.error('Failed to update stage:', err)
    } finally {
      setMovingId(null)
    }
  }

  const handleCreateDeal = async (e) => {
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
      await loadPipeline()
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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="size-8 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              <Sparkles className="size-3.5" />
              Sales Pipeline
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary">
            Opportunity Pipeline Board
          </h1>
          <p className="text-xs text-ink-secondary">
            Total Active Pipeline:{' '}
            <span className="font-bold text-ink-primary">
              {formatCurrency(board?.total_pipeline_value)}
            </span>{' '}
            across {board?.total_deals_count || 0} total deals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-default bg-surface-default px-3 py-2 text-xs font-semibold text-ink-secondary shadow-xs hover:bg-surface-muted transition-colors"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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

      {/* Kanban Board Columns (Horizontal scroll) */}
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {board?.columns?.map((column) => {
          const colorClass = STAGE_COLORS[column.stage] || 'border-t-brand-500'

          return (
            <div
              key={column.stage}
              className={`flex w-72 shrink-0 flex-col rounded-xl border border-line-default border-t-4 bg-surface-default shadow-xs ${colorClass}`}
            >
              {/* Column Header */}
              <div className="border-b border-line-default p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-primary">
                    {column.stage_name}
                  </span>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-bold text-ink-muted">
                    {column.count}
                  </span>
                </div>
                <div className="mt-1 text-xs font-bold text-brand-600">
                  {formatCurrency(column.total_amount)}
                </div>
              </div>

              {/* Deal Cards list */}
              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {column.opportunities.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-line-default p-4 text-center text-xs text-ink-muted">
                    No deals in this stage
                  </div>
                ) : (
                  column.opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className={`group relative rounded-lg border border-line-default bg-surface-default p-3.5 shadow-2xs transition-all hover:border-brand-300 hover:shadow-xs ${
                        movingId === opp.id ? 'opacity-50' : ''
                      }`}
                    >
                      <Link
                        to={`/opportunities/${opp.id}`}
                        className="block text-xs font-bold text-ink-primary hover:text-brand-600 transition-colors"
                      >
                        {opp.name}
                      </Link>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-ink-primary">
                          {formatCurrency(opp.amount)}
                        </span>
                        <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-ink-secondary">
                          {opp.probability ?? 20}% prob.
                        </span>
                      </div>

                      {opp.expected_close_date && (
                        <div className="mt-2 text-[11px] text-ink-muted">
                          Close: {new Date(opp.expected_close_date).toLocaleDateString()}
                        </div>
                      )}

                      {/* Move Stage Quick Action */}
                      <div className="mt-3 flex items-center justify-between border-t border-line-subtle pt-2">
                        <span className="text-[10px] uppercase font-bold text-ink-muted">Stage:</span>
                        <select
                          value={opp.stage}
                          onChange={(e) => handleStageChange(opp.id, e.target.value)}
                          className="rounded-md border border-line-default bg-surface-subtle px-1.5 py-0.5 text-[11px] font-medium text-ink-primary focus:border-brand-500 focus:outline-none"
                        >
                          {STAGE_ORDER.map((stg) => (
                            <option key={stg} value={stg}>
                              {stg.charAt(0).toUpperCase() + stg.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Deal Modal */}
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

            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary">Deal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp Enterprise Expansion"
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
                    placeholder="50000"
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
                <label className="block text-xs font-semibold text-ink-secondary">Notes & Next Steps</label>
                <textarea
                  rows={3}
                  placeholder="Key requirements, executive sponsors, or timeline notes..."
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
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
