import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 md:pl-20">
      <Navigation />
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: July 20, 2026</p>

        <Card>
          <CardContent className="p-8 space-y-6 text-gray-700 leading-relaxed text-sm">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Who We Are</h2>
              <p>
                TARA (&quot;TARA&quot;, &quot;we&quot;, &quot;us&quot;) operates a marketplace
                platform that connects travelers with independent tour operators, travel service
                providers, car rental companies, and adventure activity businesses
                (&quot;vendors&quot;) across East Africa. TARA facilitates discovery, verification,
                and platform billing, but is not itself the provider of any tour, rental, transfer,
                or activity listed on the platform.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Acceptance of Terms</h2>
              <p>
                By creating an account, browsing listings, submitting a booking request, or
                registering as a vendor on TARA, you agree to be bound by these Terms of Service
                and our Privacy Policy. If you do not agree, please do not use the platform.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Marketplace Model</h2>
              <p>
                TARA is a discovery and booking-request platform. Customers can browse listings
                without an account. When a customer requests a booking, TARA connects them
                directly with the vendor; the vendor confirms availability and pricing, and payment
                for the underlying service is settled directly between the customer and the vendor,
                off-platform, using whatever method the vendor accepts (including M-Pesa, cash, or
                other arrangements agreed between the parties). TARA is not a party to that
                transaction and does not guarantee the performance, quality, safety, or legality of
                any listing.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Bookings & Cancellations</h2>
              <p>
                Each listing carries its own cancellation and refund policy, set by the vendor and
                displayed on the listing page. By submitting a booking request and proceeding with
                a vendor, you agree to that listing&apos;s stated terms. Disputes about the
                underlying booking (service quality, no-shows, cancellations) are between the
                customer and the vendor; TARA support can assist in facilitating communication but
                does not adjudicate or guarantee outcomes for off-platform transactions.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Vendor Obligations</h2>
              <p>
                Vendors must complete identity and business verification (KYC) before any listing
                can be published. Vendors are responsible for the accuracy of their listings,
                pricing, availability, and cancellation terms, and for fulfilling confirmed
                bookings in good faith. Vendors must keep their platform subscription current to
                remain listed; TARA may suspend or remove listings for failed verification,
                inaccurate information, unresolved customer complaints, or non-payment of platform
                fees.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Platform Fees & Payments to TARA</h2>
              <p>
                Vendors pay TARA a recurring subscription fee (monthly, quarterly, or annual) to
                unlock and maintain listing access, and may purchase optional add-ons such as
                featured placement or banner advertising. These platform payments are processed via
                our third-party payment partners (Paystack, Pesapal, or M-Pesa STK push) and are
                separate from any payment a customer makes to a vendor. Platform subscription
                refunds, where applicable, are handled at TARA&apos;s discretion in accordance with
                our billing policies.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Account Conduct</h2>
              <p>
                You agree not to misuse the platform &mdash; including submitting false listings or
                reviews, attempting to circumvent verification, harassing other users, or using the
                platform for any unlawful purpose. TARA reserves the right to suspend or terminate
                accounts that violate these terms.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Limitation of Liability</h2>
              <p>
                TARA provides the platform on an &quot;as is&quot; basis. To the fullest extent
                permitted by law, TARA is not liable for any loss, damage, injury, or dispute
                arising from a booking, service, or transaction conducted between a customer and a
                vendor. TARA&apos;s total liability for any claim relating to the platform itself is
                limited to the platform fees paid to TARA in the twelve months preceding the claim.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time to reflect changes to the platform or
                applicable law. Continued use of TARA after an update constitutes acceptance of the
                revised Terms. Material changes will be communicated where practical.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">10. Contact</h2>
              <p>
                Questions about these Terms can be sent to{' '}
                <a href="mailto:support@tara.com" className="text-primary hover:underline">
                  support@tara.com
                </a>
                . For vendor partnership or billing questions, reach{' '}
                <a href="mailto:sales@tara.com" className="text-primary hover:underline">
                  sales@tara.com
                </a>
                . For anything else, write to{' '}
                <a href="mailto:hello@tara.com" className="text-primary hover:underline">
                  hello@tara.com
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
