import { Sparkles } from 'lucide-react'

export function TypingIndicator() {
  return (
    <div className="flex items-start space-x-3 py-3 animate-fade-in">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-ink-inverse shrink-0 shadow-xs">
        <Sparkles className="h-4 w-4 animate-spin" />
      </div>

      <div className="flex items-center space-x-2 rounded-card border border-line-default bg-surface-default px-4 py-3 shadow-xs">
        <span className="text-xs font-medium text-ink-muted">SalesGenie AI is thinking</span>
        <div className="flex space-x-1 items-center">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce" />
        </div>
      </div>
    </div>
  )
}
