import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <section className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
        <Card>
          <CardContent className="p-8 space-y-6">
            <p className="text-gray-700">
              Have a question about a booking, a listing, or your vendor account? Open a support
              ticket and our team will get back to you.
            </p>
            <div className="flex items-center gap-3 text-gray-700">
              <Mail className="h-5 w-5 text-gray-400" />
              <span>{process.env.NEXT_PUBLIC_APP_NAME || 'TARA'} Support</span>
            </div>
            <Link href="/support/new">
              <Button className="w-full h-11">
                <MessageSquare className="h-4 w-4 mr-2" />
                Open a Support Ticket
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
