import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPaystackPayment } from '@/lib/payments/providers/paystack'

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference') || request.nextUrl.searchParams.get('trxref')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/booking/confirmation?status=error`)
  }

  const supabase = createAdminClient()

  try {
    const verification = await verifyPaystackPayment(reference)
    const success = verification.status && verification.data.status === 'success'

    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('payment_reference', reference)
      .single()

    if (booking) {
      await supabase
        .from('bookings')
        .update({
          payment_status: success ? 'completed' : 'failed',
          status: success ? 'confirmed' : booking.status,
        })
        .eq('id', booking.id)

      return NextResponse.redirect(
        `${appUrl}/booking/confirmation?status=${success ? 'success' : 'failed'}&booking=${booking.id}`
      )
    }

    return NextResponse.redirect(`${appUrl}/booking/confirmation?status=${success ? 'success' : 'failed'}`)
  } catch (err) {
    console.error('Payment callback verification error:', err)
    return NextResponse.redirect(`${appUrl}/booking/confirmation?status=error`)
  }
}
