import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/utils'
import { requireTenant } from '@/lib/tenant/utils'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ACTIONS = ['pause', 'resume', 'cancel'] as const
type Action = (typeof ALLOWED_ACTIONS)[number]

const DRAFT_ONLY_FIELDS = [
  'title',
  'description',
  'image_url',
  'video_url',
  'cta_text',
  'landing_url',
  'target_categories',
  'target_destinations',
  'target_countries',
] as const

// Spend controls stay editable at any campaign status — a vendor needs to
// be able to raise a budget/daily_cap (or adjust their bid) on a running
// campaign, especially one that auto-paused after hitting a cap.
const SPEND_CONTROL_FIELDS = ['budget', 'daily_cap', 'cost_per_click', 'cost_per_impression'] as const

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await requirePermission('advertisements', 'read')
    const tenant = await requireTenant(user)

    const supabase = createAdminClient()
    const { data: advertisement, error } = await supabase
      .from('advertisements')
      .select('*, vendor_promotions(id, status, package_id, start_date, end_date, cost, currency)')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    if (error || !advertisement) {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 })
    }

    return NextResponse.json({ advertisement })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('permission') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * Two modes, same as /api/vendor/promotions/[id]:
 *  - body.action: 'pause' | 'resume' | 'cancel' — lifecycle transition on a
 *    campaign that's already active/paused (mirrors the linked vendor
 *    promotion so billing status and ad delivery never disagree).
 *  - otherwise: a content edit, only allowed while the ad is still a draft
 *    (once it's paid for and under review/live, creative changes should go
 *    through a fresh draft + purchase rather than mutating a running ad).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const user = await requirePermission('advertisements', 'update')
    const tenant = await requireTenant(user)

    const supabase = createAdminClient()
    const { data: advertisement, error: fetchError } = await supabase
      .from('advertisements')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    if (fetchError || !advertisement) {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 })
    }

    if (body.action) {
      const action = body.action as Action
      if (!ALLOWED_ACTIONS.includes(action)) {
        return NextResponse.json({ error: `action must be one of: ${ALLOWED_ACTIONS.join(', ')}` }, { status: 400 })
      }

      if (action === 'pause') {
        if (advertisement.status !== 'active') {
          return NextResponse.json({ error: 'Only active advertisements can be paused' }, { status: 400 })
        }
        await supabase.from('advertisements').update({ status: 'paused' }).eq('id', id)
        if (advertisement.vendor_promotion_id) {
          await supabase.from('vendor_promotions').update({ status: 'paused' }).eq('id', advertisement.vendor_promotion_id)
        }
      } else if (action === 'resume') {
        if (advertisement.status !== 'paused') {
          return NextResponse.json({ error: 'Only paused advertisements can be resumed' }, { status: 400 })
        }
        await supabase.from('advertisements').update({ status: 'active' }).eq('id', id)
        if (advertisement.vendor_promotion_id) {
          await supabase.from('vendor_promotions').update({ status: 'active' }).eq('id', advertisement.vendor_promotion_id)
        }
      } else if (action === 'cancel') {
        if (advertisement.status === 'expired' || advertisement.status === 'rejected') {
          return NextResponse.json({ error: 'Advertisement already stopped' }, { status: 400 })
        }
        await supabase.from('advertisements').update({ status: 'rejected', rejected_reason: 'Cancelled by vendor' }).eq('id', id)
        if (advertisement.vendor_promotion_id) {
          await supabase.from('vendor_promotions').update({ status: 'cancelled' }).eq('id', advertisement.vendor_promotion_id)
        }
      }

      await supabase.from('audit_logs').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        action: `advertisement.${action}`,
        table_name: 'advertisements',
        record_id: id,
      })

      return NextResponse.json({ success: true })
    }

    // Edit path: spend controls (budget/daily_cap/rates) are editable at any
    // status; creative/targeting fields only while still a draft.
    const updates: Record<string, unknown> = {}
    for (const field of SPEND_CONTROL_FIELDS) {
      if (field in body) updates[field] = body[field]
    }
    for (const field of DRAFT_ONLY_FIELDS) {
      if (field in body) {
        if (advertisement.status !== 'draft') {
          return NextResponse.json({ error: `${field} can only be edited while the advertisement is a draft` }, { status: 400 })
        }
        updates[field] = body[field]
      }
    }
    for (const [field, value] of Object.entries(updates)) {
      if (SPEND_CONTROL_FIELDS.includes(field as (typeof SPEND_CONTROL_FIELDS)[number])) {
        if (value !== null && value !== undefined && (typeof value !== 'number' || value < 0)) {
          return NextResponse.json({ error: `${field} must be a non-negative number` }, { status: 400 })
        }
      }
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('advertisements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('Error updating advertisement:', updateError)
      return NextResponse.json({ error: 'Failed to update advertisement' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      tenant_id: tenant.id,
      user_id: user.id,
      action: 'advertisement.updated',
      table_name: 'advertisements',
      record_id: id,
    })

    return NextResponse.json({ advertisement: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('permission') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
