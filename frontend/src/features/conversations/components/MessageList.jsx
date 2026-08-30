import { Check, Copy, Sparkles, ThumbsDown, ThumbsUp, User } from 'lucide-react'
import { useState } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'

export function MessageList({ messages, isGenerating, streamingContent }) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {messages.map((msg) => (
        <SingleMessage key={msg.id} message={msg} />
      ))}

      {/* Streaming response */}
      {isGenerating && streamingContent && (
        <SingleMessage
          message={{
            id: 'stream-live',
            role: 'assistant',
            content: streamingContent,
            timestamp: 'Generating…',
          }}
          isStreaming
        />
      )}
    </div>
  )
}

function SingleMessage({ message, isStreaming = false }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error(e)
    }
  }

  if (isUser) {
    return (
      <div className="flex items-start justify-end space-x-3 py-2">
        <div className="flex flex-col items-end min-w-0">
          <div className="rounded-card rounded-tr-xs bg-brand-600 px-4 py-2.5 text-xs sm:text-sm text-white shadow-xs leading-relaxed max-w-xl break-words">
            {message.content}
          </div>
          <span className="text-[10px] text-ink-muted px-1 mt-1">{message.timestamp}</span>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted border border-line-default text-ink-secondary shrink-0">
          <User className="h-4 w-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start space-x-3 py-2 group">
      {/* AI avatar — spins while streaming */}
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-ink-inverse shrink-0 shadow-xs transition-all ${isStreaming ? 'bg-gradient-to-br from-brand-500 to-purple-600 ring-2 ring-brand-300 ring-offset-1' : 'bg-brand-500'}`}>
        <Sparkles className={`h-4 w-4 ${isStreaming ? 'animate-thinking-pulse' : ''}`} />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-ink-primary">SalesGenie AI</span>
          {isStreaming ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-brand-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
              Generating…
            </span>
          ) : (
            <span className="text-[10px] text-ink-muted">{message.timestamp}</span>
          )}
        </div>

        <div className={`rounded-card rounded-tl-xs border bg-surface-default p-4 shadow-xs transition-colors ${isStreaming ? 'border-brand-200' : 'border-line-default'}`}>
          <MarkdownRenderer content={message.content} />
          {/* Blinking cursor while streaming */}
          {isStreaming && (
            <span className="inline-block ml-0.5 h-4 w-0.5 bg-brand-500 animate-pulse rounded-full align-middle" />
          )}
        </div>

        {/* Copy & Feedback Toolbar — hidden while streaming */}
        {!isStreaming && (
          <div className="flex items-center space-x-3 pt-1 text-ink-muted">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center space-x-1 rounded p-1 text-xs hover:bg-surface-muted hover:text-ink-primary transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] text-emerald-600 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Copy response</span>
                </>
              )}
            </button>

            <div className="flex items-center space-x-1 border-l border-line-default pl-2">
              <button type="button" className="p-1 hover:text-ink-primary transition-colors">
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="p-1 hover:text-ink-primary transition-colors">
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
