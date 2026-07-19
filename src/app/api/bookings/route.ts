import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getListingById, listingPrice, tableForType } from '@/lib/listings/queries'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import type { ListingType } from '@/types/listings'

const VALID_TYPES: ListingType[] = ['tour', 'travel_service', 'car_rental', 'adventure']

export async function POST(request: NextRequest) {
  // Public, unauthenticated endpoint -- rate limit by IP to stop booking spam / DoS.
  const limited = await enforceRateLimit(request, { name: 'bookings:create', max: 5, windowSeconds: 60 })
  if (limited) return limited

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const {
      listing_id,
      listing_type,
      customer_name,
      customer_email,
      customer_phone,
      start_date,
      end_date,
      number_of_participants,
      special_requests,
    } = body

    if (!listing_id || !listing_type || !customer_name || !customer_email || !start_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof customer_name !== 'string' || typeof customer_email !== 'string') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (customer_name.length > 200 || (special_requests && String(special_requests).length > 2000)) {
      return NextResponse.json({ error: 'Field too long' }, { status: 400 })
    }

    if (!VALID_TYPES.includes(listing_type)) {
      return NextResponse.json({ error: 'Invalid listing type' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customer_email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Re-fetch listing server-side so the price/tenant cannot be spoofed by the client
    const listing = await getListingById(listing_type, listing_id)
    if (!listing || !listing.is_active || listing.listing_status !== 'active') {
      return NextResponse.json({ error: 'Listing is not available' }, { status: 404 })
    }

    const participants = Math.min(1000, Math.max(1, Number(number_of_participants) || 1))
    const unitPrice = listingPrice(listing_type, listing)

    let totalAmount = unitPrice
    if (listing_type === 'car_rental') {
      const start = new Date(start_date)
      const end = new Date(end_date || start_date)
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
      totalAmount = unitPrice * days
    } else if (
      (listing_type === 'tour' || listing_type === 'adventure') &&
      (listing as { price_per_person?: boolean }).price_per_person
    ) {
      totalAmount = unitPrice * participants
    }

    const supabase = createAdminClient()

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        tenant_id: listing.tenant_id,
        listing_id,
        listing_type,
        customer_name,
        customer_email,
        customer_phone: customer_phone || null,
        booking_date: new Date().toISOString(),
        start_date,
        end_date: end_date || null,
        number_of_participants: participants,
        total_amount: totalAmount,
        currency: listing.currency || 'USD',
        status: 'pending',
        special_requests: special_requests || null,
        payment_status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Booking insert error:', error.message)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // Best-effort bump of total_bookings counter on the listing
    await supabase
      .from(tableForType(listing_type))
      .update({ total_bookings: (listing.total_bookings || 0) + 1 })
      .eq('id', listing_id)

    return NextResponse.json({ booking })
  } catch (err) {
    console.error('Booking creation error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
