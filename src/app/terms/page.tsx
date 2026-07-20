import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 md:pl-20">
      <Navigation />
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
        <Card>
          <CardContent className="p-8 space-y-4 text-gray-700 leading-relaxed text-sm">
            <p>
              TARA is a marketplace that connects travelers with independent tour operators,
              travel service providers, car rental companies, and adventure activity businesses.
              TARA facilitates bookings and payments but is not itself the provider of the
              underlying tour, rental, or activity.
            </p>
            <h2 className="text-lg font-semibold text-gray-900 pt-2">Bookings</h2>
            <p>
              Each listing is subject to the specific cancellation policy stated on that listing.
              By completing a booking and payment, you agree to the vendor&apos;s stated terms
              for that listing.
            </p>
            <h2 className="text-lg font-semibold text-gray-900 pt-2">Vendors</h2>
            <p>
              Vendors must complete identity verification (KYC) before listings can be published.
              Vendors are responsible for the accuracy of their listings and for fulfilling
              confirmed bookings.
            </p>
            <h2 className="text-lg font-semibold text-gray-900 pt-2">Payments</h2>
            <p>
              Payments are processed via our third-party payment partners. Refunds, where
              applicable, follow the cancellation policy of the specific listing booked.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
