import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 md:pl-20">
      <Navigation />
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-6">About TARA</h1>
        <Card>
          <CardContent className="p-8 space-y-4 text-gray-700 leading-relaxed">
            <p>
              TARA connects travelers with tour operators, travel service providers, car rental
              companies, and adventure activity businesses in one marketplace — Tours, Travels,
              Rentals, Adventures.
            </p>
            <p>
              Every vendor on TARA goes through identity verification before their listings go
              live, and every booking is protected by our secure payment processing and
              cancellation policies.
            </p>
            <p>
              Whether you&apos;re planning a multi-day safari, need a reliable airport transfer,
              want to rent a car for a road trip, or you&apos;re after your next adrenaline
              rush, TARA helps you book it directly with a verified local operator.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
