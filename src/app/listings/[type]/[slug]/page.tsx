import Navigation from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, Clock, Users, CheckCircle2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getListingBySlug, listingPrice } from '@/lib/listings/queries'
import type { ListingType, Tour, CarRental, AdventureActivity, TravelService, AnyListing } from '@/types/listings'
import BookingForm from './booking-form'

const VALID_TYPES: ListingType[] = ['tour', 'travel_service', 'car_rental', 'adventure']

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ type: string; slug: string }>
}) {
  const { type, slug } = await params

  if (!VALID_TYPES.includes(type as ListingType)) {
    notFound()
  }

  const listingType = type as ListingType
  const listing = await getListingBySlug(listingType, slug)

  if (!listing) {
    notFound()
  }

  const price = listingPrice(listingType, listing)
  const images = [listing.primary_image_url, ...(listing.gallery_urls || [])].filter(Boolean) as string[]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <section className="relative h-[360px] bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
        {images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0]} alt={listing.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-6 left-0 right-0 max-w-6xl mx-auto px-4">
          <Badge className="mb-3 bg-white/90 text-gray-900 border-none">
            {listingType.replace('_', ' ')}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{listing.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-white/90">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {listing.rating.toFixed(1)} ({listing.total_reviews} reviews)
            </span>
            <LocationLine type={listingType} listing={listing} />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-3">About this listing</h2>
              <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
            </CardContent>
          </Card>

          <ListingDetails type={listingType} listing={listing} />

          {listing.cancellation_policy && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-3">Cancellation Policy</h2>
                <p className="text-gray-700">{listing.cancellation_policy}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <BookingForm
            listingId={listing.id}
            listingType={listingType}
            tenantId={listing.tenant_id}
            title={listing.title}
            price={price}
            currency={listing.currency}
            priceIsPerPerson={
              listingType === 'tour' || listingType === 'adventure'
                ? Boolean((listing as Tour | AdventureActivity).price_per_person)
                : false
            }
            requiresDateRange={listingType === 'car_rental'}
          />
        </div>
      </section>
    </div>
  )
}

function LocationLine({ type, listing }: { type: ListingType; listing: AnyListing }) {
  const l = listing as CarRental & AdventureActivity & Tour & TravelService
  const city = type === 'car_rental' || type === 'adventure' ? l.location_city : l.destination_city
  const country = type === 'car_rental' || type === 'adventure' ? l.location_country : l.destination_country
  const text = [city, country].filter(Boolean).join(', ')
  if (!text) return null
  return (
    <span className="flex items-center gap-1">
      <MapPin className="h-4 w-4" /> {text}
    </span>
  )
}

function ListingDetails({ type, listing }: { type: ListingType; listing: AnyListing }) {
  if (type === 'tour') {
    const tour = listing as Tour
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" /> {tour.duration_days} day
              {tour.duration_days === 1 ? '' : 's'}
            </span>
            {tour.max_group_size && (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" /> Up to {tour.max_group_size} people
              </span>
            )}
            {tour.difficulty_level && <Badge variant="outline">{tour.difficulty_level}</Badge>}
          </div>
          {tour.highlights && tour.highlights.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Highlights</h3>
              <ul className="space-y-1">
                {tour.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tour.included_services && tour.included_services.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Included</h3>
              <ul className="space-y-1">
                {tour.included_services.map((h, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    • {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (type === 'car_rental') {
    const car = listing as CarRental
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {car.make && <Detail label="Make / Model" value={`${car.make} ${car.model || ''}`} />}
            {car.year && <Detail label="Year" value={String(car.year)} />}
            {car.seating_capacity && <Detail label="Seats" value={String(car.seating_capacity)} />}
            {car.transmission_type && <Detail label="Transmission" value={car.transmission_type} />}
            {car.fuel_type && <Detail label="Fuel" value={car.fuel_type} />}
            {car.pickup_location && <Detail label="Pickup" value={car.pickup_location} />}
          </div>
          {car.features && car.features.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Features</h3>
              <div className="flex flex-wrap gap-2">
                {car.features.map((f, i) => (
                  <Badge key={i} variant="outline">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (type === 'adventure') {
    const adv = listing as AdventureActivity
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex flex-wrap gap-6 text-sm">
            {adv.duration_hours && (
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" /> {adv.duration_hours}h
              </span>
            )}
            {adv.difficulty_level && <Badge variant="outline">{adv.difficulty_level}</Badge>}
          </div>
          {adv.equipment_provided && adv.equipment_provided.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Equipment Provided</h3>
              <ul className="space-y-1">
                {adv.equipment_provided.map((h, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    • {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const service = listing as TravelService
  return (
    <Card>
      <CardContent className="p-6">
        <Detail label="Service Type" value={service.service_type} />
      </CardContent>
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
