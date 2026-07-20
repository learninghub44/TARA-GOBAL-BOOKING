import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Compass, ShieldCheck, Users, Handshake, MapPin, Mail } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 md:pl-20">
      <Navigation />
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">About TARA</h1>
        <p className="text-gray-500 mb-8">Tours • Travels • Rentals • Adventures</p>

        <Card className="mb-6">
          <CardContent className="p-8 space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-semibold text-gray-900">Our Story</h2>
            <p>
              TARA was built for East Africa&apos;s travel industry, by people who know it. Too
              often, travelers looking for a tour, a car rental, or an adventure activity had to
              piece together recommendations from social media, WhatsApp groups, and word of
              mouth &mdash; with no easy way to verify who they were actually booking with. At the
              same time, independent tour operators, travel agents, car rental companies, and
              adventure outfitters had no single place to reach travelers directly, without giving
              up a cut of every booking to a foreign platform.
            </p>
            <p>
              TARA closes that gap. We built a single marketplace &mdash; Tours, Travels, Rentals,
              Adventures &mdash; where verified local vendors list what they offer, and travelers
              can discover, compare, and book directly with them. Vendors pay TARA a simple
              recurring platform subscription to be listed; what happens between a vendor and a
              customer &mdash; the booking, the payment, the trip &mdash; stays between them, on
              terms and payment methods that make sense locally, including M-Pesa.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-8 space-y-4 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-semibold text-gray-900">What We Do</h2>
            <p>
              TARA brings four categories of local travel businesses onto one platform:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium text-gray-900">Tours</span> &mdash; multi-day safaris, day trips, and guided experiences with full itineraries.</li>
              <li><span className="font-medium text-gray-900">Travel services</span> &mdash; airport transfers, chauffeured travel, and logistics support.</li>
              <li><span className="font-medium text-gray-900">Car rentals</span> &mdash; self-drive and chauffeured vehicles, listed with real specs and availability.</li>
              <li><span className="font-medium text-gray-900">Adventures</span> &mdash; adrenaline and outdoor activities run by local specialists.</li>
            </ul>
            <p>
              Every vendor goes through identity and business verification before their listings
              go live, every conversation happens in-app, and every booking is backed by the
              cancellation policy the vendor has committed to upfront.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">What We Stand For</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Verified vendors</h3>
                  <p className="text-sm text-gray-600">
                    Every business is KYC-checked before it can list, so travelers know who
                    they&apos;re dealing with.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Handshake className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Fair to local business</h3>
                  <p className="text-sm text-gray-600">
                    A flat subscription, not a cut of every booking &mdash; vendors keep what they
                    earn.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Compass className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Built for East Africa</h3>
                  <p className="text-sm text-gray-600">
                    KES-first pricing, M-Pesa, Paystack, and Pesapal support from day one.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Users className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Direct relationships</h3>
                  <p className="text-sm text-gray-600">
                    Customers and vendors talk and transact directly &mdash; TARA doesn&apos;t sit
                    between you and your trip.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8 space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-semibold text-gray-900">Get in Touch</h2>
            <p>
              Whether you&apos;re planning a multi-day safari, need a reliable airport transfer,
              want to rent a car for a road trip, or you&apos;re after your next adrenaline rush,
              TARA helps you book it directly with a verified local operator. Have a question, a
              partnership idea, or feedback for us?
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Mail className="h-5 w-5 text-gray-400" />
              <a href="mailto:hello@tara.com" className="text-primary hover:underline">
                hello@tara.com
              </a>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <span>Nairobi, Kenya &middot; serving travelers across East Africa</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
