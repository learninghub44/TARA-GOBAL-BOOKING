import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; booking?: string }>
}) {
  const { status, booking } = await searchParams

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <section className="max-w-lg mx-auto px-4 py-20">
        <Card>
          <CardContent className="p-8 text-center">
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Payment successful!</h1>
                <p className="text-gray-600 mb-6">
                  Your booking is confirmed. A confirmation email is on its way.
                </p>
              </>
            )}
            {status === 'failed' && (
              <>
                <XCircle className="h-14 w-14 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Payment failed</h1>
                <p className="text-gray-600 mb-6">
                  Your payment didn&apos;t go through. You can try again from your booking page.
                </p>
              </>
            )}
            {(!status || status === 'error') && (
              <>
                <AlertCircle className="h-14 w-14 text-yellow-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">We couldn&apos;t confirm your payment</h1>
                <p className="text-gray-600 mb-6">
                  Please check your booking status or contact support if you were charged.
                </p>
              </>
            )}

            <div className="flex gap-3 justify-center">
              {booking && (
                <Link href={`/booking/${booking}`}>
                  <Button variant="outline">View Booking</Button>
                </Link>
              )}
              <Link href="/listings">
                <Button>Browse More</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
