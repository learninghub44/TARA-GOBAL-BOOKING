'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, AlertCircle, CheckCircle2, XCircle, ShieldQuestion } from 'lucide-react'

interface KycTenant {
  id: string
  business_name: string
  business_slug: string
  business_email: string
  business_phone: string | null
  business_country: string
  registration_number: string | null
  tax_id: string | null
  verification_status: 'pending' | 'approved' | 'rejected' | 'manual_review'
  kyc_provider: string | null
  kyc_reference_id: string | null
  kyc_notes: string | null
  created_at: string
}

const STATUS_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'manual_review', label: 'Manual Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'approved') return 'default'
  if (status === 'rejected') return 'destructive'
  if (status === 'manual_review') return 'secondary'
  return 'outline'
}

export default function KycAdminDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [authChecked, setAuthChecked] = useState(false)
  const [accessError, setAccessError] = useState('')

  const [tenants, setTenants] = useState<KycTenant[]>([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [decidingId, setDecidingId] = useState<string | null>(null)

  useEffect(() => {
    checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/admin/kyc/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, tenant_id, platform_admin_role')
      .eq('id', user.id)
      .single()

    const isAllowed =
      userData && userData.role === 'owner' && userData.tenant_id === null &&
      (userData.platform_admin_role === 'kyc_admin' || userData.platform_admin_role === 'super_admin')

    if (!isAllowed) {
      setAccessError('Access denied. KYC Admin access required.')
      setAuthChecked(true)
      setLoading(false)
      return
    }

    setAuthChecked(true)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/kyc?status=${statusFilter}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load KYC queue')
      setTenants(data.tenants || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load KYC queue')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (authChecked && !accessError) loadData()
  }, [authChecked, accessError, loadData])

  const decide = async (id: string, decision: 'approved' | 'rejected' | 'manual_review') => {
    setDecidingId(id)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/admin/kyc/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: notesById[id] || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setNotice(`${data.tenant.business_name} marked as ${decision.replace('_', ' ')}.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setDecidingId(null)
    }
  }

  if (authChecked && accessError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{accessError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldQuestion className="h-6 w-6" /> KYC Admin
          </h1>
          <p className="text-muted-foreground">Vendor verification queue</p>
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

        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : tenants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No vendors in this queue.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tenants.map((tenant) => (
              <Card key={tenant.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{tenant.business_name}</CardTitle>
                      <CardDescription>
                        {tenant.business_email} · {tenant.business_country}
                      </CardDescription>
                    </div>
                    <Badge variant={statusBadgeVariant(tenant.verification_status)}>
                      {tenant.verification_status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                    <div>Registration: {tenant.registration_number || '—'}</div>
                    <div>Tax ID: {tenant.tax_id || '—'}</div>
                    <div>KYC provider: {tenant.kyc_provider || '—'}</div>
                    <div>Reference: {tenant.kyc_reference_id || '—'}</div>
                  </div>
                  <Textarea
                    placeholder="Review notes (optional)"
                    value={notesById[tenant.id] ?? tenant.kyc_notes ?? ''}
                    onChange={(e) => setNotesById((prev) => ({ ...prev, [tenant.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={decidingId === tenant.id}
                      onClick={() => decide(tenant.id, 'approved')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={decidingId === tenant.id}
                      onClick={() => decide(tenant.id, 'rejected')}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decidingId === tenant.id}
                      onClick={() => decide(tenant.id, 'manual_review')}
                    >
                      Send to manual review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
