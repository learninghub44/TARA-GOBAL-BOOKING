interface PaystackPaymentRequest {
  email: string
  amount: number
  currency: string
  reference: string
  metadata?: Record<string, any>
  callback_url?: string
}

interface PaystackPaymentResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

interface PaystackVerificationResponse {
  status: boolean
  message: string
  data: {
    status: string
    reference: string
    amount: number
    currency: string
    customer: {
      email: string
    }
    metadata?: Record<string, any>
  }
}

export async function initializePaystackPayment(
  request: PaystackPaymentRequest
): Promise<PaystackPaymentResponse> {
  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Paystack API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Paystack initialization error:', error)
    throw error
  }
}

export async function verifyPaystackPayment(reference: string): Promise<PaystackVerificationResponse> {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Paystack verification error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Paystack verification error:', error)
    throw error
  }
}

export function generatePaystackReference(): string {
  return `TARA-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

interface PaystackRefundResponse {
  status: boolean
  message: string
  data?: {
    id: number
    status: string
    amount: number
    currency: string
  }
}

/**
 * Paystack supports refunds natively via /refund. Amount is optional —
 * omit it for a full refund, or pass the smallest-currency-unit amount for
 * a partial refund.
 */
export async function refundPaystackPayment(
  transactionReference: string,
  amount?: number
): Promise<PaystackRefundResponse> {
  try {
    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify({
        transaction: transactionReference,
        ...(amount ? { amount } : {}),
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.status) {
      throw new Error(data.message || `Paystack refund error: ${response.statusText}`)
    }

    return data
  } catch (error) {
    console.error('Paystack refund error:', error)
    throw error
  }
}
