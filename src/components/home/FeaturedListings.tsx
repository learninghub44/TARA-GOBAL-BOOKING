import Link from 'next/link'
import { MapPin, Star, ArrowRight } from 'lucide-react'
import ListingImage from '@/components/listings/ListingImage'
import type { ListingCard } from '@/types/listings'
import Reveal from './Reveal'

const TYPE_LABELS: Record<ListingCard['type'], string> = {
  tour: 'Tour',
  travel_service: 'Travel service',
  car_rental: 'Car rental',
  adventure: 'Adventure',
}

export default function FeaturedListings({ listings }: { listings: ListingCard[] }) {
  if (listings.length === 0) return null

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-brand-ember">Handpicked</span>
            <h2 className="mt-2 font-display text-4xl font-medium text-brand-navy sm:text-5xl">
              Featured this season
            </h2>
          </div>
          <Link
            href="/listings"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand-navy transition-colors hover:text-brand-ember"
          >
            View all listings
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        {/* Horizontal scroll on mobile, grid from md up */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {listings.map((listing, i) => (
            <Reveal key={`${listing.type}-${listing.id}`} delay={0.08 * i} className="w-[82vw] shrink-0 snap-start sm:w-auto">
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
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-brand-navy backdrop-blur-sm">
                    {TYPE_LABELS[listing.type]}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  {listing.location && (
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs text-brand-navy/50">
                      <MapPin className="h-3.5 w-3.5" />
                      {listing.location}
                    </div>
                  )}
                  <h3 className="font-display text-lg font-medium leading-snug text-brand-navy line-clamp-1">
                    {listing.title}
                  </h3>

                  <div className="mt-2 flex items-center gap-1.5 text-sm text-brand-navy/70">
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
      </div>
    </section>
  )
}
