import { createAdminClient } from '@/lib/supabase/admin'
import { initializePaystackPayment, verifyPaystackPayment, generatePaystackReference } from './providers/paystack'
import { initializePesapalPayment, verifyPesapalPayment, generatePesapalReference } from './providers/pesapal'
import { initiateMpesaSTKPush, processMpesaCallback, generateMpesaReference } from './providers/mpesa'

export type PaymentProvider = 'paystack' | 'pesapal' | 'mpesa'

// Fallback order when the caller doesn't request a specific provider.
// Paystack first (cards + M-Pesa via Paystack channels, most reliable uptime),
// then Pesapal, then direct Daraja M-Pesa STK push last (needs a phone number).
const DEFAULT_PROVIDER_ORDER: PaymentProvider[] = ['paystack', 'pesapal', 'mpesa']

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
}

/**
 * Returns providers that are actually configured with credentials, i.e. "active".
 */
export async function getAvailableProviders(): Promise<PaymentProvider[]> {
  const providers: PaymentProvider[] = []

  if (process.env.PAYSTACK_SECRET_KEY) {
    providers.push('paystack')
  }

  if (process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET) {
    providers.push('pesapal')
  }

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
 */
export async function initializePayment(request: PaymentRequest): Promise<PaymentResponse> {
  const supabase = createAdminClient()
  const provider = request.provider || 'paystack'
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

  try {
    let paymentUrl: string | undefined

    switch (provider) {
      case 'paystack': {
        if (!request.email) {
          throw new Error('Email required for Paystack payments')
        }
        const paystackResponse = await initializePaystackPayment({
          email: request.email,
          amount: request.amount * 100, // Paystack uses smallest currency unit
          currency: request.currency,
          reference,
          metadata: {
            payment_id: payment.id,
            tenant_id: request.tenant_id,
          },
          callback_url: request.callback_url,
        })

        if (!paystackResponse.status) {
          throw new Error(paystackResponse.message || 'Paystack initialization failed')
        }

        paymentUrl = paystackResponse.data.authorization_url
        break
      }

      case 'pesapal': {
        const pesapalResponse = await initializePesapalPayment({
          amount: request.amount,
          currency: request.currency,
          description: request.description,
          callback_url: request.callback_url || '',
          reference,
          email: request.email,
          phone_number: request.phone_number,
        })

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

        const mpesaResponse = await initiateMpesaSTKPush({
          phone_number: request.phone_number,
          amount: request.amount,
          account_reference: reference,
          transaction_desc: request.description,
          callback_url: request.callback_url || '',
        })

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

  let order = (providerOrder && providerOrder.length ? providerOrder : DEFAULT_PROVIDER_ORDER).filter((p) =>
    active.includes(p)
  )

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
        const verificationData = await verifyPaystackPayment(reference)
        if (!verificationData.status || verificationData.data.status !== 'success') {
          return { success: false, error: 'Payment not successful' }
        }
        return {
          success: true,
          amount: verificationData.data.amount / 100, // Convert back from smallest unit
        }
      }

      case 'pesapal': {
        const verificationData = await verifyPesapalPayment(reference)
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
 * Processes a provider webhook/callback: marks the payment row, and if it
 * belongs to a subscription, activates that subscription AND mirrors the
 * status onto the tenant row (subscription checks read from tenants).
 */
export async function processPaymentWebhook(
  provider: PaymentProvider,
  payload: any
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
        .update({ status: 'active' })
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

    return { success: true, reference }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
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
