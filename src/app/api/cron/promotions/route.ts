import { NextRequest, NextResponse } from 'next/server'
import { expirePromotions } from '@/lib/promotions/service'
import { verifyCronSecret } from '@/lib/security/cron-auth'
import { enforceRateLimit } from '@/lib/security/rate-limit'

/**
 * Scheduled job (call daily via Vercel Cron / Railway cron / GitHub Action)
 * with header `x-cron-secret: $CRON_SECRET`. Expires promotions and
 * advertisements past their end_date, clears any is_featured flag no
 * longer covered by an active promotion, and logs a promotion_event.
 */
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, { name: 'cron:promotions', max: 10, windowSeconds: 60 })
  if (limited) return limited

  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await expirePromotions()
  return NextResponse.json(result)
}
