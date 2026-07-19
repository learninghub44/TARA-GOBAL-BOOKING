import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'

const VALID_AD_TYPES = [
  'homepage_banner',
  'sidebar_banner',
  'category_banner',
  'destination_banner',
  'search_promotion',
  'newsletter_promotion',
  'popup_promotion',
  'sponsored_search',
] as const

const PUBLIC_FIELDS =
  'id, ad_type, title, description, image_url, video_url, cta_text, landing_url, target_categories, target_destinations, target_countries'

/**
 * Public, unauthenticated: serve active ads for a placement (`ad_type`),
 * optionally narrowed by category/destination/country. An ad with no
 * targeting on a given dimension is treated as eligible everywhere on
 * that dimension — only ads that explicitly target *other* values are
 * excluded.
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, { name: 'ads:list', max: 60, windowSeconds: 60 })
  if (limited) return limited

  try {
    const params = request.nextUrl.searchParams
    const adType = params.get('placement') || params.get('ad_type')
    const category = params.get('category')
    const destination = params.get('destination')
    const country = params.get('country')
    const limit = Math.min(Number(params.get('limit')) || 3, 10)

    if (!adType || !VALID_AD_TYPES.includes(adType as (typeof VALID_AD_TYPES)[number])) {
      return NextResponse.json({ error: `placement must be one of: ${VALID_AD_TYPES.join(', ')}` }, { status: 400 })
    }

    const supabase = createAdminClient()
    const now = new Date().toISOString()

    const { data: candidates, error } = await supabase
      .from('advertisements')
      .select(PUBLIC_FIELDS)
      .eq('ad_type', adType)
      .eq('status', 'active')
      .lte('start_date', now)
      .gte('end_date', now)
      .limit(50)

    if (error) {
      console.error('Error fetching ads:', error)
      return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 })
    }

    const matches = (candidates || []).filter((ad) => {
      const categoryOk = !category || !ad.target_categories?.length || ad.target_categories.includes(category)
      const destinationOk = !destination || !ad.target_destinations?.length || ad.target_destinations.includes(destination)
      const countryOk = !country || !ad.target_countries?.length || ad.target_countries.includes(country)
      return categoryOk && destinationOk && countryOk
    })

    // Shuffle so limited ad slots rotate evenly across advertisers rather
    // than always favoring whichever row Postgres happened to return first.
    for (let i = matches.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[matches[i], matches[j]] = [matches[j], matches[i]]
    }

    return NextResponse.json({ ads: matches.slice(0, limit) })
  } catch (error) {
    console.error('Ad serving error:', error)
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 })
  }
}
