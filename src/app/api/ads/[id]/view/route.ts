import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, { name: 'ads:view', max: 30, windowSeconds: 60 })
  if (limited) return limited

  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: ad } = await supabase.from('advertisements').select('id, status').eq('id', id).maybeSingle()
    if (!ad || ad.status !== 'active') {
      // Don't leak whether an id exists at all — just no-op.
      return NextResponse.json({ success: true })
    }

    await supabase.from('advertisement_views').insert({
      advertisement_id: id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      user_agent: request.headers.get('user-agent') || null,
    })
    const { data: result } = await supabase.rpc('record_advertisement_view', { p_ad_id: id })
    const justPaused = Array.isArray(result) ? result[0]?.just_paused : result?.just_paused

    if (justPaused) {
      const { data: paused } = await supabase.from('advertisements').select('tenant_id').eq('id', id).maybeSingle()
      if (paused) {
        await supabase.from('promotion_events').insert({
          tenant_id: paused.tenant_id,
          advertisement_id: id,
          event_type: 'advertisement_paused',
          message: 'Your advertisement was automatically paused after reaching its budget or daily spend cap.',
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ad view tracking error:', error)
    return NextResponse.json({ success: true })
  }
}
