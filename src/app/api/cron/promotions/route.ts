import { NextRequest, NextResponse } from 'next/server'
import { expirePromotions } from '@/lib/promotions/service'

/**
 * Scheduled job (call daily via Vercel Cron / Railway cron / GitHub Action)
 * with header `x-cron-secret: $CRON_SECRET`. Expires promotions and
 * advertisements past their end_date, clears any is_featured flag no
 * longer covered by an active promotion, and logs a promotion_event.
 */
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await expirePromotions()
  return NextResponse.json(result)
}
