export type ListingType = 'tour' | 'travel_service' | 'car_rental' | 'adventure'
export type ListingStatus = 'draft' | 'active' | 'inactive' | 'suspended'
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'

export interface ListingBase {
  id: string
  tenant_id: string
  title: string
  slug: string
  description: string
  short_description: string | null
  primary_image_url: string | null
  gallery_urls: string[] | null
  video_url: string | null
  currency: string
  discount_percentage: number
  is_featured: boolean
  is_active: boolean
  listing_status: ListingStatus
  rating: number
  total_reviews: number
  total_bookings: number
  view_count: number
  cancellation_policy: string | null
  terms_and_conditions: string | null
  created_at: string
  updated_at: string
}

export interface Tour extends ListingBase {
  destination_country: string
  destination_city: string | null
  destination_address: string | null
  latitude: number | null
  longitude: number | null
  duration_days: number
  duration_hours: number | null
  max_group_size: number | null
  min_group_size: number
  difficulty_level: string | null
  age_requirement: string | null
  included_services: string[] | null
  excluded_services: string[] | null
  requirements: string[] | null
  highlights: string[] | null
  itinerary: unknown
  base_price: number
  price_per_person: boolean
}

export interface TravelService extends ListingBase {
  service_type: string
  destination_country: string
  destination_city: string | null
  destination_address: string | null
  latitude: number | null
  longitude: number | null
  base_price: number
  price_per_unit: string | null
}

export interface CarRental extends ListingBase {
  vehicle_type: string
  make: string | null
  model: string | null
  year: number | null
  color: string | null
  seating_capacity: number | null
  luggage_capacity: number | null
  transmission_type: string | null
  fuel_type: string | null
  features: string[] | null
  location_country: string
  location_city: string | null
  location_address: string | null
  pickup_location: string | null
  dropoff_location: string | null
  daily_rate: number
  weekly_rate: number | null
  monthly_rate: number | null
  minimum_rental_days: number
  maximum_rental_days: number | null
  insurance_included: boolean
  insurance_details: string | null
}

export interface AdventureActivity extends ListingBase {
  activity_type: string
  difficulty_level: string | null
  duration_hours: number | null
  duration_minutes: number | null
  location_country: string
  location_city: string | null
  location_address: string | null
  requirements: string[] | null
  equipment_provided: string[] | null
  equipment_required: string[] | null
  safety_measures: string[] | null
  base_price: number
  price_per_person: boolean
  group_size_minimum: number
  group_size_maximum: number | null
  age_requirement: string | null
}

export type AnyListing = Tour | TravelService | CarRental | AdventureActivity

// Normalized shape used for browse/search cards across all 4 listing types
export interface ListingCard {
  id: string
  type: ListingType
  title: string
  slug: string
  short_description: string | null
  primary_image_url: string | null
  location: string
  price: number
  price_label: string
  currency: string
  rating: number
  total_reviews: number
  is_featured: boolean
  tenant_id: string
  business_name?: string
}

export interface Booking {
  id: string
  tenant_id: string
  listing_id: string
  listing_type: ListingType
  customer_name: string
  customer_email: string
  customer_phone: string | null
  booking_date: string
  start_date: string
  end_date: string | null
  number_of_participants: number
  total_amount: number
  currency: string
  status: BookingStatus
  special_requests: string | null
  notes: string | null
  payment_method: string | null
  payment_reference: string | null
  payment_status: PaymentStatus
  created_at: string
  updated_at: string
}
