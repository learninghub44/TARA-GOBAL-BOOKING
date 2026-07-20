import Navigation from '@/components/Navigation'
import AIAssistant from '@/components/AIAssistant'
import Hero from '@/components/home/Hero'
import CategoryShowcase, { type CategoryTile } from '@/components/home/CategoryShowcase'
import StatsBand from '@/components/home/StatsBand'
import FeaturedListings from '@/components/home/FeaturedListings'
import CtaBand from '@/components/home/CtaBand'
import SiteFooter from '@/components/home/SiteFooter'
import { getListings } from '@/lib/listings/queries'
import type { ListingType } from '@/types/listings'

const CATEGORY_META: { type: ListingType; letter: string; href: string; label: string; description: string; image: string }[] = [
  {
    type: 'tour',
    letter: 'T',
    href: '/tours',
    label: 'Tours',
    description: 'Guided tours and curated experiences with local operators.',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306',
  },
  {
    type: 'travel_service',
    letter: 'A',
    href: '/travel-services',
    label: 'Travel Services',
    description: 'Flights, accommodation, and end-to-end travel assistance.',
    image: 'https://images.unsplash.com/photo-1500835556837-99ac94a94552',
  },
  {
    type: 'car_rental',
    letter: 'R',
    href: '/car-rentals',
    label: 'Car Rentals',
    description: 'Self-drive and chauffeured vehicles for every route.',
    image: 'https://images.unsplash.com/photo-1614414827233-e53d9d81aef8',
  },
  {
    type: 'adventure',
    letter: 'A',
    href: '/adventures',
    label: 'Adventures',
    description: 'Hikes, safaris, and thrill-seeking activities.',
    image: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75',
  },
]

export default async function Home() {
  const [featured, ...categoryListings] = await Promise.all([
    getListings({ featuredOnly: true, limit: 6 }),
    ...CATEGORY_META.map((c) => getListings({ types: [c.type], limit: 50 })),
  ])

  const categories: CategoryTile[] = CATEGORY_META.map((meta, i) => ({
    letter: meta.letter,
    href: meta.href,
    label: meta.label,
    description: meta.description,
    image: meta.image,
    count: categoryListings[i].length,
  }))

  const stats = [
    { label: 'Tours', value: categories[0].count },
    { label: 'Travel services', value: categories[1].count },
    { label: 'Car rentals', value: categories[2].count },
    { label: 'Adventures', value: categories[3].count },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-16 md:pb-0 md:pl-20">
      <Navigation />
      <AIAssistant />

      <Hero />
      <CategoryShowcase categories={categories} />
      <StatsBand stats={stats} />
      <FeaturedListings listings={featured} />
      <CtaBand />
      <SiteFooter />
    </div>
  )
}
