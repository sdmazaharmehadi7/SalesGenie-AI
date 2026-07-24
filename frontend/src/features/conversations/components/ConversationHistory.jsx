import { CheckCircle2, MessageSquare, Pin, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'

export function ConversationHistory({
  conversations,
  activeThreadId,
  searchQuery,
  onSearchChange,
  onSelectThread,
  onNewChat,
  onTogglePin,
  onDeleteThread,
  isOpenMobile,
  onCloseMobile,
}) {
  const pinned = conversations.filter((c) => c.isPinned)
  const recent = conversations.filter((c) => !c.isPinned)

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-ink-primary/30 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface-default border-r border-line-default transition-transform duration-200 ease-in-out md:static md:z-auto md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Actions */}
        <div className="p-3.5 border-b border-line-default space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onNewChat()
                onCloseMobile?.()
              }}
              className="flex w-full items-center justify-center space-x-2 rounded-control bg-brand-500 px-3.5 py-2 text-xs sm:text-sm font-medium text-ink-inverse shadow-xs transition-all hover:bg-brand-600 focus:outline-hidden"
            >
              <Plus className="h-4 w-4" />
              <span>New Conversation</span>
            </button>

            <button
              type="button"
              onClick={onCloseMobile}
              className="ml-2 rounded-control p-2 text-ink-muted hover:bg-surface-muted md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search chat history..."
              className="w-full rounded-control border border-line-default bg-surface-subtle py-1.5 pl-8 pr-3 text-xs text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:bg-surface-default focus:outline-hidden"
            />
          </div>
        </div>

        {/* Scrollable Conversations */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {pinned.length > 0 && (
            <div>
              <div className="mb-1.5 px-3 text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
                Pinned Chats
              </div>
              <RenderList
                items={pinned}
                activeThreadId={activeThreadId}
                onSelect={(id) => {
                  onSelectThread(id)
                  onCloseMobile?.()
                }}
                onTogglePin={onTogglePin}
                onDelete={onDeleteThread}
              />
            </div>
          )}

          <div>
            <div className="mb-1.5 px-3 text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
              Recent History
            </div>
            <RenderList
              items={recent}
              activeThreadId={activeThreadId}
              onSelect={(id) => {
                onSelectThread(id)
                onCloseMobile?.()
              }}
              onTogglePin={onTogglePin}
              onDelete={onDeleteThread}
            />
          </div>
        </div>

        {/* Model Status Widget */}
        <div className="border-t border-line-default p-3 bg-surface-subtle">
          <div className="flex items-center space-x-2.5 rounded-card p-2.5 bg-surface-default border border-line-default shadow-xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-control bg-brand-50 text-brand-600 shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1">
                <span className="text-xs font-semibold text-ink-primary truncate">
                  SalesGenie GPT-4o
                </span>
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              </div>
              <div className="text-[10px] text-emerald-600 font-medium truncate">
                System Status: Operational
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function RenderList({ items, activeThreadId, onSelect, onTogglePin, onDelete }) {
  if (items.length === 0) {
    return <div className="py-2 text-center text-[11px] text-ink-muted">No conversations found</div>
  }

  return (
    <div className="space-y-1">
      {items.map((conv) => {
        const isActive = conv.id === activeThreadId
        return (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`group relative flex cursor-pointer items-center justify-between rounded-control px-3 py-2 text-xs sm:text-sm transition-all duration-150 ${
              isActive
                ? 'bg-brand-50 font-medium text-brand-700 shadow-xs'
                : 'text-ink-primary hover:bg-surface-muted'
            }`}
          >
            <div className="flex items-center space-x-2 min-w-0 pr-2">
              <MessageSquare
                className={`h-3.5 w-3.5 shrink-0 ${
                  isActive ? 'text-brand-600' : 'text-ink-muted group-hover:text-ink-secondary'
                }`}
              />
              <span className="truncate">{conv.title}</span>
            </div>

            <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePin(conv.id)
                }}
                className={`rounded p-1 transition-colors ${
                  conv.isPinned ? 'text-brand-600' : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <Pin className={`h-3 w-3 ${conv.isPinned ? 'fill-brand-600' : ''}`} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(conv.id)
                }}
                className="rounded p-1 text-ink-muted hover:text-danger transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
