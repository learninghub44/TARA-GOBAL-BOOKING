'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Loader2, AlertCircle, Phone } from 'lucide-react'

interface Plan {
  id: 'monthly' | 'quarterly' | 'annual'
  name: string
  amount: number
  period: string
  description: string
  features: string[]
  highlight?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    amount: 2500,
    period: '/ month',
    description: 'Billed every month',
    features: ['Unlisted-listing access', 'Booking inbox', 'Standard support'],
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    amount: 6500,
    period: '/ 3 months',
    description: 'Save ~13% vs monthly',
    features: ['Everything in Monthly', 'Featured placement rotation', 'Priority support'],
    highlight: true,
  },
  {
    id: 'annual',
    name: 'Annual',
    amount: 24000,
    period: '/ year',
    description: 'Save ~20% vs monthly',
    features: ['Everything in Quarterly', 'Sponsored badge', 'Dedicated onboarding'],
  },
]

type Attempt = { provider: string; success: boolean; error?: string }

function redirectTo(url: string) {
  window.location.href = url
}

export default function VendorSubscriptionPage() {
  return (
    <Suspense fallback={null}>
      <VendorSubscriptionPageInner />
    </Suspense>
  )
}

function VendorSubscriptionPageInner() {
  const params = useSearchParams()
  const required = params.get('required') === '1'
  const [selectedPlan, setSelectedPlan] = useState<string>('quarterly')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [error, setError] = useState('')

  async function handleSubscribe() {
    setLoading(true)
    setError('')
    setAttempts([])

    try {
      const res = await fetch('/api/vendor/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: selectedPlan, phone_number: phone || undefined }),
      })

      const data = await res.json()
      setAttempts(data.attempts || [])

      if (!res.ok || !data.success) {
        setError(data.error || 'Payment could not be started on any provider. Please try again shortly.')
        return
      }

      if (data.requires_phone_confirmation) {
        // M-Pesa STK push sent — no redirect, poll for confirmation.
        pollForConfirmation(data.reference)
        return
      }

      if (data.payment_url) {
        redirectTo(data.payment_url)
      }
    } catch {
      setError('Something went wrong starting checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function pollForConfirmation(reference: string) {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      const res = await fetch(`/api/vendor/subscription/verify?reference=${reference}`)
      const data = await res.json()
      if (data.status === 'completed') {
        redirectTo('/vendor/dashboard?subscription=active')
        return
      }
      if (data.status === 'failed') {
        setError('M-Pesa payment was not completed. Please try again.')
        return
      }
    }
    setError('Still waiting on M-Pesa confirmation. Check your phone, or refresh this page shortly.')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {required && (
        <Alert className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            An active subscription is required before you can publish listings. Choose a plan below to unlock listing creation.
          </AlertDescription>
        </Alert>
      )}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Choose your TARA vendor plan</h1>
        <p className="text-muted-foreground mt-2">
          Your subscription pays for your platform listing — not your customer bookings, which happen directly
          between you and your customers.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`cursor-pointer transition ${
              selectedPlan === plan.id ? 'border-primary ring-2 ring-primary' : ''
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.highlight && <Badge>Best value</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-4">
                KES {plan.amount.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Pay for your {PLANS.find((p) => p.id === selectedPlan)?.name} plan</CardTitle>
          <CardDescription>
            We&apos;ll try your available payment methods automatically — if one fails, we fall back to the next.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> M-Pesa phone number (optional)
            </label>
            <Input
              placeholder="e.g. 2547XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Add this if you want an M-Pesa STK push available as a fallback option.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {attempts.length > 0 && (
            <div className="text-sm space-y-1 rounded-md border p-3">
              {attempts.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  {a.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  <span className="capitalize">{a.provider}</span>
                  <span className="text-muted-foreground">{a.success ? 'started' : `failed — ${a.error}`}</span>
                </div>
              ))}
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleSubscribe} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting checkout...
              </>
            ) : (
              `Subscribe — KES ${PLANS.find((p) => p.id === selectedPlan)?.amount.toLocaleString()}`
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
