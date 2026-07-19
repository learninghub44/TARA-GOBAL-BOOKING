interface MpesaSTKPushRequest {
  phone_number: string
  amount: number
  account_reference: string
  transaction_desc: string
  callback_url: string
}

interface MpesaSTKPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

interface MpesaVerificationResponse {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata: {
        Item: {
          Name: string
          Value: string | number
        }[]
      }
    }
  }
}

// M-Pesa (Daraja) has no webhook signature, so a callback body alone cannot
// be trusted -- anyone who learns/guesses a CheckoutRequestID could POST a
// fake "success" callback. mpesaBaseUrl/verifyMpesaSTKPushStatus let the
// webhook independently re-confirm the transaction with Safaricom itself
// before it's ever treated as paid, the same way pesapal.ts's verifyPesapalPayment
// re-checks with Pesapal rather than trusting the IPN body.
function mpesaBaseUrl(): string {
  return process.env.MPESA_ENV === 'live' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'
}

export async function generateMpesaToken(): Promise<string> {
  try {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64')

    const response = await fetch(
      `${mpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`M-Pesa token generation error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('M-Pesa token generation error:', error)
    throw error
  }
}

export async function initiateMpesaSTKPush(
  request: MpesaSTKPushRequest
): Promise<MpesaSTKPushResponse> {
  try {
    const token = await generateMpesaToken()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, -4)
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64')

    const response = await fetch(
      `${mpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          BusinessShortCode: process.env.MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: request.amount,
          PartyA: request.phone_number.replace('+', ''),
          PartyB: process.env.MPESA_SHORTCODE,
          PhoneNumber: request.phone_number.replace('+', ''),
          CallBackURL: request.callback_url,
          AccountReference: request.account_reference,
          TransactionDesc: request.transaction_desc,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`M-Pesa STK push error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('M-Pesa STK push error:', error)
    throw error
  }
}

export interface MpesaQueryResult {
  verified: boolean
  success: boolean
  resultCode?: string
  error?: string
}

/**
 * Re-confirms a transaction directly with Safaricom's STK Push Query API
 * using the CheckoutRequestID from the callback. This is the source of
 * truth -- the callback body itself must never be trusted on its own since
 * Daraja callbacks aren't signed.
 */
export async function verifyMpesaSTKPushStatus(checkoutRequestId: string): Promise<MpesaQueryResult> {
  try {
    const token = await generateMpesaToken()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, -4)
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64')

    const response = await fetch(`${mpesaBaseUrl()}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    })

    if (!response.ok) {
      // A 500 from Safaricom here often means "still processing" as much as
      // it means "failed" -- treat as unverified rather than success either way.
      return { verified: false, success: false, error: `Query API error: ${response.statusText}` }
    }

    const data = await response.json()
    const resultCode = String(data.ResultCode ?? '')

    return {
      verified: true,
      success: resultCode === '0',
      resultCode,
    }
  } catch (error) {
    console.error('M-Pesa STK query error:', error)
    return { verified: false, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function processMpesaCallback(callbackData: MpesaVerificationResponse): {
  success: boolean
  reference: string
  amount: number
  phoneNumber: string
} {
  const stkCallback = callbackData.Body.stkCallback
  
  if (stkCallback.ResultCode !== 0) {
    return {
      success: false,
      reference: stkCallback.CheckoutRequestID,
      amount: 0,
      phoneNumber: '',
    }
  }

  const metadata = stkCallback.CallbackMetadata.Item
  const amount = metadata.find((item) => item.Name === 'Amount')?.Value as number || 0
  const phoneNumber = metadata.find((item) => item.Name === 'PhoneNumber')?.Value as string || ''
  const reference = metadata.find((item) => item.Name === 'MpesaReceiptNumber')?.Value as string || ''

  return {
    success: true,
    reference,
    amount,
    phoneNumber,
  }
}

export function generateMpesaReference(): string {
  return `TARA-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
