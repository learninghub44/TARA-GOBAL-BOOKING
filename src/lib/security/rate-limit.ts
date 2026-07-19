import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logSecurityEvent } from '@/lib/audit/logger'

export interface RateLimitConfig {
  /** Unique name for this limiter, e.g. 'bookings:create'. Used as part of the storage key. */
  name: string
  /** Max requests allowed within the window. */
  max: number
  /** Window size in seconds. */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: string
  limit: number
}

/**
 * Best-effort client identifier. Behind Vercel/Cloudflare, x-forwarded-for's
 * first entry is the original client IP. Falls back to 'unknown' rather than
 * throwing -- an imperfect identifier is still better than no rate limiting.
 */
export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  if (cfConnectingIp) return cfConnectingIp
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIp) return realIp
  return 'unknown'
}

/**
 * Checks and increments a fixed-window rate limit counter for `identifier`
 * under the given config. Backed by the `check_rate_limit` Postgres function
 * (see migration 008) so counts are correct across serverless instances.
 *
 * Fails OPEN on infra errors (DB unreachable, etc.) -- a broken rate limiter
 * should not take the whole app down. Errors are logged so this is visible.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${config.name}:${identifier}`

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_max_requests: config.max,
      p_window_seconds: config.windowSeconds,
    })

    if (error || !data || !data[0]) {
      console.error('Rate limit check failed, failing open:', error)
      return {
        allowed: true,
        remaining: config.max,
        resetAt: new Date(Date.now() + config.windowSeconds * 1000).toISOString(),
        limit: config.max,
      }
    }

    const row = data[0] as { allowed: boolean; remaining: number; reset_at: string }
    return { allowed: row.allowed, remaining: row.remaining, resetAt: row.reset_at, limit: config.max }
  } catch (error) {
    console.error('Rate limit check threw, failing open:', error)
    return {
      allowed: true,
      remaining: config.max,
      resetAt: new Date(Date.now() + config.windowSeconds * 1000).toISOString(),
      limit: config.max,
    }
  }
}

/**
 * Drop-in guard for the top of a route handler:
 *
 *   const limited = await enforceRateLimit(request, { name: 'bookings:create', max: 5, windowSeconds: 60 })
 *   if (limited) return limited
 *
 * Returns a ready-to-return 429 NextResponse when the caller is over the
 * limit, or null when the request should proceed.
 */
export async function enforceRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(request)
  const result = await checkRateLimit(identifier, config)

  if (!result.allowed) {
    logSecurityEvent(
      'rate_limit_exceeded',
      undefined,
      { route: config.name, limit: config.max, window_seconds: config.windowSeconds },
      identifier,
      request.headers.get('user-agent') || undefined
    ).catch(() => {})

    const retryAfterSeconds = Math.max(1, Math.ceil((new Date(result.resetAt).getTime() - Date.now()) / 1000))

    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': result.resetAt,
        },
      }
    )
  }

  return null
}
