import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const supabase = createAdminClient()

    const { data: ad } = await supabase.from('advertisements').select('id, status, landing_url').eq('id', id).maybeSingle()
    if (!ad || ad.status !== 'active') {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 })
    }

    await supabase.from('advertisement_clicks').insert({
      advertisement_id: id,
      listing_id: body.listing_id || null,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      user_agent: request.headers.get('user-agent') || null,
      referrer: request.headers.get('referer') || null,
    })
    const { data: result } = await supabase.rpc('record_advertisement_click', { p_ad_id: id })
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

    return NextResponse.json({ success: true, landing_url: ad.landing_url })
  } catch (error) {
    console.error('Ad click tracking error:', error)
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 })
  }
}
