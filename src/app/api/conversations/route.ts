import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { getCurrentUser } from '@/lib/rbac/utils'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Creates a conversation for a booking, or returns the existing one.
 * Guest-friendly: identity is proven by matching the booking's own
 * customer_email, same pattern as bookings/route.ts.
 */
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, { name: 'conversations:create', max: 10, windowSeconds: 60 })
  if (limited) return limited

  try {
    const body = await request.json().catch(() => null)
    const { booking_id, customer_email, subject } = body ?? {}

    if (!booking_id || !customer_email || typeof customer_email !== 'string' || !EMAIL_REGEX.test(customer_email)) {
      return NextResponse.json({ error: 'booking_id and a valid customer_email are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, tenant_id, listing_id, listing_type, customer_name, customer_email')
      .eq('id', booking_id)
      .maybeSingle()

    if (!booking || booking.customer_email.trim().toLowerCase() !== customer_email.trim().toLowerCase()) {
      // Don't leak whether the booking exists at all if the email doesn't match.
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('booking_id', booking.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ conversation_id: existing.id, created: false })
    }

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({
        tenant_id: booking.tenant_id,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        listing_id: booking.listing_id,
        listing_type: booking.listing_type,
        booking_id: booking.id,
        subject: subject || `Booking ${booking.id.slice(0, 8)}`,
        is_active: true,
      })
      .select('id')
      .single()

    if (error || !created) {
      console.error('Conversation create error:', error)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation_id: created.id, created: true })
  } catch (error) {
    console.error('Conversation create error:', error)
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }
}

/** Lists conversations for the logged-in tenant staff member's tenant. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('conversations')
      .select('id, customer_name, customer_email, subject, is_active, last_message_at, staff_id, created_at')
      .eq('tenant_id', user.tenant_id)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100)

    if (error) {
      console.error('Conversation list error:', error)
      return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
    }

    return NextResponse.json({ conversations: data })
  } catch (error) {
    console.error('Conversation list error:', error)
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
  }
}
