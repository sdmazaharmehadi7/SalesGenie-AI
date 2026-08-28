import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sendChatMessage } from '@/services/api/ai'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'

/** Clean up legacy global unisolated storage key if present */
try {
  localStorage.removeItem('sg_chat_threads')
} catch {
  // Ignore localStorage errors
}

/** Compute user- and workspace-scoped storage key */
function getStorageKey(userId, workspaceId) {
  if (!userId) return null
  const ws = workspaceId || 'personal'
  return `sg_chat_threads_${userId}_${ws}`
}

/** Load persisted threads from scoped localStorage key */
function loadThreads(userId, workspaceId) {
  const key = getStorageKey(userId, workspaceId)
  if (!key) return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Persist threads to scoped localStorage key */
function saveThreads(userId, workspaceId, threads) {
  const key = getStorageKey(userId, workspaceId)
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify(threads))
  } catch {
    // Ignore quota errors silently
  }
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * useChat — manages AI conversation threads backed by POST /api/v1/chat.
 *
 * Conversations are isolated per authenticated user_id and active workspace_id.
 * When the logged-in user or workspace changes, chat history is automatically
 * re-scoped and previous in-memory state is cleared.
 */
export function useChat() {
  const { user } = useAuth()
  const { activeWorkspace } = useWorkspace()

  const userId = user?.id || null
  const workspaceId = activeWorkspace?.id || 'personal'

  const [conversations, setConversations] = useState(() => loadThreads(userId, workspaceId))
  const [activeThreadId, setActiveThreadId] = useState(() => {
    const initialThreads = loadThreads(userId, workspaceId)
    return initialThreads[0]?.id || null
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const intervalRef = useRef(null)
  const abortRef = useRef(false)

  // Track previous user and workspace to detect switches and reset state
  const prevContextRef = useRef({ userId, workspaceId })

  useEffect(() => {
    // If user or workspace changed, cancel ongoing streams and reload isolated threads
    if (prevContextRef.current.userId !== userId || prevContextRef.current.workspaceId !== workspaceId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsGenerating(false)
      setStreamingContent('')
      setSearchQuery('')

      const nextThreads = loadThreads(userId, workspaceId)
      setConversations(nextThreads)
      setActiveThreadId(nextThreads[0]?.id || null)

      prevContextRef.current = { userId, workspaceId }
    }
  }, [userId, workspaceId])

  const activeThread = useMemo(
    () => conversations.find((c) => c.id === activeThreadId) || null,
    [conversations, activeThreadId],
  )

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return conversations.filter((c) => {
      if (!q) return true
      return (
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
      )
    })
  }, [conversations, searchQuery])

  /** Persist to user- and workspace-isolated localStorage */
  const updateConversations = useCallback(
    (updater) => {
      setConversations((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        saveThreads(userId, workspaceId, next)
        return next
      })
    },
    [userId, workspaceId],
  )

  const selectThread = useCallback((id) => setActiveThreadId(id), [])

  const createNewChat = useCallback(() => {
    setActiveThreadId(null)
    setStreamingContent('')
  }, [])

  const togglePin = useCallback(
    (id) => {
      updateConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c)),
      )
    },
    [updateConversations],
  )

  const deleteThread = useCallback(
    (id) => {
      updateConversations((prev) => prev.filter((c) => c.id !== id))
      setActiveThreadId((curr) => (curr === id ? null : curr))
    },
    [updateConversations],
  )

  const stopGeneration = useCallback(() => {
    abortRef.current = true
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamingContent && activeThreadId) {
      const msg = {
        id: `m-${Date.now()}`,
        role: 'assistant',
        content: streamingContent + '\n\n*(Generation stopped)*',
        timestamp: timestamp(),
      }
      updateConversations((prev) =>
        prev.map((c) => (c.id === activeThreadId ? { ...c, messages: [...c.messages, msg] } : c)),
      )
    }
    setIsGenerating(false)
    setStreamingContent('')
  }, [activeThreadId, streamingContent, updateConversations])

  /** Simulate streaming by revealing the full text word-by-word. */
  const simulateStream = useCallback(
    (fullText, threadId) => {
      setIsGenerating(true)
      setStreamingContent('')
      abortRef.current = false
      const words = fullText.split(' ')
      let idx = 0

      if (intervalRef.current) clearInterval(intervalRef.current)

      intervalRef.current = setInterval(() => {
        if (abortRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          return
        }
        if (idx < words.length) {
          setStreamingContent(words.slice(0, idx + 1).join(' '))
          idx++
        } else {
          clearInterval(intervalRef.current)
          intervalRef.current = null

          const finalMsg = {
            id: `m-${Date.now()}`,
            role: 'assistant',
            content: fullText,
            timestamp: timestamp(),
            model: 'AI-Powered Sales Forecasting Platform Using Predictive Analytics',
          }
          updateConversations((prev) =>
            prev.map((c) =>
              c.id === threadId ? { ...c, messages: [...c.messages, finalMsg] } : c,
            ),
          )
          setIsGenerating(false)
          setStreamingContent('')
        }
      }, 35)
    },
    [updateConversations],
  )

  const sendMessage = useCallback(
    async (text) => {
      if (!text?.trim() || isGenerating) return

      const userMsg = {
        id: `m-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: timestamp(),
      }

      let threadId = activeThreadId

      if (!threadId) {
        threadId = `conv-${Date.now()}`
        const newConv = {
          id: threadId,
          title: text.length > 40 ? text.substring(0, 40) + '…' : text,
          updatedAt: 'Just now',
          isPinned: false,
          messages: [userMsg],
        }
        updateConversations((prev) => [newConv, ...prev])
        setActiveThreadId(threadId)
      } else {
        updateConversations((prev) =>
          prev.map((c) =>
            c.id === threadId ? { ...c, messages: [...c.messages, userMsg] } : c,
          ),
        )
      }

      // Call the real AI API
      try {
        const { data } = await sendChatMessage(text.trim())
        const replyText = data?.reply || 'I was unable to generate a response. Please try again.'
        setTimeout(() => simulateStream(replyText, threadId), 300)
      } catch (err) {
        console.error('Chat API error:', err)
        const errorMsg = {
          id: `m-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Sorry, I encountered an error connecting to the AI service. Please check your connection and try again.',
          timestamp: timestamp(),
          isError: true,
        }
        updateConversations((prev) =>
          prev.map((c) => (c.id === threadId ? { ...c, messages: [...c.messages, errorMsg] } : c)),
        )
        setIsGenerating(false)
      }
    },
    [activeThreadId, isGenerating, simulateStream, updateConversations],
  )

  const regenerateResponse = useCallback(() => {
    if (!activeThread || activeThread.messages.length === 0 || isGenerating) return

    const msgs = [...activeThread.messages]
    const last = msgs[msgs.length - 1]

    let prompt = ''
    if (last.role === 'assistant') {
      msgs.pop()
      const prevUser = [...msgs].reverse().find((m) => m.role === 'user')
      prompt = prevUser ? prevUser.content : 'Provide sales insights'
    } else {
      prompt = last.content
    }

    updateConversations((prev) =>
      prev.map((c) => (c.id === activeThreadId ? { ...c, messages: msgs } : c)),
    )

    sendMessage(prompt)
  }, [activeThread, activeThreadId, isGenerating, sendMessage, updateConversations])

  return {
    conversations: filteredConversations,
    activeThreadId,
    activeThread,
    searchQuery,
    setSearchQuery,
    filteredConversations,
    isGenerating,
    streamingContent,
    selectThread,
    createNewChat,
    togglePin,
    deleteThread,
    sendMessage,
    stopGeneration,
    regenerateResponse,
  }
}
