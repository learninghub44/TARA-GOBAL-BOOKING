import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Phone, Info } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

// TARA is a directory/marketplace: we connect buyers with vendors and take a
// platform subscription fee from vendors. We do NOT process payment for the
// underlying tour/rental/service booking - that happens directly between the
// customer and the vendor, off-platform.
export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: booking } = await supabase.from('bookings').select('*').eq('id', id).single()

  if (!booking) {
    notFound()
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('business_name, business_email, business_phone')
    .eq('id', booking.tenant_id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <section className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Booking Request Sent</h1>
              <Badge variant="outline">{booking.status}</Badge>
            </div>

            <p className="text-gray-600 mb-6">
              Your request has been sent to {tenant?.business_name || 'the vendor'}. Reach out
              using the details below to confirm availability and arrange payment directly with
              them.
            </p>

            <dl className="space-y-3 text-sm mb-6">
              <Row label="Booking reference" value={booking.id} />
              <Row label="Guest" value={`${booking.customer_name} (${booking.customer_email})`} />
              <Row label="Start date" value={new Date(booking.start_date).toLocaleDateString()} />
              {booking.end_date && (
                <Row label="End date" value={new Date(booking.end_date).toLocaleDateString()} />
              )}
              <Row label="Participants" value={String(booking.number_of_participants)} />
              {booking.special_requests && (
                <Row label="Special requests" value={booking.special_requests} />
              )}
              <Row
                label="Estimated total"
                value={`${booking.currency} ${Number(booking.total_amount).toLocaleString()}`}
              />
            </dl>

            <div className="border-t pt-6">
              <h2 className="font-semibold mb-3">Contact the vendor</h2>
              <div className="space-y-2 text-sm">
                {tenant?.business_email && (
                  <a
                    href={`mailto:${tenant.business_email}?subject=Booking%20${booking.id}`}
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <Mail className="h-4 w-4" /> {tenant.business_email}
                  </a>
                )}
                {tenant?.business_phone && (
                  <a
                    href={`tel:${tenant.business_phone}`}
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <Phone className="h-4 w-4" /> {tenant.business_phone}
                  </a>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border rounded-md p-3">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                TARA does not process payment for bookings. Please pay the vendor directly and
                only after confirming details with them. Reference your booking ID{' '}
                <span className="font-mono">{booking.id}</span> in all communication.
              </span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  )
}
