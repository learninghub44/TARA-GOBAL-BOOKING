import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/rbac/utils'
import { refundPayment } from '@/lib/payments/service'
import { logPaymentEvent, getClientIPAddress, getUserAgent } from '@/lib/audit/logger'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePlatformAdmin()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { amount, reason } = body

    const result = await refundPayment(id, amount, reason, admin.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: payment } = await supabase.from('payments').select('tenant_id').eq('id', id).maybeSingle()

    if (payment) {
      await logPaymentEvent(
        payment.tenant_id,
        admin.id,
        id,
        'payment_refunded',
        getClientIPAddress(request),
        getUserAgent(request),
        amount
      )
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      provider_refund_id: result.provider_refund_id,
      note:
        result.status === 'manual_required'
          ? 'This provider does not support automatic refunds here — process the refund directly with the provider, this record is logged for audit.'
          : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
