import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit, getClientIdentifier } from '@/lib/security/rate-limit'

const VALID_VOTE_TYPES = ['helpful', 'not_helpful'] as const
type VoteType = (typeof VALID_VOTE_TYPES)[number]

/** Anonymous voters are identified by a salted hash of their IP, so we never store raw IPs. */
function voterIdentifierFor(request: NextRequest): string {
  const ip = getClientIdentifier(request)
  return createHash('sha256').update(`review-vote:${ip}`).digest('hex')
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, { name: 'reviews:vote', max: 20, windowSeconds: 60 })
  if (limited) return limited

  try {
    const { id: reviewId } = await params
    const body = await request.json().catch(() => null)
    const voteType = body?.vote_type

    if (!voteType || !VALID_VOTE_TYPES.includes(voteType)) {
      return NextResponse.json({ error: 'vote_type must be "helpful" or "not_helpful"' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: review } = await supabase.from('reviews').select('id').eq('id', reviewId).maybeSingle()
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const voterIdentifier = voterIdentifierFor(request)

    // Upsert: a voter can change their mind, but only ever has one vote per review.
    const { error } = await supabase
      .from('review_votes')
      .upsert(
        { review_id: reviewId, voter_identifier: voterIdentifier, vote_type: voteType as VoteType },
        { onConflict: 'review_id,voter_identifier' }
      )

    if (error) {
      console.error('Review vote error:', error)
      return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
    }

    const { data: updated } = await supabase
      .from('reviews')
      .select('helpful_count, not_helpful_count')
      .eq('id', reviewId)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      helpful_count: updated?.helpful_count ?? 0,
      not_helpful_count: updated?.not_helpful_count ?? 0,
    })
  } catch (error) {
    console.error('Review vote error:', error)
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }
}
