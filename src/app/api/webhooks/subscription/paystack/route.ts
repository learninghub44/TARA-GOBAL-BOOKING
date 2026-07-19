import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { processPaymentWebhook } from '@/lib/payments/service'
import { enforceRateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, { name: 'webhook:paystack', max: 60, windowSeconds: 60 })
  if (limited) return limited

  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-paystack-signature')
    const secret = process.env.PAYSTACK_SECRET_KEY

    // Previously: `if (secret && signature)` -- meant a missing secret OR a
    // missing signature header silently skipped verification and processed
    // the payload anyway. Both must now be present and match, or the
    // webhook is rejected.
    if (!secret) {
      console.error('Paystack webhook rejected: PAYSTACK_SECRET_KEY not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    const signatureBuf = Buffer.from(signature, 'hex')
    const signatureValid =
      expectedBuf.length === signatureBuf.length && crypto.timingSafeEqual(expectedBuf, signatureBuf)

    if (!signatureValid) {
      console.error('Paystack webhook signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    if (payload.event !== 'charge.success' && payload.event) {
      // Acknowledge other event types without processing (refunds, transfers, etc.)
      return NextResponse.json({ received: true })
    }

    const result = await processPaymentWebhook('paystack', payload, payload.event)

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
