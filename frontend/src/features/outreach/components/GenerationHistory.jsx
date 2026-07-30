import { Clock, History } from 'lucide-react'

import StatusBadge from '@/components/ui/StatusBadge'

export function GenerationHistory({ history, isLoading, activeCampaignId, onSelectCampaign }) {
  if (isLoading) {
    return (
      <div className="rounded-card border border-line-default bg-surface-default p-4 shadow-card">
        <p className="text-xs text-ink-muted">Loading campaign history...</p>
      </div>
    )
  }

  if (history.length === 0) return null

  return (
    <div className="rounded-card border border-line-default bg-surface-default p-4 shadow-card space-y-3">
      <h3 className="text-xs font-bold text-ink-primary flex items-center space-x-1.5">
        <History className="h-3.5 w-3.5 text-brand-600" />
        <span>Campaign History</span>
      </h3>

      <div className="space-y-2">
        {history.map((item) => {
          const isActive = item.id === activeCampaignId
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectCampaign(item)}
              className={`flex w-full items-center justify-between p-2.5 text-left rounded-control border transition-colors ${
                isActive
                  ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500'
                  : 'border-line-default bg-surface-subtle hover:bg-surface-muted'
              }`}
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="text-xs font-semibold text-ink-primary truncate">
                  {item.subject}
                </div>
                <div className="text-[10px] text-ink-muted line-clamp-1 mt-0.5">
                  {item.body.replace(/\n/g, ' ')}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end space-y-1">
                <StatusBadge status={item.status} />
                <span className="text-[10px] text-ink-muted flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
