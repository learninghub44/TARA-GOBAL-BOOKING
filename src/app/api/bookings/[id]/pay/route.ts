import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { initializePaystackPayment, generatePaystackReference } from '@/lib/payments/providers/paystack'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: booking, error } = await supabase.from('bookings').select('*').eq('id', id).single()

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.payment_status === 'completed') {
    return NextResponse.json({ error: 'Booking is already paid' }, { status: 400 })
  }

  const reference = generatePaystackReference()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  try {
    const response = await initializePaystackPayment({
      email: booking.customer_email,
      amount: Math.round(Number(booking.total_amount) * 100),
      currency: booking.currency,
      reference,
      callback_url: `${appUrl}/api/payments/paystack/callback`,
      metadata: {
        booking_id: booking.id,
        tenant_id: booking.tenant_id,
      },
    })

    if (!response.status) {
      throw new Error(response.message)
    }

    await supabase
      .from('bookings')
      .update({
        payment_reference: reference,
        payment_method: 'paystack',
        payment_status: 'processing',
      })
      .eq('id', booking.id)

    return NextResponse.json({ payment_url: response.data.authorization_url })
  } catch (err) {
    console.error('Payment initialization error:', err)
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }
}
