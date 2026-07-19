import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/rbac/utils'
import { requireTenant } from '@/lib/tenant/utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPayment, processPaymentWebhook, type PaymentProvider } from '@/lib/payments/service'

export async function GET(request: NextRequest) {
  try {
    const reference = request.nextUrl.searchParams.get('reference')
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    const user = await requireTenantAuth()
    const tenant = await requireTenant(user)

    const supabase = createAdminClient()
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_reference', reference)
      .eq('tenant_id', tenant.id)
      .not('promotion_id', 'is', null)
      .maybeSingle()

    if (!payment) {
      return NextResponse.json({ error: 'Promotion payment not found' }, { status: 404 })
    }

    if (payment.status === 'completed' || payment.status === 'failed') {
      return NextResponse.json({
        status: payment.status,
        provider: payment.payment_provider,
        promotion_id: payment.promotion_id,
      })
    }

    const provider = payment.payment_provider as PaymentProvider
    if (provider === 'mpesa') {
      return NextResponse.json({ status: 'pending', provider, promotion_id: payment.promotion_id })
    }

    const verification = await verifyPayment(reference, provider)

    if (verification.success) {
      await processPaymentWebhook(provider, {
        data: { reference, status: 'success' },
        order_tracking_id: reference,
        payment_status: 'COMPLETED',
      })
      return NextResponse.json({ status: 'completed', provider, promotion_id: payment.promotion_id })
    }

    return NextResponse.json({
      status: 'pending',
      provider,
      promotion_id: payment.promotion_id,
      detail: verification.error,
    })
  } catch (error) {
    console.error('Promotion verify error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
