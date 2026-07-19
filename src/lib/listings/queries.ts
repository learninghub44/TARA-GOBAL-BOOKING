import { createClient } from '@/lib/supabase/server'
import type {
  ListingType,
  ListingCard,
  Tour,
  TravelService,
  CarRental,
  AdventureActivity,
  AnyListing,
} from '@/types/listings'

const TABLE_BY_TYPE: Record<ListingType, string> = {
  tour: 'tours',
  travel_service: 'travel_services',
  car_rental: 'car_rentals',
  adventure: 'adventure_activities',
}

export function tableForType(type: ListingType): string {
  return TABLE_BY_TYPE[type]
}

function priceOf(type: ListingType, row: Record<string, unknown>): number {
  if (type === 'car_rental') return Number(row.daily_rate)
  return Number(row.base_price)
}

function priceLabelOf(type: ListingType, row: Record<string, unknown>): string {
  switch (type) {
    case 'tour':
      return row.price_per_person ? 'per person' : 'total'
    case 'adventure':
      return row.price_per_person ? 'per person' : 'total'
    case 'car_rental':
      return 'per day'
    case 'travel_service':
      return (row.price_per_unit as string) || 'per booking'
    default:
      return ''
  }
}

function locationOf(type: ListingType, row: Record<string, unknown>): string {
  if (type === 'car_rental' || type === 'adventure') {
    const city = row.location_city as string | null
    const country = row.location_country as string
    return [city, country].filter(Boolean).join(', ')
  }
  const city = row.destination_city as string | null
  const country = row.destination_country as string
  return [city, country].filter(Boolean).join(', ')
}

function toCard(type: ListingType, row: Record<string, unknown>): ListingCard {
  return {
    id: row.id as string,
    type,
    title: row.title as string,
    slug: row.slug as string,
    short_description: (row.short_description as string) || null,
    primary_image_url: (row.primary_image_url as string) || null,
    location: locationOf(type, row),
    price: priceOf(type, row),
    price_label: priceLabelOf(type, row),
    currency: (row.currency as string) || 'USD',
    rating: Number(row.rating || 0),
    total_reviews: Number(row.total_reviews || 0),
    is_featured: Boolean(row.is_featured),
    tenant_id: row.tenant_id as string,
  }
}

export interface ListingFilters {
  types?: ListingType[]
  search?: string
  country?: string
  minPrice?: number
  maxPrice?: number
  featuredOnly?: boolean
  limit?: number
}

const ALL_TYPES: ListingType[] = ['tour', 'travel_service', 'car_rental', 'adventure']

// Fetches active/published listings across one or more of the 4 listing
// tables and normalizes them into a single sortable, filterable list.
export async function getListings(filters: ListingFilters = {}): Promise<ListingCard[]> {
  const supabase = await createClient()
  const types = filters.types?.length ? filters.types : ALL_TYPES
  const limitPerType = filters.limit ?? 24

  const results = await Promise.all(
    types.map(async (type) => {
      const table = tableForType(type)
      let query = supabase
        .from(table)
        .select('*')
        .eq('is_active', true)
        .eq('listing_status', 'active')
        .limit(limitPerType)

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`)
      }
      if (filters.featuredOnly) {
        query = query.eq('is_featured', true)
      }
      if (filters.country) {
        const col = type === 'car_rental' || type === 'adventure' ? 'location_country' : 'destination_country'
        query = query.ilike(col, `%${filters.country}%`)
      }

      const { data, error } = await query
      if (error) {
        console.error(`Error fetching ${table}:`, error.message)
        return []
      }
      return (data || []).map((row) => toCard(type, row))
    })
  )

  let cards = results.flat()

  if (filters.minPrice !== undefined) {
    cards = cards.filter((c) => c.price >= filters.minPrice!)
  }
  if (filters.maxPrice !== undefined) {
    cards = cards.filter((c) => c.price <= filters.maxPrice!)
  }

  return cards.sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
    return b.rating - a.rating
  })
}

export async function getListingBySlug(
  type: ListingType,
  slug: string
): Promise<AnyListing | null> {
  const supabase = await createClient()
  const table = tableForType(type)

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('listing_status', 'active')
    .single()

  if (error || !data) return null
  return data as unknown as AnyListing
}

export async function getListingById(
  type: ListingType,
  id: string
): Promise<AnyListing | null> {
  const supabase = await createClient()
  const table = tableForType(type)

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as unknown as AnyListing
}

export function listingPrice(type: ListingType, listing: AnyListing): number {
  if (type === 'car_rental') return (listing as CarRental).daily_rate
  return (listing as Tour | TravelService | AdventureActivity).base_price
}
