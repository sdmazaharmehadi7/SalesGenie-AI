import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code: ', err)
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-card border border-slate-800 bg-slate-950 text-slate-100 shadow-card">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3.5 py-1.5 text-xs text-slate-400 font-mono">
        <span className="uppercase tracking-wider font-semibold text-[11px]">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center space-x-1 rounded px-2 py-1 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="text-[11px]">Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <pre className="overflow-x-auto p-4 text-xs font-mono leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  )
}
