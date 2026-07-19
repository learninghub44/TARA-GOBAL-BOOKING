'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, AlertCircle, CheckCircle2, LifeBuoy } from 'lucide-react'

interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  tenants?: { business_name: string; business_slug: string } | null
}

interface ReviewReport {
  id: string
  reported_by_email: string
  reason: string
  details: string | null
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned'
  created_at: string
  reviews?: { id: string; rating: number; title: string | null; body: string | null } | null
}

const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const
const REPORT_STATUSES = ['pending', 'reviewed', 'dismissed', 'actioned'] as const

function ticketBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'resolved' || status === 'closed') return 'secondary'
  if (status === 'open') return 'destructive'
  return 'default'
}

function reportBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'actioned') return 'destructive'
  if (status === 'dismissed') return 'secondary'
  if (status === 'reviewed') return 'default'
  return 'outline'
}

export default function SupportAdminDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [authChecked, setAuthChecked] = useState(false)
  const [accessError, setAccessError] = useState('')

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [reports, setReports] = useState<ReviewReport[]>([])
  const [ticketStatusFilter, setTicketStatusFilter] = useState('open')
  const [reportStatusFilter, setReportStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/admin/support/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, tenant_id, platform_admin_role')
      .eq('id', user.id)
      .single()

    const isAllowed =
      userData && userData.role === 'owner' && userData.tenant_id === null &&
      (userData.platform_admin_role === 'support_admin' || userData.platform_admin_role === 'super_admin')

    if (!isAllowed) {
      setAccessError('Access denied. Support Admin access required.')
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
      const [ticketsRes, reportsRes] = await Promise.all([
        fetch(`/api/admin/support/tickets?status=${ticketStatusFilter}`),
        fetch(`/api/admin/support/review-reports?status=${reportStatusFilter}`),
      ])
      const ticketsData = await ticketsRes.json()
      const reportsData = await reportsRes.json()
      if (!ticketsRes.ok) throw new Error(ticketsData.error || 'Failed to load tickets')
      if (!reportsRes.ok) throw new Error(reportsData.error || 'Failed to load review reports')
      setTickets(ticketsData.tickets || [])
      setReports(reportsData.reports || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [ticketStatusFilter, reportStatusFilter])

  useEffect(() => {
    if (authChecked && !accessError) loadData()
  }, [authChecked, accessError, loadData])

  const updateTicket = async (id: string, status: string) => {
    setUpdatingId(id)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/admin/support/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setNotice(`Ticket ${data.ticket.ticket_number} marked ${status.replace('_', ' ')}.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  const updateReport = async (id: string, status: string) => {
    setUpdatingId(id)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/admin/support/review-reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setNotice(`Report marked ${status}.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdatingId(null)
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
            <LifeBuoy className="h-6 w-6" /> Support Admin
          </h1>
          <p className="text-muted-foreground">Support tickets & review moderation</p>
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

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="tickets">
            <TabsList>
              <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
              <TabsTrigger value="reports">Review Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-2">
                {TICKET_STATUSES.map((s) => (
                  <Button
                    key={s}
                    variant={ticketStatusFilter === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTicketStatusFilter(s)}
                  >
                    {s.replace('_', ' ')}
                  </Button>
                ))}
              </div>

              {tickets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No tickets in this view.
                  </CardContent>
                </Card>
              ) : (
                tickets.map((ticket) => (
                  <Card key={ticket.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-base">
                            {ticket.ticket_number} · {ticket.subject}
                          </CardTitle>
                          <CardDescription>
                            {ticket.category} · {ticket.priority} priority
                            {ticket.tenants ? ` · ${ticket.tenants.business_name}` : ''}
                          </CardDescription>
                        </div>
                        <Badge variant={ticketBadgeVariant(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {TICKET_STATUSES.filter((s) => s !== ticket.status).map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            disabled={updatingId === ticket.id}
                            onClick={() => updateTicket(ticket.id, s)}
                          >
                            Mark {s.replace('_', ' ')}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="reports" className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-2">
                {REPORT_STATUSES.map((s) => (
                  <Button
                    key={s}
                    variant={reportStatusFilter === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReportStatusFilter(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>

              {reports.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No review reports in this view.
                  </CardContent>
                </Card>
              ) : (
                reports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-base">Reason: {report.reason}</CardTitle>
                          <CardDescription>Reported by {report.reported_by_email}</CardDescription>
                        </div>
                        <Badge variant={reportBadgeVariant(report.status)}>{report.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {report.details && <p className="text-sm text-muted-foreground">{report.details}</p>}
                      {report.reviews && (
                        <div className="rounded-md border p-3 text-sm">
                          <div className="font-medium">{report.reviews.title || 'Untitled review'} · {report.reviews.rating}★</div>
                          <p className="text-muted-foreground">{report.reviews.body}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {REPORT_STATUSES.filter((s) => s !== report.status).map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant={s === 'actioned' ? 'destructive' : 'outline'}
                            disabled={updatingId === report.id}
                            onClick={() => updateReport(report.id, s)}
                          >
                            Mark {s}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
