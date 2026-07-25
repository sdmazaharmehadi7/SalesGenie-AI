import { ArrowDown, Menu, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import { ChatInput } from './ChatInput'
import { ConversationHistory } from './ConversationHistory'
import { MessageList } from './MessageList'
import { PromptSuggestions } from './PromptSuggestions'
import { TypingIndicator } from './TypingIndicator'

export function ChatInterface() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const scrollRef = useRef(null)
  const [showScrollBottom, setShowScrollBottom] = useState(false)

  const {
    conversations,
    activeThreadId,
    activeThread,
    searchQuery,
    setSearchQuery,
    isGenerating,
    streamingContent,
    selectThread,
    createNewChat,
    togglePin,
    deleteThread,
    sendMessage,
    stopGeneration,
    regenerateResponse,
  } = useChat()

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    scrollToBottom('auto')
  }, [activeThreadId])

  useEffect(() => {
    if (isGenerating || streamingContent) {
      scrollToBottom('smooth')
    }
  }, [streamingContent, isGenerating])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 150)
  }

  const hasMessages = activeThread && activeThread.messages.length > 0

  return (
    <div className="flex h-[calc(100vh-6.5rem)] w-full rounded-card border border-line-default bg-surface-default shadow-card overflow-hidden">
      {/* Sidebar Navigation */}
      <ConversationHistory
        conversations={conversations}
        activeThreadId={activeThreadId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectThread={selectThread}
        onNewChat={createNewChat}
        onTogglePin={togglePin}
        onDeleteThread={deleteThread}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Chat Viewport */}
      <div className="flex flex-1 flex-col h-full bg-surface-subtle min-w-0 overflow-hidden relative">
        {/* Header Toolbar */}
        <header className="flex h-14 items-center justify-between border-b border-line-default bg-surface-default px-4 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="rounded-control p-1.5 text-ink-muted hover:bg-surface-muted md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-2 min-w-0">
              <h2 className="truncate text-sm font-semibold text-ink-primary">
                {activeThread ? activeThread.title : 'New AI Session'}
              </h2>
              <span className="hidden sm:inline-flex items-center space-x-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 border border-brand-100">
                <Sparkles className="h-3 w-3 text-brand-500" />
                <span>SalesGenie GPT-4o</span>
              </span>
            </div>
          </div>

          {activeThread && (
            <button
              type="button"
              onClick={regenerateResponse}
              disabled={isGenerating}
              className="flex items-center space-x-1.5 rounded-control px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink-primary disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
          )}
        </header>

        {/* Scrollable Message List / Hero State */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 relative space-y-4"
        >
          {!hasMessages && !isGenerating ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto my-auto min-h-[60vh]">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-ink-inverse shadow-floating">
                <Sparkles className="h-7 w-7 animate-pulse" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-primary mb-2">
                How can SalesGenie AI assist your sales today?
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted max-w-md mb-8">
                Ask any question or select a prompt suggestion below to analyze leads, draft cold emails, or forecast pipeline revenue.
              </p>
              <PromptSuggestions onSelectPrompt={(p) => sendMessage(p)} />
            </div>
          ) : (
            <>
              <MessageList
                messages={activeThread.messages}
                isGenerating={isGenerating}
                streamingContent={streamingContent}
              />

              {isGenerating && !streamingContent && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Floating Scroll Bottom Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-20 right-6 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-surface-default border border-line-default text-ink-primary shadow-floating hover:bg-surface-muted transition-all"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}

        {/* Input Panel */}
        <ChatInput
          onSendMessage={sendMessage}
          isGenerating={isGenerating}
          onStopGeneration={stopGeneration}
        />
      </div>
    </div>
  )
}
