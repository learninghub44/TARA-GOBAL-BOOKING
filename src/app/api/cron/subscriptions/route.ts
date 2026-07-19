import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSubscriptionReminderEmail } from '@/lib/email/resend'


const REMINDER_WINDOW_DAYS = 5

/**
 * Scheduled job (call daily via Vercel Cron / Railway cron / GitHub Action)
 * with header `x-cron-secret: $CRON_SECRET`. Two jobs in one pass:
 *  1. Send a renewal reminder to tenants whose subscription expires within
 *     REMINDER_WINDOW_DAYS and haven't been reminded yet this cycle.
 *  2. Flip subscriptions/tenants past their end_date to 'expired'.
 */
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const reminderCutoff = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // --- 1. Renewal reminders ---
  const { data: expiringSoon, error: expiringError } = await supabase
    .from('subscriptions')
    .select('id, tenant_id, plan, end_date, tenants(business_name, business_email)')
    .eq('status', 'active')
    .is('reminder_sent_at', null)
    .lte('end_date', reminderCutoff)
    .gt('end_date', now.toISOString())

  interface ExpiringSubscription {
    id: string
    tenant_id: string
    plan: string
    end_date: string
    tenants: { business_name: string; business_email: string } | null
  }

  let remindersSent = 0
  if (!expiringError && expiringSoon) {
    for (const sub of expiringSoon as unknown as ExpiringSubscription[]) {
      const tenant = sub.tenants
      if (!tenant?.business_email) continue

      await sendSubscriptionReminderEmail(
        tenant.business_email,
        sub.plan,
        new Date(sub.end_date).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })
      )

      await supabase.from('subscriptions').update({ reminder_sent_at: now.toISOString() }).eq('id', sub.id)
      remindersSent++
    }
  }

  // --- 2. Expire subscriptions past end_date ---
  const { data: expired, error: expiredError } = await supabase
    .from('subscriptions')
    .select('id, tenant_id')
    .in('status', ['active', 'past_due'])
    .lt('end_date', now.toISOString())

  let expiredCount = 0
  if (!expiredError && expired) {
    for (const sub of expired) {
      await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id)
      await supabase.from('tenants').update({ subscription_status: 'expired' }).eq('id', sub.tenant_id)
      await supabase.from('audit_logs').insert({
        tenant_id: sub.tenant_id,
        action: 'subscription.subscription_expired',
        table_name: 'subscriptions',
        record_id: sub.id,
      })
      expiredCount++
    }
  }

  return NextResponse.json({
    reminders_sent: remindersSent,
    subscriptions_expired: expiredCount,
  })
}
