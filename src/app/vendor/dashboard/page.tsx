'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Calendar, 
  Users, 
  Star, 
  Eye, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import Link from 'next/link'

export default function VendorDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalBookings: 0,
    totalViews: 0,
    averageRating: 0,
  })

  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | 'manual_review'>('pending')

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

      // Get user's tenant
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!userData?.tenant_id) {
        router.push('/vendor/register')
        return
      }

      // Get tenant verification status
      const { data: tenant } = await supabase
        .from('tenants')
        .select('verification_status, total_listings, rating')
        .eq('id', userData.tenant_id)
        .single()

      if (tenant) {
        setVerificationStatus(tenant.verification_status)
      }

      // Get stats
      const [toursCount, travelServicesCount, carRentalsCount, adventuresCount] = await Promise.all([
        supabase.from('tours').select('id, is_active, view_count, rating').eq('tenant_id', userData.tenant_id),
        supabase.from('travel_services').select('id, is_active, view_count, rating').eq('tenant_id', userData.tenant_id),
        supabase.from('car_rentals').select('id, is_active, view_count, rating').eq('tenant_id', userData.tenant_id),
        supabase.from('adventure_activities').select('id, is_active, view_count, rating').eq('tenant_id', userData.tenant_id),
      ])

      const allListings = [
        ...toursCount.data || [],
        ...travelServicesCount.data || [],
        ...carRentalsCount.data || [],
        ...adventuresCount.data || [],
      ]

      const totalListings = allListings.length
      const activeListings = allListings.filter((l: any) => l.is_active).length
      const totalViews = allListings.reduce((sum: number, l: any) => sum + (l.view_count || 0), 0)
      const averageRating = allListings.length > 0 
        ? allListings.reduce((sum: number, l: any) => sum + (l.rating || 0), 0) / allListings.length 
        : 0

      // Get recent bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('tenant_id', userData.tenant_id)
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        totalListings,
        activeListings,
        totalBookings: bookings?.length || 0,
        totalViews,
        averageRating,
      })

      setRecentBookings(bookings || [])
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
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
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
              <h1 className="text-2xl font-bold">Vendor Dashboard</h1>
              <p className="text-gray-600">Manage your listings and bookings</p>
            </div>
            <div className="flex items-center gap-4">
              {verificationStatus !== 'approved' && (
                <Alert className="max-w-md">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {verificationStatus === 'pending' && 'Your business is pending verification'}
                    {verificationStatus === 'manual_review' && 'Your business is under manual review'}
                    {verificationStatus === 'rejected' && 'Your business verification was rejected'}
                  </AlertDescription>
                </Alert>
              )}
              {verificationStatus === 'approved' && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
              <Plus className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalListings}</div>
              <p className="text-xs text-gray-600">{stats.activeListings} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-gray-600">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
              <p className="text-xs text-gray-600">All listings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <p className="text-xs text-gray-600">Out of 5</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">My Listings</h2>
              <div className="flex gap-2">
                <Link href="/vendor/tours/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tour
                  </Button>
                </Link>
                <Link href="/vendor/car-rentals/new">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Car Rental
                  </Button>
                </Link>
                <Link href="/vendor/adventures/new">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Adventure
                  </Button>
                </Link>
              </div>
            </div>

            {stats.totalListings === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                  <p className="text-gray-600 mb-4">Create your first listing to start receiving bookings</p>
                  <Link href="/vendor/tours/new">
                    <Button>Create First Listing</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder for listing cards - will be populated with actual data */}
                <Card>
                  <CardContent className="p-6">
                    <div className="h-40 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg mb-4 flex items-center justify-center">
                      <span className="text-4xl">🏔️</span>
                    </div>
                    <h3 className="font-semibold mb-2">Sample Tour</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>4.5</span>
                      <span>•</span>
                      <span>128 views</span>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent Bookings</h2>
            </div>

            {recentBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                  <p className="text-gray-600">Bookings will appear here once customers start booking your listings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{booking.customer_name}</h3>
                          <p className="text-sm text-gray-600">{booking.customer_email}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              booking.status === 'confirmed' ? 'default' :
                              booking.status === 'pending' ? 'secondary' :
                              booking.status === 'cancelled' ? 'destructive' : 'outline'
                            }
                          >
                            {booking.status}
                          </Badge>
                          <p className="text-lg font-bold mt-2">${booking.total_amount}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-xl font-semibold">Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Overview</CardTitle>
                  <CardDescription>Your listing performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex  items-center justify-between">
                      <span className="text-sm">Total Views</span>
                      <span className="font-semibold">{stats.totalViews.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Conversion Rate</span>
                      <span className="font-semibold">{stats.totalBookings > 0 ? ((stats.totalBookings / stats.totalViews) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Rating</span>
                      <span className="font-semibold">{stats.averageRating.toFixed(1)} / 5</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/vendor/tours/new">
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Tour
                    </Button>
                  </Link>
                  <Link href="/vendor/car-rentals/new">
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Car Rental
                    </Button>
                  </Link>
                  <Link href="/vendor/adventures/new">
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Adventure
                    </Button>
                  </Link>
                  <Link href="/vendor/settings">
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Business Settings
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
