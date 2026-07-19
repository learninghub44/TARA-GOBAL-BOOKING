import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/utils'
import { requireTenant } from '@/lib/tenant/utils'
import { tableForType } from '@/lib/listings/queries'
import type { ListingType } from '@/types/listings'

const VALID_TYPES: ListingType[] = ['tour', 'travel_service', 'car_rental', 'adventure']

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...fields } = body

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid listing type' }, { status: 400 })
    }
    if (!fields.title || !fields.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    const user = await requirePermission(type === 'tour' ? 'tours' : type === 'travel_service' ? 'travel_services' : type === 'car_rental' ? 'car_rentals' : 'adventure_activities', 'create')
    const tenant = await requireTenant(user)

    const supabase = await createClient()
    const table = tableForType(type)

    const baseSlug = slugify(fields.title)
    let slug = baseSlug
    let attempt = 0
    while (attempt < 5) {
      const { data: existing } = await supabase.from(table).select('id').eq('slug', slug).maybeSingle()
      if (!existing) break
      attempt++
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
    }

    const row: Record<string, unknown> = {
      tenant_id: tenant.id,
      created_by: user.id,
      title: fields.title,
      slug,
      description: fields.description,
      short_description: fields.short_description || null,
      primary_image_url: fields.primary_image_url || null,
      currency: fields.currency || 'USD',
      is_active: false,
      listing_status: 'draft',
    }

    if (type === 'tour') {
      Object.assign(row, {
        destination_country: fields.destination_country,
        destination_city: fields.destination_city || null,
        duration_days: Number(fields.duration_days) || 1,
        max_group_size: fields.max_group_size ? Number(fields.max_group_size) : null,
        difficulty_level: fields.difficulty_level || null,
        base_price: Number(fields.base_price) || 0,
        price_per_person: fields.price_per_person !== false,
      })
    } else if (type === 'travel_service') {
      Object.assign(row, {
        service_type: fields.service_type || 'general',
        destination_country: fields.destination_country,
        destination_city: fields.destination_city || null,
        base_price: Number(fields.base_price) || 0,
        price_per_unit: fields.price_per_unit || null,
      })
    } else if (type === 'car_rental') {
      Object.assign(row, {
        vehicle_type: fields.vehicle_type || 'sedan',
        make: fields.make || null,
        model: fields.model || null,
        year: fields.year ? Number(fields.year) : null,
        seating_capacity: fields.seating_capacity ? Number(fields.seating_capacity) : null,
        transmission_type: fields.transmission_type || null,
        fuel_type: fields.fuel_type || null,
        location_country: fields.location_country,
        location_city: fields.location_city || null,
        pickup_location: fields.pickup_location || null,
        daily_rate: Number(fields.daily_rate) || 0,
        minimum_rental_days: fields.minimum_rental_days ? Number(fields.minimum_rental_days) : 1,
      })
    } else if (type === 'adventure') {
      Object.assign(row, {
        activity_type: fields.activity_type || 'general',
        difficulty_level: fields.difficulty_level || null,
        duration_hours: fields.duration_hours ? Number(fields.duration_hours) : null,
        location_country: fields.location_country,
        location_city: fields.location_city || null,
        base_price: Number(fields.base_price) || 0,
        price_per_person: fields.price_per_person !== false,
        group_size_minimum: fields.group_size_minimum ? Number(fields.group_size_minimum) : 1,
        group_size_maximum: fields.group_size_maximum ? Number(fields.group_size_maximum) : null,
      })
    }

    const { data: listing, error } = await supabase.from(table).insert(row).select().single()

    if (error) {
      console.error('Listing creation error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ listing })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    const status = message === 'Unauthorized' ? 401 : message.includes('permission') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
