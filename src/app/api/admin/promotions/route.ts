import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdminRole } from '@/lib/rbac/utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { AD_SCOPED_TYPES } from '@/lib/promotions/service'

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdminRole(['super_admin'])

    const params = request.nextUrl.searchParams
    const status = params.get('status')
    const promotionType = params.get('promotion_type')
    const tenantId = params.get('tenant_id')
    // Convenience filter for the ad-review queue: pending payments on
    // banner/newsletter/search campaigns awaiting a creative review.
    const adScoped = params.get('ad_scoped') === 'true'
    const page = Math.max(1, parseInt(params.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(params.get('page_size') || '25', 10)))

    const supabase = createAdminClient()
    let query = supabase
      .from('vendor_promotions')
      .select('*, tenants(business_name, business_slug), promotion_packages(name, slug), advertisements(*)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (promotionType) query = query.eq('promotion_type', promotionType)
    if (tenantId) query = query.eq('tenant_id', tenantId)
    if (adScoped) query = query.in('promotion_type', Array.from(AD_SCOPED_TYPES))

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching promotions (admin):', error)
      return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 })
    }

    // Revenue rollup for the admin dashboard's "Promotion Revenue" card.
    const { data: revenueRows } = await supabase
      .from('vendor_promotions')
      .select('cost')
      .in('status', ['active', 'expired'])

    const totalRevenue = (revenueRows || []).reduce((sum, r) => sum + Number(r.cost || 0), 0)

    return NextResponse.json({
      promotions: data,
      pagination: { page, page_size: pageSize, total: count ?? 0 },
      total_revenue: totalRevenue,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
