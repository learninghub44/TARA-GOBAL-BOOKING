import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/rbac/utils'
import { requireTenant } from '@/lib/tenant/utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActivePackages } from '@/lib/promotions/packages'

export async function GET(request: NextRequest) {
  try {
    const user = await requireTenantAuth()
    const tenant = await requireTenant(user)

    const params = request.nextUrl.searchParams
    const status = params.get('status')

    const supabase = createAdminClient()
    let query = supabase
      .from('vendor_promotions')
      .select('*, promotion_packages(name, slug, promotion_type, duration_days), featured_listings(views, clicks, bookings_generated)')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data: promotions, error } = await query
    if (error) {
      console.error('Error fetching vendor promotions:', error)
      return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 })
    }

    const packages = await getActivePackages()

    return NextResponse.json({ promotions, packages })
  } catch (error) {
    console.error('Vendor promotions list error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('tenant') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
