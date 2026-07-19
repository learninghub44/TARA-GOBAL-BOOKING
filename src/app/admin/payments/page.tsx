'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Loader2, AlertCircle, CheckCircle2, RefreshCw, ShieldCheck, ShieldOff } from 'lucide-react'

interface ProviderSetting {
  provider: 'paystack' | 'pesapal' | 'mpesa'
  display_name: string
  is_enabled: boolean
  is_default: boolean
  priority: number
  has_credentials: boolean
}

interface Payment {
  id: string
  transaction_reference: string
  invoice_number: string
  payment_provider: string
  amount: number
  refunded_amount: number
  currency: string
  status: string
  created_at: string
  tenants?: { business_name: string; business_slug: string }
}

export default function AdminPaymentsPage() {
  const [providers, setProviders] = useState<ProviderSetting[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reconciling, setReconciling] = useState(false)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData intentionally only re-runs on filter change
  }, [statusFilter])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [providersRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/payment-providers'),
        fetch(`/api/admin/payments${statusFilter ? `?status=${statusFilter}` : ''}`),
      ])

      if (!providersRes.ok) throw new Error((await providersRes.json()).error || 'Failed to load providers')
      if (!paymentsRes.ok) throw new Error((await paymentsRes.json()).error || 'Failed to load payments')

      const providersData = await providersRes.json()
      const paymentsData = await paymentsRes.json()

      setProviders(providersData.providers)
      setPayments(paymentsData.payments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function toggleEnabled(provider: string, is_enabled: boolean) {
    await updateProvider(provider, { is_enabled })
  }

  async function setDefault(provider: string) {
    await updateProvider(provider, { is_default: true })
  }

  async function updateProvider(provider: string, patch: Record<string, unknown>) {
    setError('')
    try {
      const res = await fetch('/api/admin/payment-providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, ...patch }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed')
      const data = await res.json()
      setProviders(data.providers)
      setNotice('Provider settings updated')
      setTimeout(() => setNotice(''), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function reconcile() {
    setReconciling(true)
    setError('')
    try {
      const res = await fetch('/api/admin/payments/reconcile', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error || 'Reconciliation failed')
      const data = await res.json()
      setNotice(`Checked ${data.checked} stale payment(s).`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed')
    } finally {
      setReconciling(false)
    }
  }

  async function refund(paymentId: string) {
    setRefundingId(paymentId)
    setError('')
    try {
      const amountInput = refundAmounts[paymentId]
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInput ? parseFloat(amountInput) : undefined,
          reason: 'Admin-initiated refund',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refund failed')
      setNotice(data.note || `Refund ${data.status}`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund failed')
    } finally {
      setRefundingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">
          Platform subscription payments only — TARA never processes customer-to-vendor booking payments.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment providers</CardTitle>
          <CardDescription>
            Enable/disable providers and pick the default. Credentials are configured via environment
            variables, not stored here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.provider}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                {p.has_credentials ? (
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {p.display_name}
                    {p.is_default && <Badge>Default</Badge>}
                    {!p.has_credentials && <Badge variant="outline">No credentials configured</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.has_credentials ? 'Environment credentials found' : 'Set the env vars for this provider to activate it'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={p.is_enabled ? 'default' : 'outline'}
                  onClick={() => toggleEnabled(p.provider, !p.is_enabled)}
                >
                  {p.is_enabled ? 'Enabled' : 'Disabled'}
                </Button>
                <Button size="sm" variant="ghost" disabled={p.is_default} onClick={() => setDefault(p.provider)}>
                  Make default
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>All platform subscription/promotion payments across tenants.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={reconcile} disabled={reconciling}>
            {reconciling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Reconcile stale payments
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            {['', 'completed', 'pending', 'failed', 'refunded'].map((s) => (
              <Button
                key={s || 'all'}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
              >
                {s || 'All'}
              </Button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Invoice</th>
                  <th className="pb-2 pr-4">Tenant</th>
                  <th className="pb-2 pr-4">Provider</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2">Refund</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{p.invoice_number}</td>
                    <td className="py-2 pr-4">{p.tenants?.business_name || '—'}</td>
                    <td className="py-2 pr-4 capitalize">{p.payment_provider}</td>
                    <td className="py-2 pr-4">
                      {p.currency} {Number(p.amount).toLocaleString()}
                      {p.refunded_amount > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (refunded {p.refunded_amount})
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
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
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      {p.status === 'completed' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-8 w-20 text-xs"
                            placeholder="Full"
                            value={refundAmounts[p.id] || ''}
                            onChange={(e) =>
                              setRefundAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={refundingId === p.id}
                            onClick={() => refund(p.id)}
                          >
                            {refundingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refund'}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      No payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
