'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

interface Payment {
  id: string
  invoice_number: string
  transaction_reference: string
  payment_provider: string
  amount: number
  refunded_amount: number
  currency: string
  status: string
  created_at: string
  payment_refunds?: { id: string; amount: number; status: string; created_at: string }[]
}

export default function VendorPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/vendor/payments')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load payment history')
        setPayments(data.payments)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load payment history'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment history</h1>
        <p className="text-muted-foreground">
          Your TARA platform subscription and promotion payments.{' '}
          <Link href="/vendor/subscription" className="underline">
            Manage subscription
          </Link>
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Every attempt is logged, including failed ones.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4">
                  <div>
                    <div className="font-mono text-sm font-medium">{p.invoice_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()} · via {p.payment_provider}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium">
                        {p.currency} {Number(p.amount).toLocaleString()}
                      </div>
                      {p.refunded_amount > 0 && (
                        <div className="text-xs text-muted-foreground">Refunded {p.refunded_amount}</div>
                      )}
                    </div>
                    <Badge
                      variant={
                        p.status === 'completed'
                          ? 'default'
                          : p.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
