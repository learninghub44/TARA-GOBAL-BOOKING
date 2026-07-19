import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/utils'
import { requireActiveSubscription } from '@/lib/tenant/utils'
import { purchasePromotion } from '@/lib/promotions/service'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import type { PaymentProvider } from '@/lib/payments/service'
import type { ListingType } from '@/types/listings'

const VALID_PROVIDERS: PaymentProvider[] = ['paystack', 'pesapal', 'mpesa']
const VALID_LISTING_TYPES: ListingType[] = ['tour', 'travel_service', 'car_rental', 'adventure']

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, { name: 'vendor:promotions:purchase', max: 10, windowSeconds: 60 })
  if (limited) return limited

  try {
    const body = await request.json()
    const { package_slug, listing_id, listing_type, destination_page_id, advertisement_id, provider, phone_number } = body

    if (!package_slug) {
      return NextResponse.json({ error: 'package_slug is required' }, { status: 400 })
    }
    if (listing_type && !VALID_LISTING_TYPES.includes(listing_type)) {
      return NextResponse.json({ error: 'Invalid listing_type' }, { status: 400 })
    }
    if (provider && !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 })
    }

    // Promotions are a paid growth product on top of an active subscription
    // (vendors must already be able to sell before they can promote).
    const user = await requirePermission('promotions', 'create')
    const tenant = await requireActiveSubscription(user)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

    const result = await purchasePromotion(user, tenant, {
      package_slug,
      listing_id,
      listing_type,
      destination_page_id,
      advertisement_id,
      provider,
      phone_number,
      callback_origin: appUrl,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, vendor_promotion_id: result.vendor_promotion_id },
        { status: 502 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Promotion purchase error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message === 'Unauthorized'
        ? 401
        : message.includes('permission')
        ? 403
        : message === 'Active subscription required'
        ? 402
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
