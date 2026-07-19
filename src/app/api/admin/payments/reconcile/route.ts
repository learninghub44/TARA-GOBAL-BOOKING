import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdminRole } from '@/lib/rbac/utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPayment, processPaymentWebhook, type PaymentProvider } from '@/lib/payments/service'
import { verifyCronSecret } from '@/lib/security/cron-auth'

// Also callable by a scheduled job via CRON_SECRET, in addition to an
// authenticated platform admin from the dashboard.
async function authorize(request: NextRequest): Promise<{ actorId: string | null }> {
  if (verifyCronSecret(request)) {
    return { actorId: null }
  }
  const admin = await requirePlatformAdminRole(['finance_admin'])
  return { actorId: admin.id }
}

/**
 * Finds payments stuck in 'pending' for longer than a threshold (default 15
 * minutes — long enough that a webhook should have already landed) and
 * actively re-verifies them against the provider. This catches cases where
 * a webhook was dropped, delayed, or never fired.
 */
export async function POST(request: NextRequest) {
  try {
    await authorize(request)

    const minutesStale = parseInt(request.nextUrl.searchParams.get('minutes') || '15', 10)
    const cutoff = new Date(Date.now() - minutesStale * 60 * 1000).toISOString()

    const supabase = createAdminClient()
    const { data: stalePayments, error } = await supabase
      .from('payments')
      .select('id, transaction_reference, payment_provider, status, created_at')
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .neq('payment_provider', 'mpesa') // M-Pesa only resolves via callback, not a verify endpoint
      .limit(200)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stale payments' }, { status: 500 })
    }

    const results: { reference: string; outcome: string }[] = []

    for (const payment of stalePayments || []) {
      const provider = payment.payment_provider as PaymentProvider
      try {
        const verification = await verifyPayment(payment.transaction_reference, provider)

        if (verification.success) {
          await processPaymentWebhook(
            provider,
            {
              data: { reference: payment.transaction_reference, status: 'success' },
              order_tracking_id: payment.transaction_reference,
              payment_status: 'COMPLETED',
            },
            'reconciliation.completed'
          )
          results.push({ reference: payment.transaction_reference, outcome: 'completed' })
        } else {
          results.push({ reference: payment.transaction_reference, outcome: 'still_pending' })
        }
      } catch (err) {
        results.push({
          reference: payment.transaction_reference,
          outcome: `error: ${err instanceof Error ? err.message : 'unknown'}`,
        })
      }
    }

    return NextResponse.json({
      checked: stalePayments?.length ?? 0,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
