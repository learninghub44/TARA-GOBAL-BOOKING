import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/rbac/utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { activatePromotion } from '@/lib/promotions/service'

const ALLOWED_ACTIONS = ['approve', 'reject'] as const
type Action = (typeof ALLOWED_ACTIONS)[number]

const MAX_IDS = 50

interface BulkResult {
  id: string
  success: boolean
  error?: string
}

/**
 * Bulk version of PATCH /api/admin/promotions/[id] — mainly for clearing
 * the ad-review queue (GET /api/admin/promotions?ad_scoped=true) without
 * clicking through campaigns one at a time. Each id is processed
 * independently; a failure on one doesn't stop the rest.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ids = body.ids as string[]
    const action = body.action as Action
    const reason = body.reason as string | undefined

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json({ error: `ids cannot exceed ${MAX_IDS} per request` }, { status: 400 })
    }
    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `action must be one of: ${ALLOWED_ACTIONS.join(', ')}` }, { status: 400 })
    }
    if (action === 'reject' && !reason) {
      return NextResponse.json({ error: 'reason is required when rejecting' }, { status: 400 })
    }

    const admin = await requirePlatformAdmin()
    const supabase = createAdminClient()
    const results: BulkResult[] = []

    for (const id of ids) {
      try {
        const { data: promotion } = await supabase.from('vendor_promotions').select('*').eq('id', id).maybeSingle()
        if (!promotion) {
          results.push({ id, success: false, error: 'Promotion not found' })
          continue
        }

        if (action === 'approve') {
          await activatePromotion(id)
        } else {
          await supabase.from('vendor_promotions').update({ status: 'rejected', rejected_reason: reason }).eq('id', id)
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

        results.push({ id, success: true })
      } catch (err) {
        console.error(`Bulk promotion ${action} error for`, id, err)
        results.push({ id, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      results,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
