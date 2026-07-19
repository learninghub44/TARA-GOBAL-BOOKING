import crypto from 'crypto'
import { NextRequest } from 'next/server'

/**
 * Timing-safe check of the x-cron-secret header against CRON_SECRET.
 * A plain `!==` string comparison leaks timing information about how many
 * leading characters matched; crypto.timingSafeEqual avoids that.
 */
export function verifyCronSecret(request: NextRequest): boolean {
  const provided = request.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET

  if (!expected || !provided) return false

  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)

  if (providedBuf.length !== expectedBuf.length) return false

  return crypto.timingSafeEqual(providedBuf, expectedBuf)
}
