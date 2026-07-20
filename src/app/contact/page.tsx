import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, MessageSquare, LifeBuoy, Briefcase, Sparkles, MapPin, Clock } from 'lucide-react'
import Link from 'next/link'

const CONTACT_CHANNELS = [
  {
    icon: LifeBuoy,
    title: 'Customer & Vendor Support',
    description:
      'Questions about a booking, a listing, your vendor account, payments, or verification.',
    email: 'support@tara.com',
  },
  {
    icon: Briefcase,
    title: 'Sales & Partnerships',
    description:
      'Onboarding your business, subscription plans, promotional add-ons, or partnership inquiries.',
    email: 'sales@tara.com',
  },
  {
    icon: Sparkles,
    title: 'General Inquiries',
    description: 'Press, feedback, or anything else that doesn\u2019t fit the categories above.',
    email: 'hello@tara.com',
  },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 md:pl-20">
      <Navigation />
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Contact Us</h1>
        <p className="text-gray-500 mb-8">
          We usually respond within one business day.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {CONTACT_CHANNELS.map((channel) => (
            <Card key={channel.email}>
              <CardContent className="p-6 space-y-3">
                <channel.icon className="h-6 w-6 text-primary" />
                <h2 className="font-semibold text-gray-900">{channel.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{channel.description}</p>
                <a
                  href={`mailto:${channel.email}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline pt-1"
                >
                  <Mail className="h-4 w-4" />
                  {channel.email}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-6">
          <CardContent className="p-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Already have an account?
              </h2>
              <p className="text-gray-700">
                For the fastest response on an existing booking, listing, or payment issue, open a
                support ticket from your dashboard so our team has the context to help right away.
              </p>
            </div>
            <Link href="/support/new">
              <Button className="w-full h-11">
                <MessageSquare className="h-4 w-4 mr-2" />
                Open a Support Ticket
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8 space-y-4 text-gray-700">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
              <span>Nairobi, Kenya &middot; serving travelers and vendors across East Africa</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400 shrink-0" />
              <span>Support hours: Monday &ndash; Saturday, 8:00 AM &ndash; 6:00 PM EAT</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400 shrink-0" />
              <span>
                General: <a href="mailto:hello@tara.com" className="text-primary hover:underline">hello@tara.com</a>
                {' '}&middot;{' '}
                Support: <a href="mailto:support@tara.com" className="text-primary hover:underline">support@tara.com</a>
                {' '}&middot;{' '}
                Sales: <a href="mailto:sales@tara.com" className="text-primary hover:underline">sales@tara.com</a>
              </span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
