import { NextRequest, NextResponse } from 'next/server'
import { processPaymentWebhook } from '@/lib/payments/service'
import { verifyMpesaSTKPushStatus } from '@/lib/payments/providers/mpesa'
import { enforceRateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, { name: 'webhook:mpesa', max: 60, windowSeconds: 60 })
  if (limited) return limited

  try {
    const payload = await request.json()
    const checkoutRequestId: string | undefined = payload?.Body?.stkCallback?.CheckoutRequestID

    if (!checkoutRequestId) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 400 })
    }

    // Daraja callbacks carry no signature, so the claimed ResultCode in the
    // body cannot be trusted on its own -- re-confirm directly with
    // Safaricom before treating this as a real payment.
    const verification = await verifyMpesaSTKPushStatus(checkoutRequestId)

    if (!verification.verified) {
      // Couldn't independently confirm (Safaricom API unreachable, etc).
      // Fail closed: don't mark it paid off an unverified claim. The
      // existing /api/admin/payments/reconcile job can catch this up later.
      console.error('M-Pesa webhook: could not independently verify transaction', checkoutRequestId, verification.error)
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    // Trust our own verified result, not the caller-supplied ResultCode --
    // keep the CallbackMetadata (amount/phone/receipt) since that's only
    // populated on genuine success and processMpesaCallback needs it.
    const verifiedPayload = {
      ...payload,
      Body: {
        stkCallback: {
          ...payload.Body.stkCallback,
          ResultCode: verification.success ? 0 : 1,
        },
      },
    }

    const result = await processPaymentWebhook('mpesa', verifiedPayload)

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
