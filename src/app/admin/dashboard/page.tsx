'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Building2, 
  CreditCard, 
  Ticket, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [stats, setStats] = useState({
    totalTenants: 0,
    pendingVerifications: 0,
    activeSubscriptions: 0,
    totalPayments: 0,
    openTickets: 0,
    totalUsers: 0,
  })

  const [recentTenants, setRecentTenants] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [pendingKYC, setPendingKYC] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Check if user is platform admin
      const { data: userData } = await supabase
        .from('users')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

      if (!userData || userData.role !== 'owner' || userData.tenant_id !== null) {
        setError('Access denied. Platform admin access required.')
        setLoading(false)
        return
      }

      // Load stats
      const [tenantsCount, usersCount, paymentsCount, ticketsCount] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('id', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ])

      const pendingVerifications = await supabase
        .from('tenants')
        .select('id', { count: 'exact', head: true })
        .eq('verification_status', 'pending')

      const activeSubscriptions = await supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')

      setStats({
        totalTenants: tenantsCount.count || 0,
        pendingVerifications: pendingVerifications.count || 0,
        activeSubscriptions: activeSubscriptions.count || 0,
        totalPayments: paymentsCount.count || 0,
        openTickets: ticketsCount.count || 0,
        totalUsers: usersCount.count || 0,
      })

      // Load recent tenants
      const { data: tenants } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentTenants(tenants || [])

      // Load recent payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentPayments(payments || [])

      // Load pending KYC
      const { data: kyc } = await supabase
        .from('kyc_verifications')
        .select('*, tenants(business_name, business_email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)

      setPendingKYC(kyc || [])
    } catch (err) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-gray-600">Platform management and monitoring</p>
            </div>
            <Badge variant="default" className="bg-blue-600">
              <Shield className="h-3 w-3 mr-1" />
              Platform Admin
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
              <Building2 className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTenants}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
              <Clock className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingVerifications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Subs</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openTickets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="tenants" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="kyc">KYC Verifications</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="tenants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Tenants</CardTitle>
                <CardDescription>Latest business registrations on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {recentTenants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No tenants yet</div>
                ) : (
                  <div className="space-y-4">
                    {recentTenants.map((tenant) => (
                      <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{tenant.business_name}</h3>
                          <p className="text-sm text-gray-600">{tenant.business_email}</p>
                          <p className="text-sm text-gray-600">{tenant.business_country}</p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              tenant.verification_status === 'approved' ? 'default' :
                              tenant.verification_status === 'pending' ? 'secondary' :
                              tenant.verification_status === 'rejected' ? 'destructive' : 'outline'
                            }
                          >
                            {tenant.verification_status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(tenant.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending KYC Verifications</CardTitle>
                <CardDescription>Businesses awaiting identity verification</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingKYC.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No pending KYC verifications</div>
                ) : (
                  <div className="space-y-4">
                    {pendingKYC.map((kyc) => (
                      <div key={kyc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{kyc.tenants?.business_name || 'Unknown'}</h3>
                          <p className="text-sm text-gray-600">{kyc.tenants?.business_email}</p>
                          <p className="text-sm text-gray-600">Document: {kyc.document_type}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">Pending Review</Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(kyc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest subscription payments</CardDescription>
              </CardHeader>
              <CardContent>
                {recentPayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No payments yet</div>
                ) : (
                  <div className="space-y-4">
                    {recentPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{payment.invoice_number}</h3>
                          <p className="text-sm text-gray-600">{payment.payment_provider}</p>
                          <p className="text-sm text-gray-600">{payment.currency} {payment.amount}</p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              payment.status === 'completed' ? 'default' :
                              payment.status === 'pending' ? 'secondary' :
                              payment.status === 'failed' ? 'destructive' : 'outline'
                            }
                          >
                            {payment.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Open Support Tickets</CardTitle>
                <CardDescription>Active support requests requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  View support tickets in the Support section
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
