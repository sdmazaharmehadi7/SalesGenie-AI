import { useCallback, useMemo, useRef, useState } from 'react'
import { generateAiResponse, MOCK_CONVERSATIONS } from '../data/mockConversations'

export function useChat() {
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS)
  const [activeThreadId, setActiveThreadId] = useState('conv-1')
  const [searchQuery, setSearchQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const intervalRef = useRef(null)

  const activeThread = useMemo(() => {
    return conversations.find((c) => c.id === activeThreadId) || null
  }, [conversations, activeThreadId])

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

  const selectThread = useCallback((id) => {
    setActiveThreadId(id)
  }, [])

  const createNewChat = useCallback(() => {
    setActiveThreadId(null)
    setStreamingContent('')
  }, [])

  const togglePin = useCallback((id) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    )
  }, [])

  const deleteThread = useCallback((id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    setActiveThreadId((curr) => (curr === id ? null : curr))
  }, [])

  const stopGeneration = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamingContent && activeThreadId) {
      const msg = {
        id: `m-${Date.now()}`,
        role: 'assistant',
        content: streamingContent + '\n\n*(Generation stopped)*',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === activeThreadId ? { ...c, messages: [...c.messages, msg] } : c))
      )
    }
    setIsGenerating(false)
    setStreamingContent('')
  }, [activeThreadId, streamingContent])

  const simulateStream = useCallback((fullText, threadId) => {
    setIsGenerating(true)
    setStreamingContent('')
    const words = fullText.split(' ')
    let idx = 0

    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
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
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setConversations((prev) =>
          prev.map((c) => (c.id === threadId ? { ...c, messages: [...c.messages, finalMsg] } : c))
        )
        setIsGenerating(false)
        setStreamingContent('')
      }
    }, 40)
  }, [])

  const sendMessage = useCallback(
    (text) => {
      if (!text.trim() || isGenerating) return

      const userMsg = {
        id: `m-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      let threadId = activeThreadId

      if (!threadId) {
        threadId = `conv-${Date.now()}`
        const newConv = {
          id: threadId,
          title: text.length > 30 ? text.substring(0, 30) + '...' : text,
          updatedAt: 'Just now',
          isPinned: false,
          messages: [userMsg],
        }
        setConversations((prev) => [newConv, ...prev])
        setActiveThreadId(threadId)
      } else {
        setConversations((prev) =>
          prev.map((c) => (c.id === threadId ? { ...c, messages: [...c.messages, userMsg] } : c))
        )
      }

      const responseText = generateAiResponse(text)
      setTimeout(() => simulateStream(responseText, threadId), 400)
    },
    [activeThreadId, isGenerating, simulateStream]
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

    setConversations((prev) =>
      prev.map((c) => (c.id === activeThreadId ? { ...c, messages: msgs } : c))
    )

    const resp = generateAiResponse(prompt)
    simulateStream(resp, activeThreadId)
  }, [activeThread, activeThreadId, isGenerating, simulateStream])

  return {
    conversations,
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
