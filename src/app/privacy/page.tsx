import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
        <Card>
          <CardContent className="p-8 space-y-4 text-gray-700 leading-relaxed text-sm">
            <p>
              This policy explains what information TARA collects when you browse listings, make
              a booking, or register a vendor account, and how that information is used.
            </p>
            <h2 className="text-lg font-semibold text-gray-900 pt-2">Information we collect</h2>
            <p>
              When you make a booking we collect your name, email, phone number, and payment
              reference. When you register as a vendor we additionally collect business details
              and identity verification documents required to comply with our KYC process.
            </p>
            <h2 className="text-lg font-semibold text-gray-900 pt-2">How we use it</h2>
            <p>
              Booking information is shared with the specific vendor you book with, so they can
              fulfil your reservation. Payment details are processed by our payment partners
              (Paystack, Pesapal, M-Pesa) and are not stored on TARA&apos;s servers.
            </p>
            <h2 className="text-lg font-semibold text-gray-900 pt-2">Contact</h2>
            <p>
              For any privacy-related requests, please reach out via our{' '}
              <a href="/contact" className="text-blue-600 hover:underline">
                contact page
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
