import { createClient } from '@/lib/supabase/server'
import { initializePaystackPayment, verifyPaystackPayment, generatePaystackReference } from './providers/paystack'
import { initializePesapalPayment, verifyPesapalPayment, generatePesapalReference } from './providers/pesapal'
import { initiateMpesaSTKPush, processMpesaCallback, generateMpesaReference } from './providers/mpesa'

export type PaymentProvider = 'paystack' | 'pesapal' | 'mpesa'

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
  error?: string
}

export async function initializePayment(request: PaymentRequest): Promise<PaymentResponse> {
  const supabase = await createClient()
  const provider = request.provider || 'paystack'
  
  try {
    // Create payment record
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

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
      return {
        success: false,
        reference,
        error: 'Failed to create payment record',
      }
    }

    let paymentUrl: string = ''

    switch (provider) {
      case 'paystack':
        const paystackResponse = await initializePaystackPayment({
          email: request.email || '',
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
          throw new Error(paystackResponse.message)
        }
        
        paymentUrl = paystackResponse.data.authorization_url
        break

      case 'pesapal':
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
          throw new Error(pesapalResponse.message)
        }
        
        paymentUrl = pesapalResponse.data.redirect_url
        break

      case 'mpesa':
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
          throw new Error(mpesaResponse.ResponseDescription)
        }
        
        // M-Pesa doesn't return a payment URL, it's an STK push
        return {
          success: true,
          reference,
        }

      default:
        throw new Error(`Unsupported payment provider: ${provider}`)
    }

    return {
      success: true,
      payment_url: paymentUrl,
      reference,
    }
  } catch (error) {
    console.error('Payment initialization error:', error)
    return {
      success: false,
      reference: generateReference(provider),
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function verifyPayment(
  reference: string,
  provider: PaymentProvider
): Promise<{ success: boolean; amount?: number; error?: string }> {
  try {
    let verificationData: any

    switch (provider) {
      case 'paystack':
        verificationData = await verifyPaystackPayment(reference)
        if (!verificationData.status || verificationData.data.status !== 'success') {
          return { success: false, error: 'Payment not successful' }
        }
        return {
          success: true,
          amount: verificationData.data.amount / 100, // Convert back from smallest unit
        }

      case 'pesapal':
        verificationData = await verifyPesapalPayment(reference)
        if (verificationData.data.payment_status !== 'COMPLETED') {
          return { success: false, error: 'Payment not completed' }
        }
        return {
          success: true,
          amount: verificationData.data.amount,
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

export async function processPaymentWebhook(
  provider: PaymentProvider,
  payload: any
): Promise<{ success: boolean; reference?: string; error?: string }> {
  const supabase = await createClient()

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

      case 'mpesa':
        const processed = processMpesaCallback(payload)
        reference = processed.reference
        success = processed.success
        break

      default:
        return { success: false, error: 'Unsupported provider' }
    }

    // Find payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_reference', reference)
      .single()

    if (!payment) {
      return { success: false, error: 'Payment record not found' }
    }

    // Update payment status
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

    // If payment successful and has subscription, activate subscription
    if (success && payment.subscription_id) {
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
        })
        .eq('id', payment.subscription_id)

      if (subError) {
        console.error('Error activating subscription:', subError)
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

export async function getAvailableProviders(): Promise<PaymentProvider[]> {
  const providers: PaymentProvider[] = ['paystack']
  
  if (process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET) {
    providers.push('pesapal')
  }
  
  if (process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET) {
    providers.push('mpesa')
  }
  
  return providers
}
