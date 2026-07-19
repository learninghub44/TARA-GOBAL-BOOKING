import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { authorizeConversationAccess } from '@/lib/chat/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const customerEmail = request.nextUrl.searchParams.get('email')

    const access = await authorizeConversationAccess(id, customerEmail)
    if (!access) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, sender_name, sender_type, message_type, content, attachment_url, attachment_name, is_read, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) {
      console.error('Message list error:', error)
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
    }

    // Mark the other side's messages as read now that this side has fetched them.
    const otherSenderType = access.role === 'staff' ? 'customer' : 'staff'
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', id)
      .eq('sender_type', otherSenderType)
      .eq('is_read', false)

    return NextResponse.json({ messages: data })
  } catch (error) {
    console.error('Message list error:', error)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, { name: 'conversations:message', max: 30, windowSeconds: 60 })
  if (limited) return limited

  try {
    const { id } = await params
    const body = await request.json().catch(() => null)
    const { content, customer_email } = body ?? {}

    if (!content || typeof content !== 'string' || !content.trim() || content.length > 4000) {
      return NextResponse.json({ error: 'content is required (max 4000 chars)' }, { status: 400 })
    }

    const access = await authorizeConversationAccess(id, customer_email)
    if (!access) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const supabase = createAdminClient()

    const senderType = access.role === 'staff' ? 'staff' : 'customer'
    const senderName = access.role === 'staff' ? access.staffName : access.conversation.customer_email

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: access.role === 'staff' ? access.staffUserId : access.conversation.customer_id,
        sender_name: senderName,
        sender_type: senderType,
        message_type: 'text',
        content: content.trim(),
      })
      .select('id, sender_id, sender_name, sender_type, message_type, content, created_at')
      .single()

    if (error || !message) {
      console.error('Message send error:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Auto-assign the first staff member who replies, if unassigned.
    if (access.role === 'staff' && access.staffUserId && !access.conversation.staff_id) {
      await supabase.from('conversations').update({ staff_id: access.staffUserId }).eq('id', id)
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Message send error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
