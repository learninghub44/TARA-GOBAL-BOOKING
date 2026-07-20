'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { processAIAssistantRequest, generateSessionId, logAIAssistantUsage } from '@/lib/ai/assistant'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(generateSessionId())
  const [userId, setUserId] = useState<string | undefined>()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id)
    }
    getUser()

    // Welcome message
    setMessages([
      {
        role: 'assistant',
        content: 'Hi! I\'m the TARA AI Assistant. I can help you with navigation, bookings, KYC verification, subscriptions, vendor management, and general support. How can I help you today?',
        timestamp: new Date(),
      },
    ])
  }, [supabase])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await processAIAssistantRequest({
        question: input,
        userId,
        sessionId,
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Log usage
      if (userId) {
        await logAIAssistantUsage(userId, sessionId, input, response)
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or create a support ticket for assistance.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 rounded-full bg-brand-navy p-4 text-white shadow-lg transition-colors hover:bg-brand-ember sm:bottom-6 sm:right-6"
        aria-label="Open AI Assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] sm:bottom-6 sm:right-6">
      <Card className="shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg">TARA Assistant</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-80 overflow-y-auto mb-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about TARA..."
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <Alert className="mt-3">
            <AlertDescription className="text-xs">
              I can help with navigation, bookings, KYC, subscriptions, and more. For complex issues, please create a support ticket.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
