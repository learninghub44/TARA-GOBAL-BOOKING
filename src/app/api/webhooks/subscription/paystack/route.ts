import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { processPaymentWebhook } from '@/lib/payments/service'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-paystack-signature')
    const secret = process.env.PAYSTACK_SECRET_KEY

    if (secret && signature) {
      const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
      if (expected !== signature) {
        console.error('Paystack webhook signature mismatch')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)

    if (payload.event !== 'charge.success' && payload.event) {
      // Acknowledge other event types without processing (refunds, transfers, etc.)
      return NextResponse.json({ received: true })
    }

    const result = await processPaymentWebhook('paystack', payload)

    if (!result.success) {
      console.error('Paystack webhook processing failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 200 }) // 200 so Paystack doesn't retry-storm on a not-found race
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 })
  }
}
