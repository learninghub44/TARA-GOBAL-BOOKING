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
    await supabase.rpc('increment_advertisement_clicks', { p_ad_id: id })

    return NextResponse.json({ success: true, landing_url: ad.landing_url })
  } catch (error) {
    console.error('Ad click tracking error:', error)
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 })
  }
}
