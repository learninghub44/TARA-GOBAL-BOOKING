interface AIAssistantRequest {
  question: string
  userId?: string
  sessionId: string
}

interface AIAssistantResponse {
  answer: string
  category: string
  escalated: boolean
  tokensUsed: number
}

const TARA_SYSTEM_PROMPT = `You are the TARA AI Assistant, a helpful assistant for the TARA travel marketplace platform. TARA is a multi-tenant SaaS platform for tours, travels, rentals, and adventures.

Key information about TARA:
- Platform: Tours • Travels • Rentals • Adventures
- Multi-tenant architecture with strict data isolation
- Payment providers: Paystack, Pesapal, M-Pesa
- KYC verification: Didit integration with manual fallback
- Subscription plans: Monthly, quarterly, annual
- Support: Support tickets, email at support@tara.com

Your role is to help users with:
- Navigation and platform usage
- Booking and reservation questions
- KYC verification process
- Subscription and payment inquiries
- Vendor management and onboarding
- General support and troubleshooting

Always be helpful, concise, and accurate. If you don't know the answer, suggest creating a support ticket or contacting support@tara.com. Never make up information about specific bookings, payments, or account details - direct users to check their dashboard or contact support.`

const ESCALATION_KEYWORDS = [
  'legal',
  'lawsuit',
  'sue',
  'fraud',
  'scam',
  'police',
  'emergency',
  'threat',
  'harassment',
  'abuse',
]

const DAILY_LIMIT = 50
const RATE_LIMIT = 10 // per minute

// In-memory rate limiting (in production, use Redis)
const userRequests = new Map<string, { count: number; resetTime: number }>()

export async function processAIAssistantRequest(
  request: AIAssistantRequest
): Promise<AIAssistantResponse> {
  const { question, userId, sessionId } = request

  // Check rate limits
  if (userId && !checkRateLimit(userId, sessionId)) {
    return {
      answer: 'You\'ve reached the rate limit. Please wait a moment before asking another question.',
      category: 'rate_limit',
      escalated: false,
      tokensUsed: 0,
    }
  }

  // Check daily limit
  if (userId && !checkDailyLimit(userId)) {
    return {
      answer: 'You\'ve reached your daily limit of AI assistant queries. For more help, please create a support ticket.',
      category: 'daily_limit',
      escalated: false,
      tokensUsed: 0,
    }
  }

  // Check for escalation keywords
  const lowerQuestion = question.toLowerCase()
  if (ESCALATION_KEYWORDS.some(keyword => lowerQuestion.includes(keyword))) {
    return {
      answer: 'This appears to be a sensitive matter that requires human assistance. I\'ve escalated this to our support team. Please create a support ticket for immediate assistance.',
      category: 'escalation',
      escalated: true,
      tokensUsed: 0,
    }
  }

  // Use Groq for AI response
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: TARA_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: question,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`)
    }

    const data = await response.json()
    const answer = data.choices[0]?.message?.content || 'I apologize, but I encountered an error. Please try again or create a support ticket.'
    const tokensUsed = data.usage?.total_tokens || 0

    return {
      answer,
      category: 'ai_response',
      escalated: false,
      tokensUsed,
    }
  } catch (error) {
    console.error('Groq API error:', error)
    
    // Fallback to basic response
    return {
      answer: 'I apologize, but I\'m currently unable to process your request. For immediate assistance, please create a support ticket or contact our support team at support@tara.com.',
      category: 'error',
      escalated: false,
      tokensUsed: 0,
    }
  }
}

function checkRateLimit(userId: string, sessionId: string): boolean {
  const now = Date.now()
  const key = `${userId}_${sessionId}`
  const userRequest = userRequests.get(key)
  
  if (!userRequest || now > userRequest.resetTime) {
    userRequests.set(key, {
      count: 1,
      resetTime: now + 60000, // 1 minute
    })
    return true
  }
  
  if (userRequest.count >= RATE_LIMIT) {
    return false
  }
  
  userRequest.count++
  return true
}

function checkDailyLimit(userId: string): boolean {
  const key = `daily_${userId}`
  const userRequest = userRequests.get(key)
  const now = Date.now()
  const dayStart = new Date().setHours(0, 0, 0, 0)
  
  if (!userRequest || now > userRequest.resetTime) {
    userRequests.set(key, {
      count: 1,
      resetTime: dayStart + 86400000, // 24 hours
    })
    return true
  }
  
  if (userRequest.count >= DAILY_LIMIT) {
    return false
  }
  
  userRequest.count++
  return true
}

export async function logAIAssistantUsage(
  userId: string | undefined,
  sessionId: string,
  question: string,
  response: AIAssistantResponse
): Promise<void> {
  // In production, this would log to the database
  // For now, we'll just log to console
  console.log({
    userId,
    sessionId,
    question,
    answer: response.answer,
    category: response.category,
    escalated: response.escalated,
    tokensUsed: response.tokensUsed,
    timestamp: new Date().toISOString(),
  })
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
