import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/rbac/utils'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ACTIONS = ['approve', 'reject'] as const
type Action = (typeof ALLOWED_ACTIONS)[number]

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requirePlatformAdmin()

    const supabase = createAdminClient()
    const { data: promotion, error } = await supabase
      .from('vendor_promotions')
      .select('*, tenants(business_name, business_slug), promotion_packages(name, slug, promotion_type, duration_days), advertisements(*), featured_listings(*)')
      .eq('id', id)
      .maybeSingle()

    if (error || !promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    return NextResponse.json({ promotion })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const action = body.action as Action
    const reason = body.reason as string | undefined

    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `action must be one of: ${ALLOWED_ACTIONS.join(', ')}` }, { status: 400 })
    }
    if (action === 'reject' && !reason) {
      return NextResponse.json({ error: 'reason is required when rejecting' }, { status: 400 })
    }

    const admin = await requirePlatformAdmin()
    const supabase = createAdminClient()

    const { data: promotion, error: fetchError } = await supabase
      .from('vendor_promotions')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    if (action === 'approve') {
      const { activatePromotion } = await import('@/lib/promotions/service')
      await activatePromotion(id)
    } else {
      await supabase
        .from('vendor_promotions')
        .update({ status: 'rejected', rejected_reason: reason })
        .eq('id', id)

      if (promotion.advertisement_id) {
        await supabase
          .from('advertisements')
          .update({ status: 'rejected', rejected_reason: reason })
          .eq('id', promotion.advertisement_id)
      }

      await supabase.from('promotion_events').insert({
        tenant_id: promotion.tenant_id,
        vendor_promotion_id: id,
        advertisement_id: promotion.advertisement_id || null,
        event_type: 'promotion_rejected',
        message: `Your promotion was rejected: ${reason}`,
      })
    }

    await supabase.from('audit_logs').insert({
      tenant_id: promotion.tenant_id,
      user_id: admin.id,
      action: `admin.promotion_${action}d`,
      table_name: 'vendor_promotions',
      record_id: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
