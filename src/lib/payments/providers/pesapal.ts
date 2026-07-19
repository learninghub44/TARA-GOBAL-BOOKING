// Pesapal API v3 client.
//
// Pesapal does NOT accept "Bearer consumer_key:consumer_secret" — it requires
// a two-step OAuth-style flow:
//   1. POST /api/Auth/RequestToken with {consumer_key, consumer_secret} to get
//      a short-lived bearer token (~5 min).
//   2. Every other call uses that token as `Authorization: Bearer <token>`.
// Submitting an order also requires a registered IPN (webhook) URL — Pesapal
// hands back an `ipn_id` the first time a URL is registered, which must be
// passed as `notification_id` on every order after that. We cache both the
// token and the ipn_id in module scope so a warm server instance doesn't
// re-request them on every single payment.

const PESAPAL_BASE_URL =
  process.env.PESAPAL_ENV === 'live' ? 'https://pay.pesapal.com/v3' : 'https://cybqa.pesapal.com/pesapalv3'

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

let cachedToken: { value: string; expiresAt: number } | null = null
let cachedIpnId: string | null = null

async function getPesapalToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value
  }

  const consumerKey = process.env.PESAPAL_CONSUMER_KEY
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET

  if (!consumerKey || !consumerSecret) {
    throw new Error('Pesapal credentials not configured')
  }

  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  })

  const data = await response.json()

  if (!response.ok || data.error || !data.token) {
    throw new Error(data.message || data.error?.message || 'Pesapal auth failed')
  }

  // Token is valid ~5 minutes; refresh a little early to be safe.
  cachedToken = { value: data.token, expiresAt: Date.now() + 4 * 60 * 1000 }
  return data.token
}

async function getIpnId(token: string): Promise<string> {
  if (process.env.PESAPAL_IPN_ID) {
    return process.env.PESAPAL_IPN_ID
  }

  if (cachedIpnId) {
    return cachedIpnId
  }

  const ipnUrl = process.env.PESAPAL_IPN_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/subscription/pesapal`

  if (!ipnUrl || ipnUrl === 'undefined/api/webhooks/subscription/pesapal') {
    throw new Error('Pesapal IPN URL not configured (set PESAPAL_IPN_URL or NEXT_PUBLIC_APP_URL)')
  }

  const response = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: 'GET',
    }),
  })

  const data = await response.json()

  if (!response.ok || data.error || !data.ipn_id) {
    throw new Error(data.message || data.error?.message || 'Pesapal IPN registration failed')
  }

  cachedIpnId = data.ipn_id
  return data.ipn_id
}

export async function initializePesapalPayment(
  request: PesapalPaymentRequest
): Promise<PesapalPaymentResponse> {
  try {
    const token = await getPesapalToken()
    const ipnId = await getIpnId(token)

    const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: request.reference,
        currency: request.currency,
        amount: request.amount,
        description: request.description.slice(0, 100), // Pesapal caps description length
        callback_url: request.callback_url,
        notification_id: ipnId,
        billing_address: {
          email_address: request.email || undefined,
          phone_number: request.phone_number || undefined,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok || data.error || !data.redirect_url) {
      const message = data.error?.message || data.message || `Pesapal order submission failed: ${response.statusText}`
      throw new Error(message)
    }

    return {
      status: 'success',
      message: 'Order created',
      data: {
        order_tracking_id: data.order_tracking_id,
        redirect_url: data.redirect_url,
      },
    }
  } catch (error) {
    console.error('Pesapal initialization error:', error)
    throw error
  }
}

export async function verifyPesapalPayment(orderTrackingId: string): Promise<PesapalVerificationResponse> {
  try {
    const token = await getPesapalToken()

    const response = await fetch(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || data.message || `Pesapal verification error: ${response.statusText}`)
    }

    // Pesapal's status_code: 0=INVALID, 1=COMPLETED, 2=FAILED, 3=REVERSED
    const statusMap: Record<number, string> = {
      0: 'INVALID',
      1: 'COMPLETED',
      2: 'FAILED',
      3: 'REVERSED',
    }

    return {
      status: 'success',
      message: data.payment_status_description || '',
      data: {
        payment_status: statusMap[data.status_code] ?? 'PENDING',
        payment_method: data.payment_method,
        amount: data.amount,
        currency: data.currency,
        order_tracking_id: orderTrackingId,
      },
    }
  } catch (error) {
    console.error('Pesapal verification error:', error)
    throw error
  }
}

export function generatePesapalReference(): string {
  return `TARA-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
