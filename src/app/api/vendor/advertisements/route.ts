import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/utils'
import { requireActiveSubscription } from '@/lib/tenant/utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActivePackages } from '@/lib/promotions/packages'
import { AD_SCOPED_TYPES } from '@/lib/promotions/service'

const VALID_AD_TYPES = [
  'homepage_banner',
  'sidebar_banner',
  'category_banner',
  'destination_banner',
  'search_promotion',
  'newsletter_promotion',
  'popup_promotion',
  'sponsored_search',
] as const

/**
 * List the vendor's own advertisement campaigns, plus the promotion
 * packages that can be used to pay for a draft one (mirrors the
 * `packages` field returned by GET /api/vendor/promotions).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('advertisements', 'read')
    const tenant = await requireActiveSubscription(user)

    const params = request.nextUrl.searchParams
    const status = params.get('status')

    const supabase = createAdminClient()
    let query = supabase
      .from('advertisements')
      .select('*, vendor_promotions(id, status, package_id, start_date, end_date)')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data: advertisements, error } = await query
    if (error) {
      console.error('Error fetching vendor advertisements:', error)
      return NextResponse.json({ error: 'Failed to fetch advertisements' }, { status: 500 })
    }

    const packages = (await getActivePackages()).filter((pkg) => AD_SCOPED_TYPES.has(pkg.promotion_type))

    return NextResponse.json({ advertisements, packages })
  } catch (error) {
    console.error('Vendor advertisements list error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message === 'Unauthorized' ? 401 : message.includes('permission') ? 403 : message === 'Active subscription required' ? 402 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * Create a draft advertisement. Drafts aren't billed or shown anywhere —
 * a vendor fills in creative + targeting here, then pays for it via
 * POST /api/vendor/promotions/purchase with this row's id as
 * `advertisement_id`, which is what actually submits it for review.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      ad_type,
      title,
      description,
      image_url,
      video_url,
      cta_text,
      landing_url,
      budget,
      daily_cap,
      cost_per_click,
      cost_per_impression,
      target_categories,
      target_destinations,
      target_countries,
    } = body

    if (!ad_type || !VALID_AD_TYPES.includes(ad_type)) {
      return NextResponse.json({ error: `ad_type must be one of: ${VALID_AD_TYPES.join(', ')}` }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (!landing_url) {
      return NextResponse.json({ error: 'landing_url is required' }, { status: 400 })
    }
    for (const [field, value] of Object.entries({ budget, daily_cap, cost_per_click, cost_per_impression })) {
      if (value !== undefined && value !== null && (typeof value !== 'number' || value < 0)) {
        return NextResponse.json({ error: `${field} must be a non-negative number` }, { status: 400 })
      }
    }

    const user = await requirePermission('advertisements', 'create')
    const tenant = await requireActiveSubscription(user)

    const supabase = createAdminClient()
    const { data: advertisement, error } = await supabase
      .from('advertisements')
      .insert({
        tenant_id: tenant.id,
        ad_type,
        title,
        description: description || null,
        image_url: image_url || null,
        video_url: video_url || null,
        cta_text: cta_text || null,
        landing_url,
        budget: budget || null,
        daily_cap: daily_cap || null,
        cost_per_click: cost_per_click || null,
        cost_per_impression: cost_per_impression || null,
        target_categories: target_categories || null,
        target_destinations: target_destinations || null,
        target_countries: target_countries || null,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single()

    if (error || !advertisement) {
      console.error('Error creating advertisement:', error)
      return NextResponse.json({ error: 'Failed to create advertisement' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      tenant_id: tenant.id,
      user_id: user.id,
      action: 'advertisement.created',
      table_name: 'advertisements',
      record_id: advertisement.id,
    })

    return NextResponse.json({ advertisement })
  } catch (error) {
    console.error('Advertisement create error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message === 'Unauthorized' ? 401 : message.includes('permission') ? 403 : message === 'Active subscription required' ? 402 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
