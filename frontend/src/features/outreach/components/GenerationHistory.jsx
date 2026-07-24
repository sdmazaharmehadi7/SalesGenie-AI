import { Clock, History } from 'lucide-react'

export function GenerationHistory({ history, onSelectDraft }) {
  if (history.length === 0) return null

  return (
    <div className="rounded-card border border-line-default bg-surface-default p-4 shadow-card space-y-3">
      <h3 className="text-xs font-bold text-ink-primary flex items-center space-x-1.5">
        <History className="h-3.5 w-3.5 text-brand-600" />
        <span>Recent Generation History</span>
      </h3>

      <div className="space-y-2">
        {history.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectDraft(item)}
            className="flex w-full items-center justify-between p-2.5 text-left rounded-control border border-line-default bg-surface-subtle hover:bg-surface-muted transition-colors"
          >
            <div className="min-w-0 flex-1 pr-2">
              <div className="text-xs font-semibold text-ink-primary truncate">
                {item.selectedSubject}
              </div>
              <div className="text-[10px] text-ink-muted line-clamp-1 mt-0.5">
                {item.body.replace(/\n/g, ' ')}
              </div>
            </div>
            <span className="text-[10px] text-ink-muted shrink-0 flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{item.generatedAt}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
