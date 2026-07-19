import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  const signature = request.headers.get('x-paystack-signature')
  const rawBody = await request.text()

  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const expectedSignature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const supabase = createAdminClient()

  if (payload.event === 'charge.success') {
    const reference = payload.data.reference

    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('payment_reference', reference)
      .single()

    if (booking && booking.payment_status !== 'completed') {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'completed',
          status: 'confirmed',
        })
        .eq('id', booking.id)
    }
  }

  return NextResponse.json({ received: true })
}
