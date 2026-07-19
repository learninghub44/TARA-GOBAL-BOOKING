import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdminRole } from '@/lib/rbac/utils'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdminRole(['kyc_admin'])

    const params = request.nextUrl.searchParams
    const status = params.get('status') || 'pending'
    const page = Math.max(1, parseInt(params.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(params.get('page_size') || '25', 10)))

    const supabase = createAdminClient()
    let query = supabase
      .from('tenants')
      .select(
        'id, business_name, business_slug, business_email, business_phone, business_country, registration_number, tax_id, verification_status, kyc_provider, kyc_reference_id, kyc_completed_at, kyc_notes, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (status !== 'all') query = query.eq('verification_status', status)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching KYC queue:', error)
      return NextResponse.json({ error: 'Failed to fetch KYC queue' }, { status: 500 })
    }

    return NextResponse.json({
      tenants: data,
      pagination: { page, page_size: pageSize, total: count ?? 0 },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
