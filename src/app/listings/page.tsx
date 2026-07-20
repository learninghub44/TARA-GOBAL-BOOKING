import Navigation from '@/components/Navigation'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Star, MapPin, Search, ArrowRight, CompassIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getListings } from '@/lib/listings/queries'
import type { ListingType } from '@/types/listings'
import ListingImage from '@/components/listings/ListingImage'
import Reveal from '@/components/home/Reveal'
import HorizonDivider from '@/components/home/HorizonDivider'

const TYPE_LABELS: Record<ListingType, string> = {
  tour: 'Tour',
  travel_service: 'Travel Service',
  car_rental: 'Car Rental',
  adventure: 'Adventure',
}

const TYPE_HERO_IMAGES: Record<ListingType, string> = {
  tour: 'https://images.unsplash.com/photo-1551632811-561732d1e306',
  travel_service: 'https://images.unsplash.com/photo-1500835556837-99ac94a94552',
  car_rental: 'https://images.unsplash.com/photo-1614414827233-e53d9d81aef8',
  adventure: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75',
}

const TYPE_HEADINGS: Record<ListingType, string> = {
  tour: 'Explore Tours',
  travel_service: 'Explore Travel Services',
  car_rental: 'Explore Car Rentals',
  adventure: 'Explore Adventures',
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
    <div className="min-h-screen overflow-x-hidden bg-white pb-16 md:pb-0 md:pl-20">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-navy-deep py-16 sm:py-20">
        {type ? (
          <>
            <Image
              src={`${TYPE_HERO_IMAGES[type]}?w=1600&q=80&auto=format&fit=crop`}
              alt={TYPE_HEADINGS[type]}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-deep via-brand-navy-deep/85 to-brand-navy-deep/40" />
          </>
        ) : (
          <div className="animate-sky-drift absolute inset-0 bg-gradient-to-br from-brand-navy-deep via-brand-navy to-brand-ember/60" />
        )}
        <div className="animate-drift-slow absolute -top-24 right-[-8%] h-80 w-80 rounded-full bg-brand-orange/20 blur-[100px]" />

        <Reveal className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
            <CompassIcon className="h-3.5 w-3.5 text-brand-orange" />
            {listings.length} {listings.length === 1 ? 'listing' : 'listings'} found
          </span>
          <h1 className="mb-6 font-display text-4xl font-medium text-white sm:text-5xl">
            {type ? TYPE_HEADINGS[type] : 'Explore Tours, Rentals & Adventures'}
          </h1>

          <form className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/95 p-2.5 shadow-2xl backdrop-blur-xl sm:max-w-2xl sm:flex-row" action="/listings">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-brand-navy/40" />
              <Input
                name="q"
                defaultValue={params.q}
                placeholder="Search destinations, tours, cars..."
                className="h-12 border-none bg-transparent pl-10 shadow-none focus-visible:ring-0"
              />
            </div>
            <Input
              name="country"
              defaultValue={params.country}
              placeholder="Country"
              className="h-12 border-none bg-transparent shadow-none focus-visible:ring-0 sm:w-40"
            />
            <Button type="submit" className="h-12 bg-brand-navy px-8 hover:bg-brand-ember">
              Search
            </Button>
          </form>
        </Reveal>
      </section>

      <HorizonDivider tone="navy" />

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Reveal className="mb-10 flex flex-wrap gap-2">
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
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-brand-navy text-white hover:bg-brand-ember'
                      : 'border-brand-navy/20 text-brand-navy/70 hover:border-brand-navy/40 hover:text-brand-navy'
                  }`}
                >
                  {tab.label}
                </Badge>
              </Link>
            )
          })}
        </Reveal>

        {listings.length === 0 ? (
          <Reveal className="flex flex-col items-center gap-3 rounded-2xl bg-brand-sand py-24 text-center">
            <CompassIcon className="h-8 w-8 text-brand-navy/30" />
            <p className="text-lg text-brand-navy/60">
              No listings found yet. Check back soon, or try a different search.
            </p>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing, i) => (
              <Reveal key={`${listing.type}-${listing.id}`} delay={0.05 * (i % 6)}>
                <Link
                  href={`/listings/${listing.type}/${listing.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-brand-navy/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(10,31,56,0.35)]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-navy/5">
                    <ListingImage
                      src={listing.primary_image_url}
                      alt={listing.title}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    {listing.is_featured && (
                      <span className="absolute left-3 top-3 rounded-full bg-brand-orange px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-white">
                        Featured
                      </span>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-brand-navy backdrop-blur-sm">
                      {TYPE_LABELS[listing.type]}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg font-medium leading-snug text-brand-navy line-clamp-1">
                      {listing.title}
                    </h3>
                    {listing.location && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-navy/50">
                        <MapPin className="h-3.5 w-3.5" /> {listing.location}
                      </p>
                    )}
                    {listing.short_description && (
                      <p className="mt-2 text-sm text-brand-navy/60 line-clamp-2">
                        {listing.short_description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-1.5 text-sm text-brand-navy/70">
                      <Star className="h-4 w-4 fill-brand-orange text-brand-orange" />
                      {listing.rating.toFixed(1)}
                      <span className="text-brand-navy/40">({listing.total_reviews})</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-brand-navy/10 pt-4">
                      <div className="font-mono text-sm text-brand-navy">
                        <span className="text-base font-semibold">
                          {listing.currency} {listing.price.toLocaleString()}
                        </span>
                        <span className="text-brand-navy/50"> / {listing.price_label}</span>
                      </div>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-sand text-brand-navy transition-colors group-hover:bg-brand-navy group-hover:text-white">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
