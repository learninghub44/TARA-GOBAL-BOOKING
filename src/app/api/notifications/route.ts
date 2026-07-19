import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/rbac/utils'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, link_url, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Notification list error:', error)
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
  }

  return NextResponse.json({ notifications: data })
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const ids: unknown = body?.ids

  const supabase = createAdminClient()
  let query = supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)

  if (Array.isArray(ids) && ids.length > 0) {
    query = query.in('id', ids)
  } else {
    query = query.eq('is_read', false)
  }

  const { error } = await query
  if (error) {
    console.error('Notification mark-read error:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
