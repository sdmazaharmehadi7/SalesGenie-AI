import { Check } from 'lucide-react'

export function LengthSelector({ options, selectedLength, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-ink-primary">
        Email Length
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((item) => {
          const isSelected = item.id === selectedLength
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex flex-col justify-between p-2.5 text-left rounded-control border transition-all duration-150 ${
                isSelected
                  ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500 text-brand-700'
                  : 'border-line-default bg-surface-default hover:bg-surface-subtle text-ink-primary'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold">{item.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-brand-600 shrink-0" />}
              </div>
              <span className="text-[10px] text-ink-muted leading-tight mt-1">
                {item.desc}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
