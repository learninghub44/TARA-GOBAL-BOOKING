import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/rbac/utils'
import { requireTenant } from '@/lib/tenant/utils'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const user = await requireTenantAuth()
    const tenant = await requireTenant(user)

    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get('page_size') || '20', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const supabase = createAdminClient()
    const { data, error, count } = await supabase
      .from('payments')
      .select('*, payment_refunds(id, amount, status, created_at)', { count: 'exact' })
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching vendor payments:', error)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    return NextResponse.json({
      payments: data,
      pagination: { page, page_size: pageSize, total: count ?? 0 },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('tenant') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
