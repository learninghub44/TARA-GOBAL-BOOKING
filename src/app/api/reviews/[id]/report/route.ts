import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'

const VALID_REASONS = ['spam', 'offensive', 'fake', 'irrelevant', 'other'] as const
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, { name: 'reviews:report', max: 10, windowSeconds: 60 })
  if (limited) return limited

  try {
    const { id: reviewId } = await params
    const body = await request.json().catch(() => null)
    const { reported_by_email, reason, details } = body ?? {}

    if (!reported_by_email || typeof reported_by_email !== 'string' || !EMAIL_REGEX.test(reported_by_email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: `reason must be one of: ${VALID_REASONS.join(', ')}` }, { status: 400 })
    }
    if (details && (typeof details !== 'string' || details.length > 1000)) {
      return NextResponse.json({ error: 'details must be under 1000 characters' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: review } = await supabase.from('reviews').select('id').eq('id', reviewId).maybeSingle()
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const { error } = await supabase.from('review_reports').insert({
      review_id: reviewId,
      reported_by_email,
      reason,
      details: details || null,
    })

    if (error) {
      // Unique violation means this email already reported this review for this reason -- treat as success.
      if (error.code === '23505') {
        return NextResponse.json({ success: true, already_reported: true })
      }
      console.error('Review report error:', error)
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Review report error:', error)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
