import { NextRequest, NextResponse } from 'next/server'
import { processPaymentWebhook } from '@/lib/payments/service'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    const result = await processPaymentWebhook('mpesa', payload)

    if (!result.success) {
      console.error('M-Pesa webhook processing failed:', result.error)
    }

    // Safaricom expects this exact envelope regardless of our internal outcome,
    // otherwise it will keep retrying the callback.
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (error) {
    console.error('M-Pesa webhook error:', error)
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 400 })
  }
}
