import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Star, MapPin, Search } from 'lucide-react'
import Link from 'next/link'
import { getListings } from '@/lib/listings/queries'
import type { ListingType } from '@/types/listings'

const TYPE_LABELS: Record<ListingType, string> = {
  tour: 'Tour',
  travel_service: 'Travel Service',
  car_rental: 'Car Rental',
  adventure: 'Adventure',
}

const TYPE_TABS: { value: ListingType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'tour', label: 'Tours' },
  { value: 'travel_service', label: 'Travel Services' },
  { value: 'car_rental', label: 'Car Rentals' },
  { value: 'adventure', label: 'Adventures' },
]

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; country?: string }>
}) {
  const params = await searchParams
  const type = params.type as ListingType | undefined
  const listings = await getListings({
    types: type ? [type] : undefined,
    search: params.q,
    country: params.country,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Explore Tours, Rentals &amp; Adventures
          </h1>
          <form className="flex flex-col md:flex-row gap-3 max-w-2xl" action="/listings">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                name="q"
                defaultValue={params.q}
                placeholder="Search destinations, tours, cars..."
                className="pl-10 h-12 bg-white"
              />
            </div>
            <Input
              name="country"
              defaultValue={params.country}
              placeholder="Country"
              className="h-12 bg-white md:w-48"
            />
            <Button type="submit" className="h-12 px-8">
              Search
            </Button>
          </form>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          {TYPE_TABS.map((tab) => {
            const active = (tab.value === 'all' && !type) || tab.value === type
            const href =
              tab.value === 'all'
                ? `/listings${params.q ? `?q=${params.q}` : ''}`
                : `/listings?type=${tab.value}${params.q ? `&q=${params.q}` : ''}`
            return (
              <Link key={tab.value} href={href}>
                <Badge
                  variant={active ? 'default' : 'outline'}
                  className="px-4 py-2 text-sm cursor-pointer"
                >
                  {tab.label}
                </Badge>
              </Link>
            )
          })}
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">
              No listings found yet. Check back soon, or try a different search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Link key={`${listing.type}-${listing.id}`} href={`/listings/${listing.type}/${listing.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full py-0">
                  <div className="relative h-48 bg-gradient-to-br from-blue-400 to-purple-500">
                    {listing.primary_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.primary_image_url}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                    {listing.is_featured && (
                      <Badge className="absolute top-3 left-3 bg-yellow-500 text-white border-none">
                        Featured
                      </Badge>
                    )}
                    <Badge className="absolute top-3 right-3 bg-white/90 text-gray-900 border-none">
                      {TYPE_LABELS[listing.type]}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-1">{listing.title}</h3>
                    {listing.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                        <MapPin className="h-3.5 w-3.5" /> {listing.location}
                      </p>
                    )}
                    {listing.short_description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {listing.short_description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{listing.rating.toFixed(1)}</span>
                        <span className="text-gray-400">({listing.total_reviews})</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {listing.currency} {listing.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">{listing.price_label}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
