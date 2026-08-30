import { Sparkles, Brain, Search, Database } from 'lucide-react'
import { useEffect, useState } from 'react'

const THINKING_PHASES = [
  { icon: Search,   text: 'Analyzing your question…',  color: 'text-blue-500',   bg: 'bg-blue-500' },
  { icon: Database, text: 'Retrieving CRM context…',   color: 'text-purple-500', bg: 'bg-purple-500' },
  { icon: Brain,    text: 'SalesGenie AI is thinking…', color: 'text-brand-500',  bg: 'bg-brand-500' },
  { icon: Sparkles, text: 'Crafting your answer…',     color: 'text-amber-500',  bg: 'bg-amber-500' },
]

export function TypingIndicator() {
  const [phase, setPhase] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setPhase((p) => (p + 1) % THINKING_PHASES.length)
        setVisible(true)
      }, 250)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  const current = THINKING_PHASES[phase]
  const PhaseIcon = current.icon

  return (
    <div className="flex items-start space-x-3 py-3 animate-fade-in">
      {/* AI Avatar with pulse ring */}
      <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-purple-600 text-white shrink-0 shadow-floating">
        <Sparkles className="h-4 w-4 animate-thinking-pulse" />
        {/* Online indicator */}
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 animate-pulse" />
      </div>

      {/* Thinking Bubble */}
      <div className="flex flex-col gap-3 rounded-2xl rounded-tl-sm border border-line-default bg-surface-default px-5 py-4 shadow-card min-w-[280px] max-w-sm">

        {/* Phase label with animated icon */}
        <div
          className="flex items-center gap-2.5 transition-all duration-300"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(3px)' }}
        >
          <span className={`flex h-5 w-5 items-center justify-center rounded-md ${current.bg} bg-opacity-15`}>
            <PhaseIcon className={`h-3.5 w-3.5 ${current.color}`} />
          </span>
          <span className="text-xs font-semibold text-ink-secondary tracking-wide">
            {current.text}
          </span>
        </div>

        {/* Shimmer skeleton lines */}
        <div className="space-y-2">
          <div
            className="h-2 rounded-full animate-shimmer"
            style={{
              backgroundImage: 'linear-gradient(90deg, #f1f5f9 0%, #e0e9ff 50%, #f1f5f9 100%)',
              backgroundSize: '200% auto',
            }}
          />
          <div
            className="h-2 w-4/5 rounded-full animate-shimmer"
            style={{
              backgroundImage: 'linear-gradient(90deg, #f1f5f9 0%, #e0e9ff 50%, #f1f5f9 100%)',
              backgroundSize: '200% auto',
              animationDelay: '0.15s',
            }}
          />
          <div
            className="h-2 w-3/5 rounded-full animate-shimmer"
            style={{
              backgroundImage: 'linear-gradient(90deg, #f1f5f9 0%, #e0e9ff 50%, #f1f5f9 100%)',
              backgroundSize: '200% auto',
              animationDelay: '0.3s',
            }}
          />
        </div>

        {/* Bouncing dots row */}
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce" />
          <span className="ml-1 text-[10px] text-ink-disabled tracking-wide select-none">processing</span>
        </div>
      </div>
    </div>
  )
}
