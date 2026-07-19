import { createAdminClient } from '@/lib/supabase/admin'
import {
  initializePaystackPayment,
  verifyPaystackPayment,
  generatePaystackReference,
  refundPaystackPayment,
} from './providers/paystack'
import { initializePesapalPayment, verifyPesapalPayment, generatePesapalReference } from './providers/pesapal'
import { initiateMpesaSTKPush, processMpesaCallback, generateMpesaReference } from './providers/mpesa'
import { getUsableProviders, getDefaultProvider, type PaymentProvider } from './provider-settings'

export type { PaymentProvider }

// Used only if the payment_provider_settings table has no rows yet (e.g.
// migration not applied) — keeps the service working before the admin
// panel has been configured.
const FALLBACK_PROVIDER_ORDER: PaymentProvider[] = ['paystack', 'pesapal', 'mpesa']

const MAX_RETRIES = 2 // per-provider retry attempts for transient errors
const RETRY_BASE_DELAY_MS = 400

export interface PaymentRequest {
  amount: number
  currency: string
  email?: string
  phone_number?: string
  description: string
  tenant_id: string
  business_id: string
  subscription_id?: string
  provider?: PaymentProvider
  callback_url?: string
}

export interface PaymentResponse {
  success: boolean
  payment_url?: string
  reference: string
  payment_id?: string
  provider?: PaymentProvider
  error?: string
}

export interface PaymentAttempt {
  provider: PaymentProvider
  success: boolean
  error?: string
  retries?: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A network error, timeout, or 5xx is likely transient and worth retrying.
 * A rejected transaction (insufficient funds, invalid card, etc.) is not.
 */
function isRetryableError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('fetch failed') ||
    m.includes('network') ||
    m.includes('timeout') ||
    m.includes('econnreset') ||
    m.includes('enotfound') ||
    m.includes('502') ||
    m.includes('503') ||
    m.includes('504')
  )
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (attempt === MAX_RETRIES || !isRetryableError(message)) {
        throw error
      }
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
      console.warn(`${label}: transient error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`, message)
      await sleep(delay)
    }
  }
  throw lastError
}

/**
 * Providers that are enabled in the admin panel AND have credentials
 * configured via environment variables. Falls back to a hardcoded order
 * (still credential-gated) if the settings table isn't populated yet.
 */
export async function getAvailableProviders(): Promise<PaymentProvider[]> {
  try {
    const usable = await getUsableProviders()
    if (usable.length > 0) return usable
  } catch (error) {
    console.warn('Falling back to env-only provider detection:', error)
  }

  const providers: PaymentProvider[] = []
  if (process.env.PAYSTACK_SECRET_KEY) providers.push('paystack')
  if (process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET) providers.push('pesapal')
  if (
    process.env.MPESA_CONSUMER_KEY &&
    process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_SHORTCODE &&
    process.env.MPESA_PASSKEY
  ) {
    providers.push('mpesa')
  }
  return providers
}

/**
 * Initializes a payment with a single, specific provider. Always writes a
 * payments row so every attempt (successful or not) is auditable — on
 * failure the row is marked 'failed' rather than left dangling as 'pending'.
 * Transient provider errors (network blips, 5xx) are retried with backoff
 * before the attempt is recorded as failed.
 */
export async function initializePayment(request: PaymentRequest): Promise<PaymentResponse> {
  const supabase = createAdminClient()
  const provider = request.provider || (await getDefaultProvider()) || 'paystack'
  const reference = generateReference(provider)

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      transaction_reference: reference,
      tenant_id: request.tenant_id,
      business_id: request.business_id,
      subscription_id: request.subscription_id,
      payment_provider: provider,
      payment_method: 'online',
      currency: request.currency,
      amount: request.amount,
      status: 'pending',
      verification_status: 'pending',
    })
    .select()
    .single()

  if (paymentError || !payment) {
    console.error('Error creating payment record:', paymentError)
    return {
      success: false,
      reference,
      provider,
      error: 'Failed to create payment record',
    }
  }

  const retries = 0

  try {
    let paymentUrl: string | undefined

    switch (provider) {
      case 'paystack': {
        if (!request.email) {
          throw new Error('Email required for Paystack payments')
        }
        const paystackResponse = await withRetry(
          () =>
            initializePaystackPayment({
              email: request.email!,
              amount: request.amount * 100, // Paystack uses smallest currency unit
              currency: request.currency,
              reference,
              metadata: {
                payment_id: payment.id,
                tenant_id: request.tenant_id,
              },
              callback_url: request.callback_url,
            }),
          'Paystack init'
        )

        if (!paystackResponse.status) {
          throw new Error(paystackResponse.message || 'Paystack initialization failed')
        }

        paymentUrl = paystackResponse.data.authorization_url
        break
      }

      case 'pesapal': {
        const pesapalResponse = await withRetry(
          () =>
            initializePesapalPayment({
              amount: request.amount,
              currency: request.currency,
              description: request.description,
              callback_url: request.callback_url || '',
              reference,
              email: request.email,
              phone_number: request.phone_number,
            }),
          'Pesapal init'
        )

        if (pesapalResponse.status !== 'success') {
          throw new Error(pesapalResponse.message || 'Pesapal initialization failed')
        }

        paymentUrl = pesapalResponse.data.redirect_url
        break
      }

      case 'mpesa': {
        if (!request.phone_number) {
          throw new Error('Phone number required for M-Pesa payments')
        }

        const mpesaResponse = await withRetry(
          () =>
            initiateMpesaSTKPush({
              phone_number: request.phone_number!,
              amount: request.amount,
              account_reference: reference,
              transaction_desc: request.description,
              callback_url: request.callback_url || '',
            }),
          'M-Pesa STK push'
        )

        if (mpesaResponse.ResponseCode !== '0') {
          throw new Error(mpesaResponse.ResponseDescription || 'M-Pesa STK push failed')
        }

        // M-Pesa doesn't return a redirect URL — the customer confirms on-device.
        // Leave the payment row 'pending'; the callback route flips it on completion.
        return {
          success: true,
          reference,
          payment_id: payment.id,
          provider,
        }
      }

      default:
        throw new Error(`Unsupported payment provider: ${provider}`)
    }

    return {
      success: true,
      payment_url: paymentUrl,
      reference,
      payment_id: payment.id,
      provider,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Payment initialization error (${provider}):`, message)

    // Don't leave a dangling 'pending' row for an attempt that never went live.
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        verification_status: 'rejected',
        provider_response: { error: message },
        retry_count: retries,
        last_retry_at: retries > 0 ? new Date().toISOString() : null,
      })
      .eq('id', payment.id)

    return {
      success: false,
      reference,
      payment_id: payment.id,
      provider,
      error: message,
    }
  }
}

/**
 * Tries each active payment provider in order and automatically falls back
 * to the next one if the current provider errors out or isn't configured.
 * Returns as soon as one succeeds. If every provider fails, returns the
 * last error along with the full attempt history for diagnostics.
 */
export async function initializePaymentWithFallback(
  request: Omit<PaymentRequest, 'provider'>,
  providerOrder?: PaymentProvider[]
): Promise<PaymentResponse & { attempts: PaymentAttempt[] }> {
  const active = await getAvailableProviders()

  let order = (providerOrder && providerOrder.length ? providerOrder : FALLBACK_PROVIDER_ORDER).filter((p) =>
    active.includes(p)
  )

  // Preserve admin-configured priority order when the caller didn't force one.
  if (!providerOrder || providerOrder.length === 0) {
    order = active.filter((p) => order.includes(p))
    if (order.length === 0) order = active
  }

  // M-Pesa STK push can't run without a phone number - only keep it in the
  // automatic chain when we actually have one to push to.
  if (!request.phone_number) {
    order = order.filter((p) => p !== 'mpesa')
  }

  if (order.length === 0) {
    return {
      success: false,
      reference: generateReference('paystack'),
      error: 'No payment providers are currently configured',
      attempts: [],
    }
  }

  const attempts: PaymentAttempt[] = []

  for (const provider of order) {
    const result = await initializePayment({ ...request, provider })

    if (result.success) {
      attempts.push({ provider, success: true })
      return { ...result, attempts }
    }

    attempts.push({ provider, success: false, error: result.error })
    console.warn(`Payment provider ${provider} failed, falling back...`, result.error)
  }

  const last = attempts[attempts.length - 1]
  return {
    success: false,
    reference: generateReference(order[order.length - 1]),
    provider: last?.provider,
    error: `All payment providers failed. Last error (${last?.provider}): ${last?.error}`,
    attempts,
  }
}

export async function verifyPayment(
  reference: string,
  provider: PaymentProvider
): Promise<{ success: boolean; amount?: number; error?: string }> {
  try {
    switch (provider) {
      case 'paystack': {
        const verificationData = await withRetry(() => verifyPaystackPayment(reference), 'Paystack verify')
        if (!verificationData.status || verificationData.data.status !== 'success') {
          return { success: false, error: 'Payment not successful' }
        }
        return {
          success: true,
          amount: verificationData.data.amount / 100, // Convert back from smallest unit
        }
      }

      case 'pesapal': {
        const verificationData = await withRetry(() => verifyPesapalPayment(reference), 'Pesapal verify')
        if (verificationData.data.payment_status !== 'COMPLETED') {
          return { success: false, error: 'Payment not completed' }
        }
        return {
          success: true,
          amount: verificationData.data.amount,
        }
      }

      case 'mpesa':
        // M-Pesa verification is handled via callback
        return { success: false, error: 'M-Pesa verification handled via callback' }

      default:
        return { success: false, error: 'Unsupported provider' }
    }
  } catch (error) {
    console.error('Payment verification error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Processes a provider webhook/callback: logs the raw payload for audit,
 * marks the payment row, and if it belongs to a subscription, activates
 * that subscription AND mirrors the status onto the tenant row (subscription
 * checks read from tenants).
 */
export async function processPaymentWebhook(
  provider: PaymentProvider,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape differs per provider (paystack/pesapal/mpesa)
  payload: any,
  eventType?: string
): Promise<{ success: boolean; reference?: string; error?: string }> {
  const supabase = createAdminClient()

  try {
    let reference: string
    let success: boolean

    switch (provider) {
      case 'paystack':
        reference = payload.data.reference
        success = payload.data.status === 'success'
        break

      case 'pesapal':
        reference = payload.order_tracking_id
        success = payload.payment_status === 'COMPLETED'
        break

      case 'mpesa': {
        const processed = processMpesaCallback(payload)
        reference = processed.reference
        success = processed.success
        break
      }

      default:
        return { success: false, error: 'Unsupported provider' }
    }

    // Find payment record. M-Pesa's callback reference is the receipt number,
    // not our original account reference, so fall back to matching on that
    // when the direct lookup misses (only relevant for mpesa).
    let { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_reference', reference)
      .maybeSingle()

    if (!payment && provider === 'mpesa') {
      const processed = processMpesaCallback(payload)
      const fallback = await supabase
        .from('payments')
        .select('*')
        .eq('provider_transaction_id', processed.reference)
        .maybeSingle()
      payment = fallback.data
    }

    // Always log the raw webhook, even if we can't match it to a payment yet —
    // this is the audit trail required for reconciliation and disputes.
    await supabase.from('payment_webhooks').insert({
      payment_id: payment?.id ?? null,
      provider,
      event_type: eventType || (success ? 'payment.success' : 'payment.failed'),
      payload,
      processed: !!payment,
      processed_at: payment ? new Date().toISOString() : null,
      error_message: payment ? null : 'Payment record not found for this reference',
    })

    if (!payment) {
      return { success: false, error: 'Payment record not found' }
    }

    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: success ? 'completed' : 'failed',
        verification_status: success ? 'approved' : 'rejected',
        provider_transaction_id: reference,
        provider_response: payload,
      })
      .eq('id', payment.id)

    if (updateError) {
      console.error('Error updating payment:', updateError)
      return { success: false, error: 'Failed to update payment' }
    }

    // If payment successful and has subscription, activate the subscription
    // and mirror status/dates/plan onto the tenant row.
    if (success && payment.subscription_id) {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .update({ status: 'active', reminder_sent_at: null })
        .eq('id', payment.subscription_id)
        .select()
        .single()

      if (subError) {
        console.error('Error activating subscription:', subError)
      } else if (subscription) {
        const { error: tenantError } = await supabase
          .from('tenants')
          .update({
            subscription_status: 'active',
            subscription_plan: subscription.plan,
            subscription_start_date: subscription.start_date,
            subscription_end_date: subscription.end_date,
          })
          .eq('id', payment.tenant_id)

        if (tenantError) {
          console.error('Error activating tenant subscription:', tenantError)
        }
      }
    }

    // If payment failed and has subscription, mark subscription past_due so
    // requireActiveSubscription keeps blocking access instead of silently
    // leaving it 'inactive' with no record of the attempt.
    if (!success && payment.subscription_id) {
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('id', payment.subscription_id)
    }

    // Promotion purchases (Phase 6) — same webhook path, separate record.
    // Dynamic import avoids a circular dependency (promotions/service.ts
    // itself calls into this file to initialize the payment).
    if (payment.promotion_id) {
      const { activatePromotion, markPromotionPaymentFailed } = await import('@/lib/promotions/service')
      if (success) {
        await activatePromotion(payment.promotion_id)
      } else {
        await markPromotionPaymentFailed(payment.promotion_id)
      }
    }

    return { success: true, reference }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export interface RefundResult {
  success: boolean
  status: 'completed' | 'processing' | 'failed' | 'manual_required'
  provider_refund_id?: string
  error?: string
}

/**
 * Admin-initiated refund. Verifies server-side that the payment is actually
 * completed before attempting anything with the provider. Paystack supports
 * refunds via API; Pesapal and M-Pesa don't expose a reliable programmatic
 * refund endpoint for this integration, so those are recorded as
 * 'manual_required' — the admin executes the refund directly with the
 * provider/bank and the record stays here for audit purposes.
 */
export async function refundPayment(
  paymentId: string,
  amount: number | undefined,
  reason: string | undefined,
  initiatedBy: string
): Promise<RefundResult> {
  const supabase = createAdminClient()

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle()

  if (paymentError || !payment) {
    return { success: false, status: 'failed', error: 'Payment not found' }
  }

  if (payment.status !== 'completed') {
    return { success: false, status: 'failed', error: 'Only completed payments can be refunded' }
  }

  const refundAmount = amount ?? Number(payment.amount) - Number(payment.refunded_amount || 0)
  if (refundAmount <= 0 || refundAmount > Number(payment.amount) - Number(payment.refunded_amount || 0)) {
    return { success: false, status: 'failed', error: 'Invalid refund amount' }
  }

  const { data: refundRow, error: refundInsertError } = await supabase
    .from('payment_refunds')
    .insert({
      payment_id: payment.id,
      tenant_id: payment.tenant_id,
      amount: refundAmount,
      currency: payment.currency,
      reason,
      status: 'processing',
      initiated_by: initiatedBy,
    })
    .select()
    .single()

  if (refundInsertError || !refundRow) {
    return { success: false, status: 'failed', error: 'Failed to create refund record' }
  }

  let result: RefundResult

  try {
    switch (payment.payment_provider as PaymentProvider) {
      case 'paystack': {
        const isFullRefund = refundAmount >= Number(payment.amount)
        const response = await refundPaystackPayment(
          payment.transaction_reference,
          isFullRefund ? undefined : Math.round(refundAmount * 100)
        )
        result = {
          success: true,
          status: 'completed',
          provider_refund_id: response.data?.id ? String(response.data.id) : undefined,
        }
        break
      }

      case 'pesapal':
      case 'mpesa':
      default:
        // No safe programmatic refund path — flag for manual processing.
        result = { success: true, status: 'manual_required' }
        break
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    result = { success: false, status: 'failed', error: message }
  }

  await supabase
    .from('payment_refunds')
    .update({
      status: result.status,
      provider_refund_id: result.provider_refund_id,
      provider_response: result.error ? { error: result.error } : null,
    })
    .eq('id', refundRow.id)

  if (result.status === 'completed') {
    const newRefundedTotal = Number(payment.refunded_amount || 0) + refundAmount
    await supabase
      .from('payments')
      .update({
        refunded_amount: newRefundedTotal,
        status: newRefundedTotal >= Number(payment.amount) ? 'refunded' : payment.status,
      })
      .eq('id', payment.id)
  }

  return result
}

function generateReference(provider: PaymentProvider): string {
  switch (provider) {
    case 'paystack':
      return generatePaystackReference()
    case 'pesapal':
      return generatePesapalReference()
    case 'mpesa':
      return generateMpesaReference()
    default:
      return `TARA-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}
