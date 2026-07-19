interface CloudflareWorkerRequest {
  action: string
  data?: Record<string, any>
}

interface CloudflareWorkerResponse {
  success: boolean
  data?: any
  error?: string
}

// Cloudflare Worker for image processing
export async function processImageWithWorker(
  imageUrl: string,
  operations: {
    resize?: { width: number; height: number }
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
  }
): Promise<CloudflareWorkerResponse> {
  try {
    const response = await fetch(`${process.env.CLOUDFLARE_WORKER_URL}/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CLOUDFLARE_WORKER_SECRET}`,
      },
      body: JSON.stringify({
        action: 'process',
        data: {
          imageUrl,
          operations,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Cloudflare Worker error: ${response.statusText}`)
    }

    const result = await response.json()
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Cloudflare Worker image processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Cloudflare Worker for email queuing
export async function queueEmailWithWorker(
  emailData: {
    to: string
    subject: string
    html: string
    from?: string
  }
): Promise<CloudflareWorkerResponse> {
  try {
    const response = await fetch(`${process.env.CLOUDFLARE_WORKER_URL}/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CLOUDFLARE_WORKER_SECRET}`,
      },
      body: JSON.stringify({
        action: 'queue',
        data: emailData,
      }),
    })

    if (!response.ok) {
      throw new Error(`Cloudflare Worker error: ${response.statusText}`)
    }

    const result = await response.json()
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Cloudflare Worker email queuing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Cloudflare Worker for webhook processing
export async function processWebhookWithWorker(
  webhookData: {
    provider: string
    payload: any
    signature?: string
  }
): Promise<CloudflareWorkerResponse> {
  try {
    const response = await fetch(`${process.env.CLOUDFLARE_WORKER_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CLOUDFLARE_WORKER_SECRET}`,
      },
      body: JSON.stringify({
        action: 'process',
        data: webhookData,
      }),
    })

    if (!response.ok) {
      throw new Error(`Cloudflare Worker error: ${response.statusText}`)
    }

    const result = await response.json()
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Cloudflare Worker webhook processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Cloudflare Worker for analytics aggregation
export async function aggregateAnalyticsWithWorker(
  analyticsData: {
    tenantId: string
    eventType: string
    data: Record<string, any>
  }
): Promise<CloudflareWorkerResponse> {
  try {
    const response = await fetch(`${process.env.CLOUDFLARE_WORKER_URL}/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CLOUDFLARE_WORKER_SECRET}`,
      },
      body: JSON.stringify({
        action: 'aggregate',
        data: analyticsData,
      }),
    })

    if (!response.ok) {
      throw new Error(`Cloudflare Worker error: ${response.statusText}`)
    }

    const result = await response.json()
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Cloudflare Worker analytics aggregation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
