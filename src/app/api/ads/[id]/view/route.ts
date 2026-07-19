import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    await supabase.rpc('increment_advertisement_views', { p_ad_id: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ad view tracking error:', error)
    return NextResponse.json({ success: true })
  }
}
