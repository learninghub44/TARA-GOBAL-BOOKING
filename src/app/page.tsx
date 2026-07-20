import Navigation from '@/components/Navigation'
import AIAssistant from '@/components/AIAssistant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, MapPin, Star, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getListings } from '@/lib/listings/queries'

const CATEGORY_TILES = [
  {
    href: '/tours',
    label: 'Tours',
    description: 'Guided tours and experiences',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306',
  },
  {
    href: '/travel-services',
    label: 'Travel Services',
    description: 'Flights, hotels, and assistance',
    image: 'https://images.unsplash.com/photo-1500835556837-99ac94a94552',
  },
  {
    href: '/car-rentals',
    label: 'Car Rentals',
    description: 'Rent vehicles for your journey',
    image: 'https://images.unsplash.com/photo-1614414827233-e53d9d81aef8',
  },
  {
    href: '/adventures',
    label: 'Adventures',
    description: 'Thrilling activities and experiences',
    image: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75',
  },
]

export default async function Home() {
  const featured = await getListings({ featuredOnly: true, limit: 3 })

  return (
    <div className="min-h-screen bg-white md:pl-20">
      <Navigation />
      <AIAssistant />
      
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-navy to-brand-gold" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Discover Your Next Adventure
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8">
            Tours • Travels • Rentals • Adventures
          </p>
          
          {/* Search Box */}
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-6">
              <form action="/listings" className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      name="q"
                      placeholder="Where do you want to go?"
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      name="country"
                      placeholder="Country"
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
                <Button type="submit" size="lg" className="h-12 px-8">
                  Search
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Explore by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORY_TILES.map((tile) => (
              <Link key={tile.href} href={tile.href}>
                <Card className="group cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="h-48 rounded-lg mb-4 relative overflow-hidden">
                      <Image
                        src={`${tile.image}?w=800&q=80&auto=format&fit=crop`}
                        alt={tile.label}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{tile.label}</h3>
                    <p className="text-gray-600">{tile.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {featured.length > 0 && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Featured Listings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featured.map((listing) => (
                <Link key={`${listing.type}-${listing.id}`} href={`/listings/${listing.type}/${listing.slug}`}>
                  <Card className="overflow-hidden group cursor-pointer h-full py-0">
                    <div className="h-64 bg-gradient-to-br from-teal-400 to-teal-600 relative">
                      {listing.primary_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={listing.primary_image_url}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <CardContent className="p-6">
                      {listing.location && (
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{listing.location}</span>
                        </div>
                      )}
                      <h3 className="text-xl font-semibold mb-2 line-clamp-1">{listing.title}</h3>
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">
                          {listing.rating.toFixed(1)} ({listing.total_reviews} reviews)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          From {listing.currency} {listing.price.toLocaleString()}
                        </span>
                        <ArrowRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <Card className="bg-gradient-to-br from-brand-navy to-brand-gold text-white">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join thousands of travelers who have discovered amazing experiences with TARA
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/register">
                  <Button size="lg" variant="secondary" className="h-12 px-8">
                    Create Account
                  </Button>
                </Link>
                <Link href="/tours">
                  <Button size="lg" variant="outline" className="h-12 px-8 bg-white/10 border-white/20 text-white hover:bg-white/20">
                    Browse Tours
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">TARA</h3>
              <p className="text-gray-400">
                Tours • Travels • Rentals • Adventures
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Explore</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/tours" className="hover:text-white">Tours</Link></li>
                <li><Link href="/travel-services" className="hover:text-white">Travel Services</Link></li>
                <li><Link href="/car-rentals" className="hover:text-white">Car Rentals</Link></li>
                <li><Link href="/adventures" className="hover:text-white">Adventures</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Business</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/vendor/register" className="hover:text-white">Partner with Us</Link></li>
                <li><Link href="/auth/login" className="hover:text-white">Vendor Login</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 TARA. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
