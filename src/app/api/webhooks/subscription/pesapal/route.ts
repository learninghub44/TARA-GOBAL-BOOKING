import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment, processPaymentWebhook } from '@/lib/payments/service'
import { enforceRateLimit } from '@/lib/security/rate-limit'

// Pesapal's IPN just tells you "something happened for this order_tracking_id" —
// it does not carry the final status, so we re-verify with Pesapal before recording it.
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, { name: 'webhook:pesapal', max: 60, windowSeconds: 60 })
  if (limited) return limited

  try {
    const body = await request.json().catch(() => ({}))
    const orderTrackingId: string | null =
      body.OrderTrackingId ||
      body.order_tracking_id ||
      request.nextUrl.searchParams.get('OrderTrackingId')
    const merchantReference: string =
      body.OrderMerchantReference || request.nextUrl.searchParams.get('OrderMerchantReference') || ''
    const notificationType: string =
      body.OrderNotificationType || request.nextUrl.searchParams.get('OrderNotificationType') || 'IPNCHANGE'

    if (!orderTrackingId) {
      return NextResponse.json({ error: 'Missing order tracking id' }, { status: 400 })
    }

    const verification = await verifyPayment(orderTrackingId, 'pesapal')

    const result = await processPaymentWebhook('pesapal', {
      order_tracking_id: orderTrackingId,
      payment_status: verification.success ? 'COMPLETED' : 'FAILED',
    })

    if (!result.success) {
      console.error('Pesapal webhook processing failed:', result.error)
    }

    // Pesapal expects this exact acknowledgement shape, or it will keep retrying the IPN.
    return NextResponse.json({
      orderNotificationType: notificationType,
      orderTrackingId,
      orderMerchantReference: merchantReference,
      status: 200,
    })
  } catch (error) {
    console.error('Pesapal webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 })
  }
}

// Pesapal also allows GET-style IPN registration/notification depending on config
export async function GET(request: NextRequest) {
  return POST(request)
}
