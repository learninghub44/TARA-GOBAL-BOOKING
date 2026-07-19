interface DiditVerificationRequest {
  documentType: string
  documentNumber: string
  expiryDate: string
  firstName: string
  lastName: string
  dateOfBirth: string
  country: string
}

interface DiditVerificationResponse {
  success: boolean
  referenceId: string
  status: 'pending' | 'approved' | 'rejected'
  confidenceScore: number
  data?: any
  error?: string
}

export async function initiateDiditVerification(
  request: DiditVerificationRequest
): Promise<DiditVerificationResponse> {
  try {
    const response = await fetch('https://api.didit.me/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DIDIT_API_KEY}`,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Didit API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      success: true,
      referenceId: data.referenceId,
      status: data.status,
      confidenceScore: data.confidenceScore,
      data: data,
    }
  } catch (error) {
    console.error('Didit verification error:', error)
    return {
      success: false,
      referenceId: '',
      status: 'pending',
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function checkDiditStatus(referenceId: string): Promise<DiditVerificationResponse> {
  try {
    const response = await fetch(`https://api.didit.me/verify/${referenceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.DIDIT_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Didit API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      success: true,
      referenceId: data.referenceId,
      status: data.status,
      confidenceScore: data.confidenceScore,
      data: data,
    }
  } catch (error) {
    console.error('Didit status check error:', error)
    return {
      success: false,
      referenceId,
      status: 'pending',
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function shouldFallbackToManualReview(response: DiditVerificationResponse): boolean {
  return (
    !response.success ||
    response.confidenceScore < 0.7 ||
    response.status === 'rejected'
  )
}
