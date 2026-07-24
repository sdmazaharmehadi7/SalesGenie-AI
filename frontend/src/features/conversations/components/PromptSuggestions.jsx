import { BarChart3, FileText, Mail, UserCheck } from 'lucide-react'

export function PromptSuggestions({ onSelectPrompt }) {
  const SUGGESTIONS = [
    {
      icon: UserCheck,
      category: 'Lead Intelligence',
      title: 'Analyze Lead Intent',
      prompt: 'Analyze Acme Corp lead profile and provide a quick summary of deal potential and key contacts.',
    },
    {
      icon: Mail,
      category: 'Outreach Generator',
      title: 'Draft Cold Sequence',
      prompt: 'Draft a 3-step cold outreach sequence tailored for Fintech VP of Sales.',
    },
    {
      icon: FileText,
      category: 'Meeting Intelligence',
      title: 'Summarize Discovery Call',
      prompt: 'Extract action items, key objections, and next steps from my latest discovery call transcript.',
    },
    {
      icon: BarChart3,
      category: 'Pipeline Forecast',
      title: 'Q3 Revenue Forecast',
      prompt: 'What is our expected closing revenue for Q3 based on high probability deals (>75%)?',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mx-auto">
      {SUGGESTIONS.map((item, idx) => {
        const Icon = item.icon
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(item.prompt)}
            className="group flex flex-col justify-between text-left p-3.5 rounded-card border border-line-default bg-surface-default hover:border-brand-300 hover:shadow-card transition-all duration-150"
          >
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <div className="p-1 rounded-control bg-brand-50 text-brand-600 border border-brand-100">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
                  {item.category}
                </span>
              </div>
              <h4 className="text-xs font-semibold text-ink-primary group-hover:text-brand-600 transition-colors">
                {item.title}
              </h4>
              <p className="text-[11px] text-ink-muted line-clamp-2 mt-0.5">
                "{item.prompt}"
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
