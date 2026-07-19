'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function NewSupportTicketPage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [ticketData, setTicketData] = useState({
    category: 'technical', // Default value
    priority: 'medium',
    subject: '',
    description: '',
  })

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to create a support ticket')
        router.push('/auth/login')
        return
      }

      // Get user's tenant
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id, email, first_name, last_name')
        .eq('id', user.id)
        .single()

      if (!userData) {
        setError('User not found')
        return
      }

      // Create support ticket
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          tenant_id: userData.tenant_id,
          user_id: user.id,
          user_name: `${userData.first_name} ${userData.last_name}`,
          user_email: userData.email,
          priority: ticketData.priority,
          category: ticketData.category,
          subject: ticketData.subject,
          description: ticketData.description,
          status: 'open',
        })

      if (ticketError) {
        setError(ticketError.message)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/support/tickets')
      }, 2000)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Ticket Created</CardTitle>
            <CardDescription className="text-center">
              Your support ticket has been submitted successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Our support team will review your ticket and respond within 24 hours.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Support Ticket</h1>
          <p className="text-gray-600">Get help with any issues or questions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Support Request</CardTitle>
            <CardDescription>
              Please provide details about your issue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={ticketData.category || 'technical'}
                  onValueChange={(value) => setTicketData({ ...ticketData, category: value ?? '' })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="billing">Billing & Payments</SelectItem>
                    <SelectItem value="account">Account & Profile</SelectItem>
                    <SelectItem value="kyc">KYC Verification</SelectItem>
                    <SelectItem value="booking">Booking Issue</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={ticketData.priority || 'medium'}
                  onValueChange={(value) => setTicketData({ ...ticketData, priority: value ?? '' })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={ticketData.subject}
                  onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Brief description of your issue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={ticketData.description}
                  onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                  required
                  disabled={loading}
                  rows={6}
                  placeholder="Please provide detailed information about your issue..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Ticket'
                )}
              </Button>
            </form>

            <Alert className="mt-4">
              <AlertDescription>
                For urgent issues, please contact our support team directly at support@tara.com
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
