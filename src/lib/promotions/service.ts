import { createAdminClient } from '@/lib/supabase/admin'
import { tableForType } from '@/lib/listings/queries'
import { initializePaymentWithFallback, type PaymentProvider } from '@/lib/payments/service'
import { getPackageBySlug } from '@/lib/promotions/packages'
import type { UserContext } from '@/lib/rbac/utils'
import type { TenantContext } from '@/lib/tenant/utils'
import type { ListingType } from '@/types/listings'

export interface PurchasePromotionRequest {
  package_slug: string
  listing_id?: string
  listing_type?: ListingType
  destination_page_id?: string
  advertisement_id?: string
  provider?: PaymentProvider
  phone_number?: string
  callback_origin: string
}

export interface PurchasePromotionResult {
  success: boolean
  vendor_promotion_id?: string
  reference?: string
  provider?: PaymentProvider
  payment_url?: string
  requires_phone_confirmation?: boolean
  error?: string
}

const LISTING_SCOPED_TYPES = new Set([
  'featured_listing',
  'sponsored_listing',
  'premium_listing',
  'category_featured',
  'trending_listing',
  'editors_pick',
])

const DESTINATION_SCOPED_TYPES = new Set(['destination_featured'])

// Promotion types that run against a vendor-created advertisements row
// (draft created via /api/vendor/advertisements) rather than a listing.
export const AD_SCOPED_TYPES = new Set([
  'banner_advertisement',
  'newsletter_promotion',
  'search_promotion',
])

/**
 * Vendor purchases a promotional product. Mirrors the subscription checkout
 * flow: create the record in 'pending' state, kick off payment via the
 * existing multi-provider payment service, and let the payment webhook
 * (see processPaymentWebhook hook in lib/payments/service.ts) flip it to
 * 'active' once the payment settles. Never touches booking flow, never
 * charges the customer, never creates a wallet.
 */
export async function purchasePromotion(
  user: UserContext,
  tenant: TenantContext,
  req: PurchasePromotionRequest
): Promise<PurchasePromotionResult> {
  const pkg = await getPackageBySlug(req.package_slug)
  if (!pkg) {
    return { success: false, error: 'Invalid or inactive promotion package' }
  }

  if (LISTING_SCOPED_TYPES.has(pkg.promotion_type)) {
    if (!req.listing_id || !req.listing_type) {
      return { success: false, error: 'listing_id and listing_type are required for this promotion type' }
    }
  }
  if (DESTINATION_SCOPED_TYPES.has(pkg.promotion_type) && !req.destination_page_id) {
    return { success: false, error: 'destination_page_id is required for this promotion type' }
  }
  if (AD_SCOPED_TYPES.has(pkg.promotion_type) && !req.advertisement_id) {
    return { success: false, error: 'advertisement_id is required for this promotion type' }
  }

  const supabase = createAdminClient()

  // Ownership check: the listing being promoted must belong to this tenant.
  if (req.listing_id && req.listing_type) {
    const table = tableForType(req.listing_type)
    const { data: listing } = await supabase
      .from(table)
      .select('id, tenant_id')
      .eq('id', req.listing_id)
      .maybeSingle()

    if (!listing || listing.tenant_id !== tenant.id) {
      return { success: false, error: 'Listing not found for this vendor' }
    }
  }

  // Ownership + state check: the advertisement must belong to this tenant
  // and still be a draft (an ad can only be paid for once, and only before
  // it's already running or awaiting review under another campaign).
  if (req.advertisement_id) {
    const { data: ad } = await supabase
      .from('advertisements')
      .select('id, tenant_id, status')
      .eq('id', req.advertisement_id)
      .maybeSingle()

    if (!ad || ad.tenant_id !== tenant.id) {
      return { success: false, error: 'Advertisement not found for this vendor' }
    }
    if (ad.status !== 'draft') {
      return { success: false, error: 'Only draft advertisements can be submitted for payment' }
    }
  }

  const { data: promotion, error: promoError } = await supabase
    .from('vendor_promotions')
    .insert({
      tenant_id: tenant.id,
      package_id: pkg.id,
      promotion_type: pkg.promotion_type,
      placement: pkg.placement,
      listing_id: req.listing_id || null,
      listing_type: req.listing_type || null,
      destination_page_id: req.destination_page_id || null,
      advertisement_id: req.advertisement_id || null,
      status: 'pending',
      cost: pkg.price,
      currency: pkg.currency,
      created_by: user.id,
    })
    .select()
    .single()

  if (promoError || !promotion) {
    console.error('Error creating vendor promotion:', promoError)
    return { success: false, error: 'Failed to create promotion record' }
  }

  if (req.advertisement_id) {
    // Link back from the ad so it can be found/managed via its own campaign
    // record, and mark it as awaiting payment so it can't be resubmitted.
    await supabase
      .from('advertisements')
      .update({ vendor_promotion_id: promotion.id, status: 'pending_review' })
      .eq('id', req.advertisement_id)
  }

  const payment = await initializePaymentWithFallback(
    {
      amount: pkg.price,
      currency: pkg.currency,
      email: user.email,
      phone_number: req.phone_number || undefined,
      description: `TARA promotion — ${pkg.name} — ${tenant.business_name}`,
      tenant_id: tenant.id,
      business_id: tenant.id,
      callback_url: `${req.callback_origin}/vendor/promotions/callback`,
    },
    req.provider ? [req.provider] : undefined
  )

  if (!payment.success) {
    // Leave the promotion row 'pending' — vendor can retry the purchase flow.
    return { success: false, error: payment.error || 'Payment could not be initialized on any provider', vendor_promotion_id: promotion.id }
  }

  // Link the payment row to this promotion so the webhook hook can activate it.
  await supabase
    .from('payments')
    .update({ promotion_id: promotion.id })
    .eq('transaction_reference', payment.reference)

  await supabase.from('promotion_payments').insert({
    vendor_promotion_id: promotion.id,
    tenant_id: tenant.id,
    amount: pkg.price,
    currency: pkg.currency,
    status: 'pending',
  })

  return {
    success: true,
    vendor_promotion_id: promotion.id,
    reference: payment.reference,
    provider: payment.provider,
    payment_url: payment.payment_url,
    requires_phone_confirmation: payment.provider === 'mpesa',
  }
}

/**
 * Called from the payment webhook hook once a promotion payment settles.
 * Activates the campaign, sets its window, and (for listing-scoped types)
 * materializes a featured_listings row and flips the listing's is_featured
 * flag so existing browse/search queries pick it up with no other changes.
 */
export async function activatePromotion(promotionId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: promotion, error } = await supabase
    .from('vendor_promotions')
    .select('*, promotion_packages(duration_days)')
    .eq('id', promotionId)
    .single()

  if (error || !promotion) {
    console.error('activatePromotion: promotion not found', promotionId, error)
    return
  }
  if (promotion.status === 'active') return // idempotent

  const durationDays = promotion.promotion_packages?.duration_days || 7
  const startDate = new Date()
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000)

  await supabase
    .from('vendor_promotions')
    .update({
      status: 'active',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      approved_at: startDate.toISOString(),
    })
    .eq('id', promotionId)

  if (promotion.listing_id && promotion.listing_type) {
    await supabase.from('featured_listings').insert({
      vendor_promotion_id: promotion.id,
      tenant_id: promotion.tenant_id,
      listing_id: promotion.listing_id,
      listing_type: promotion.listing_type,
      placement: promotion.placement || 'homepage',
      status: 'active',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    })

    const table = tableForType(promotion.listing_type as ListingType)
    await supabase.from(table).update({ is_featured: true }).eq('id', promotion.listing_id)
  }

  if (promotion.advertisement_id) {
    await supabase
      .from('advertisements')
      .update({
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        approved_at: startDate.toISOString(),
      })
      .eq('id', promotion.advertisement_id)

    await supabase.from('promotion_events').insert({
      tenant_id: promotion.tenant_id,
      vendor_promotion_id: promotion.id,
      advertisement_id: promotion.advertisement_id,
      event_type: 'advertisement_approved',
      message: 'Your advertisement campaign is now live.',
    })
  }

  if (promotion.promotion_type === 'premium_badge') {
    await supabase.from('vendor_badges').insert({
      tenant_id: promotion.tenant_id,
      badge_type: 'premium_partner',
      label: 'Premium Partner',
      awarded_at: startDate.toISOString(),
      expires_at: endDate.toISOString(),
    })
  }

  await supabase.from('promotion_payments').update({ status: 'completed' }).eq('vendor_promotion_id', promotion.id)

  await supabase.from('promotion_invoices').insert({
    vendor_promotion_id: promotion.id,
    tenant_id: promotion.tenant_id,
    amount: promotion.cost,
    currency: promotion.currency,
    status: 'completed',
    paid_at: startDate.toISOString(),
  })

  await supabase.from('promotion_events').insert({
    tenant_id: promotion.tenant_id,
    vendor_promotion_id: promotion.id,
    event_type: 'promotion_approved',
    message: `Your ${promotion.promotion_type.replace(/_/g, ' ')} promotion is now live.`,
  })

  await supabase.from('audit_logs').insert({
    tenant_id: promotion.tenant_id,
    action: 'promotion.activated',
    table_name: 'vendor_promotions',
    record_id: promotion.id,
  })
}

/**
 * Called from the payment webhook hook when a promotion payment fails.
 */
export async function markPromotionPaymentFailed(promotionId: string): Promise<void> {
  const supabase = createAdminClient()
  const { data: promotion } = await supabase
    .from('vendor_promotions')
    .select('id, advertisement_id')
    .eq('id', promotionId)
    .maybeSingle()

  await supabase.from('vendor_promotions').update({ status: 'rejected', rejected_reason: 'Payment failed' }).eq('id', promotionId)
  await supabase.from('promotion_payments').update({ status: 'failed' }).eq('vendor_promotion_id', promotionId)

  if (promotion?.advertisement_id) {
    // Send the ad back to draft (not 'rejected') so the vendor can simply
    // retry payment on the same campaign instead of recreating it.
    await supabase
      .from('advertisements')
      .update({ status: 'draft', vendor_promotion_id: null })
      .eq('id', promotion.advertisement_id)
  }
}

/**
 * Daily sweep (see /api/cron/promotions): expires anything past its
 * end_date, clears the is_featured flag it set, and logs an event.
 */
export async function expirePromotions(): Promise<{ expired: number }> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data: expiring } = await supabase
    .from('vendor_promotions')
    .select('id, tenant_id, listing_id, listing_type, promotion_type')
    .eq('status', 'active')
    .lt('end_date', now)

  let count = 0
  for (const promo of expiring || []) {
    await supabase.from('vendor_promotions').update({ status: 'expired' }).eq('id', promo.id)
    await supabase
      .from('featured_listings')
      .update({ status: 'expired' })
      .eq('vendor_promotion_id', promo.id)

    if (promo.listing_id && promo.listing_type) {
      // Only clear is_featured if no other active promotion covers this listing.
      const { data: stillActive } = await supabase
        .from('vendor_promotions')
        .select('id')
        .eq('listing_id', promo.listing_id)
        .eq('listing_type', promo.listing_type)
        .eq('status', 'active')
        .limit(1)

      if (!stillActive || stillActive.length === 0) {
        const table = tableForType(promo.listing_type as ListingType)
        await supabase.from(table).update({ is_featured: false }).eq('id', promo.listing_id)
      }
    }

    await supabase.from('promotion_events').insert({
      tenant_id: promo.tenant_id,
      vendor_promotion_id: promo.id,
      event_type: 'promotion_expired',
      message: `Your ${promo.promotion_type.replace(/_/g, ' ')} promotion has expired.`,
    })

    await supabase.from('audit_logs').insert({
      tenant_id: promo.tenant_id,
      action: 'promotion.expired',
      table_name: 'vendor_promotions',
      record_id: promo.id,
    })
    count++
  }

  // Advertisements share the same expiry rule.
  const { data: expiringAds } = await supabase
    .from('advertisements')
    .select('id, tenant_id')
    .eq('status', 'active')
    .lt('end_date', now)

  for (const ad of expiringAds || []) {
    await supabase.from('advertisements').update({ status: 'expired' }).eq('id', ad.id)
    await supabase.from('promotion_events').insert({
      tenant_id: ad.tenant_id,
      advertisement_id: ad.id,
      event_type: 'advertisement_expired',
      message: 'Your advertisement campaign has expired.',
    })
  }

  return { expired: count }
}
