import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/utils'
import { requireTenant } from '@/lib/tenant/utils'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ACTIONS = ['pause', 'resume', 'cancel'] as const
type Action = (typeof ALLOWED_ACTIONS)[number]

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await requirePermission('promotions', 'read')
    const tenant = await requireTenant(user)

    const supabase = createAdminClient()
    const { data: promotion, error } = await supabase
      .from('vendor_promotions')
      .select('*, promotion_packages(name, slug, promotion_type, duration_days), featured_listings(*)')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    if (error || !promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    return NextResponse.json({ promotion })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('permission') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const action = body.action as Action

    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `action must be one of: ${ALLOWED_ACTIONS.join(', ')}` }, { status: 400 })
    }

    const user = await requirePermission('promotions', 'cancel')
    const tenant = await requireTenant(user)

    const supabase = createAdminClient()
    const { data: promotion, error: fetchError } = await supabase
      .from('vendor_promotions')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    if (fetchError || !promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    if (action === 'pause') {
      if (promotion.status !== 'active') {
        return NextResponse.json({ error: 'Only active promotions can be paused' }, { status: 400 })
      }
      await supabase.from('vendor_promotions').update({ status: 'paused' }).eq('id', id)
      await supabase.from('featured_listings').update({ status: 'paused' }).eq('vendor_promotion_id', id)
    } else if (action === 'resume') {
      if (promotion.status !== 'paused') {
        return NextResponse.json({ error: 'Only paused promotions can be resumed' }, { status: 400 })
      }
      await supabase.from('vendor_promotions').update({ status: 'active' }).eq('id', id)
      await supabase.from('featured_listings').update({ status: 'active' }).eq('vendor_promotion_id', id)
    } else if (action === 'cancel') {
      if (promotion.status === 'cancelled' || promotion.status === 'expired') {
        return NextResponse.json({ error: 'Promotion already cancelled or expired' }, { status: 400 })
      }
      await supabase.from('vendor_promotions').update({ status: 'cancelled' }).eq('id', id)
      await supabase.from('featured_listings').update({ status: 'cancelled' }).eq('vendor_promotion_id', id)

      if (promotion.listing_id && promotion.listing_type) {
        const { tableForType } = await import('@/lib/listings/queries')
        const { data: stillActive } = await supabase
          .from('vendor_promotions')
          .select('id')
          .eq('listing_id', promotion.listing_id)
          .eq('listing_type', promotion.listing_type)
          .eq('status', 'active')
          .neq('id', id)
          .limit(1)

        if (!stillActive || stillActive.length === 0) {
          const table = tableForType(promotion.listing_type)
          await supabase.from(table).update({ is_featured: false }).eq('id', promotion.listing_id)
        }
      }
    }

    await supabase.from('audit_logs').insert({
      tenant_id: tenant.id,
      user_id: user.id,
      action: `promotion.${action}`,
      table_name: 'vendor_promotions',
      record_id: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('permission') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
