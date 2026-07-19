interface PesapalPaymentRequest {
  amount: number
  currency: string
  description: string
  callback_url: string
  reference: string
  email?: string
  phone_number?: string
}

interface PesapalPaymentResponse {
  status: string
  message: string
  data: {
    order_tracking_id: string
    redirect_url: string
  }
}

interface PesapalVerificationResponse {
  status: string
  message: string
  data: {
    payment_status: string
    payment_method: string
    amount: number
    currency: string
    order_tracking_id: string
  }
}

export async function initializePesapalPayment(
  request: PesapalPaymentRequest
): Promise<PesapalPaymentResponse> {
  try {
    const response = await fetch('https://pay.pesapal.com/v3/api/PostRequest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PESAPAL_CONSUMER_KEY}:${process.env.PESAPAL_CONSUMER_SECRET}`,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Pesapal API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Pesapal initialization error:', error)
    throw error
  }
}

export async function verifyPesapalPayment(orderTrackingId: string): Promise<PesapalVerificationResponse> {
  try {
    const response = await fetch(`https://pay.pesapal.com/v3/api/TransactionStatus/${orderTrackingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PESAPAL_CONSUMER_KEY}:${process.env.PESAPAL_CONSUMER_SECRET}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Pesapal verification error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Pesapal verification error:', error)
    throw error
  }
}

export function generatePesapalReference(): string {
  return `TARA-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
