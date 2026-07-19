'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send } from 'lucide-react'

interface ChatMessage {
  id: string
  sender_type: string
  sender_name: string | null
  content: string
  created_at: string
}

interface ChatWindowProps {
  conversationId: string
  /**
   * Guest customers: pass the access_token returned by POST /api/conversations
   * (persist it, e.g. in localStorage -- it's the credential for this thread).
   * Omit for logged-in staff, who are authorized by their session instead.
   */
  accessToken?: string
  currentSenderType: 'customer' | 'staff'
}

export function ChatWindow({ conversationId, accessToken, currentSenderType }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadMessages() {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: accessToken ? { 'x-conversation-token': accessToken } : undefined,
      })
      if (!res.ok || cancelled) return
      const data = await res.json()
      setMessages(data.messages ?? [])
      setLoading(false)
    }

    loadMessages()

    // Realtime postgres_changes is RLS-gated, so it only delivers events to
    // an authenticated session (staff, or a logged-in customer). Guest
    // customers (identified by an access token, no auth.uid()) fall back to
    // short-interval polling instead.
    if (accessToken) {
      const interval = setInterval(loadMessages, 4000)
      return () => {
        cancelled = true
        clearInterval(interval)
      }
    }

    const supabase = createClient()
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as ChatMessage
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [conversationId, accessToken])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'x-conversation-token': accessToken } : {}),
        },
        body: JSON.stringify({ content: draft.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]))
        setDraft('')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[500px] flex-col rounded-lg border">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading && <p className="text-sm text-muted-foreground">Loading conversation…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet -- say hello.</p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_type === currentSenderType
          return (
            <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <span className="mb-0.5 text-xs text-muted-foreground">{m.sender_name || m.sender_type}</span>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  isMine ? 'bg-brand-navy text-white' : 'bg-muted text-foreground'
                }`}
              >
                {m.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className="flex items-center gap-2 border-t p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={4000}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
