import { Paperclip, Send, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function ChatInput({ onSendMessage, isGenerating, onStopGeneration }) {
  const [input, setInput] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [input])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return
    onSendMessage(input)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  return (
    <div className="p-4 bg-surface-default border-t border-line-default shrink-0">
      <div className="max-w-4xl mx-auto space-y-2">
        {isGenerating && (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              onClick={onStopGeneration}
              className="flex items-center space-x-1.5 rounded-control border border-line-default bg-surface-default px-3 py-1 text-xs font-medium text-ink-primary shadow-xs hover:bg-surface-muted transition-colors"
            >
              <Square className="h-3 w-3 fill-danger text-danger" />
              <span>Stop Generating</span>
            </button>
          </div>
        )}

        <div className="relative flex flex-col rounded-card border border-line-default bg-surface-default p-2 shadow-card focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message SalesGenie AI (e.g. analyze lead score, draft cold email)..."
            className="w-full resize-none bg-transparent px-2 py-1 text-xs sm:text-sm text-ink-primary placeholder:text-ink-muted focus:outline-hidden"
          />

          <div className="flex items-center justify-between pt-2 border-t border-line-default/50 mt-1">
            <button
              type="button"
              title="Attach CRM record or document"
              className="rounded-control p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink-primary transition-colors"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <div className="flex items-center space-x-2">
              <span className="hidden sm:inline text-[10px] text-ink-muted">
                Press <kbd className="rounded border border-line-default px-1 bg-surface-muted">Enter</kbd> to send
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || isGenerating}
                className="flex h-7 w-7 items-center justify-center rounded-control bg-brand-500 text-ink-inverse shadow-xs transition-all hover:bg-brand-600 focus:outline-hidden disabled:opacity-40 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
