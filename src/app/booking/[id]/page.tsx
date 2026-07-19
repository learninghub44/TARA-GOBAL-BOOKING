import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import PayButton from './pay-button'

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: booking } = await supabase.from('bookings').select('*').eq('id', id).single()

  if (!booking) {
    notFound()
  }

  const isPaid = booking.payment_status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <section className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Booking Summary</h1>
              <Badge variant={isPaid ? 'default' : 'outline'}>
                {isPaid ? 'Paid' : booking.status}
              </Badge>
            </div>

            <dl className="space-y-3 text-sm">
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
            </dl>

            <div className="border-t mt-6 pt-6 flex items-center justify-between">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold">
                {booking.currency} {Number(booking.total_amount).toLocaleString()}
              </span>
            </div>

            <div className="mt-6">
              {isPaid ? (
                <p className="text-center text-green-600 font-medium">
                  Payment received — your booking is confirmed. A confirmation has been sent to{' '}
                  {booking.customer_email}.
                </p>
              ) : (
                <PayButton
                  bookingId={booking.id}
                  amount={Number(booking.total_amount)}
                  currency={booking.currency}
                  email={booking.customer_email}
                />
              )}
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
