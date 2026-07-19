'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link_url: string | null
  is_read: boolean
  created_at: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  useEffect(() => {
    let userId: string | null = null
    const supabase = createClient()

    async function init() {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id

      supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev])
          }
        )
        .subscribe()
    }

    init()

    return () => {
      supabase.removeAllChannels()
    }
  }, [])

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          if (!open && unreadCount > 0) markAllRead()
        }}
        className="relative rounded-full p-2 text-brand-navy hover:bg-brand-navy/10"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-white shadow-lg">
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
            )}
            {notifications.map((n) => (
              <a
                key={n.id}
                href={n.link_url || '#'}
                className={`block border-b px-4 py-3 text-sm last:border-0 hover:bg-muted ${
                  n.is_read ? '' : 'bg-brand-navy/5'
                }`}
              >
                <p className="font-medium text-brand-navy">{n.title}</p>
                {n.body && <p className="mt-0.5 text-muted-foreground">{n.body}</p>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
