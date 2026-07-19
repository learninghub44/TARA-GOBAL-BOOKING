import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/rbac/utils'
import { requireTenant } from '@/lib/tenant/utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from '@/lib/payments/plans'
import { initializePaymentWithFallback, type PaymentProvider } from '@/lib/payments/service'
import { enforceRateLimit } from '@/lib/security/rate-limit'

const VALID_PROVIDERS: PaymentProvider[] = ['paystack', 'pesapal', 'mpesa']

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, { name: 'vendor:subscription:checkout', max: 10, windowSeconds: 60 })
  if (limited) return limited

  try {
    const body = await request.json()
    const { plan_id, phone_number, provider } = body

    const plan = getPlan(plan_id)
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (provider && !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 })
    }

    const user = await requireTenantAuth()
    const tenant = await requireTenant(user)

    const supabase = createAdminClient()

    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + plan.periodDays * 24 * 60 * 60 * 1000)

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        tenant_id: tenant.id,
        plan: plan.id,
        status: 'inactive',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        auto_renew: true,
        amount: plan.amount,
        currency: plan.currency,
        features: plan.features,
      })
      .select()
      .single()

    if (subError || !subscription) {
      console.error('Error creating subscription record:', subError)
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    // provider-specific preference, else full active-provider fallback chain
    const providerOrder = provider ? [provider as PaymentProvider] : undefined

    const payment = await initializePaymentWithFallback(
      {
        amount: plan.amount,
        currency: plan.currency,
        email: user.email,
        phone_number: phone_number || undefined,
        description: `TARA ${plan.name} vendor subscription — ${tenant.business_name}`,
        tenant_id: tenant.id,
        business_id: tenant.id,
        subscription_id: subscription.id,
        callback_url: `${appUrl}/vendor/subscription/callback`,
      },
      providerOrder
    )

    if (!payment.success) {
      // Leave the subscription row as 'inactive' (not activated) — vendor can retry.
      return NextResponse.json(
        {
          error: payment.error || 'Payment could not be initialized on any provider',
          attempts: payment.attempts,
          subscription_id: subscription.id,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      reference: payment.reference,
      provider: payment.provider,
      payment_url: payment.payment_url,
      attempts: payment.attempts,
      // mpesa has no redirect URL — client should poll /verify or show "check your phone"
      requires_phone_confirmation: payment.provider === 'mpesa',
    })
  } catch (error) {
    console.error('Subscription checkout error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('tenant') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
