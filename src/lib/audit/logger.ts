import { createAdminClient } from '@/lib/supabase/admin'

export interface AuditLogEntry {
  tenant_id?: string
  user_id?: string
  action: string
  table_name?: string
  record_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        tenant_id: entry.tenant_id,
        user_id: entry.user_id,
        action: entry.action,
        table_name: entry.table_name,
        record_id: entry.record_id,
        old_values: entry.old_values,
        new_values: entry.new_values,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
      })

    if (error) {
      console.error('Failed to create audit log:', error)
    }
  } catch (error) {
    console.error('Audit logging error:', error)
  }
}

export async function logAuthenticationEvent(
  userId: string,
  action: 'login' | 'logout' | 'register' | 'password_reset' | 'email_verification',
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action: `auth.${action}`,
    table_name: 'users',
    record_id: userId,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

export async function logKYCEvent(
  tenantId: string,
  userId: string,
  action: 'kyc_initiated' | 'kyc_approved' | 'kyc_rejected' | 'kyc_manual_review',
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    tenant_id: tenantId,
    user_id: userId,
    action: `kyc.${action}`,
    table_name: 'kyc_verifications',
    record_id: tenantId,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

export async function logPaymentEvent(
  tenantId: string,
  userId: string,
  paymentId: string,
  action: 'payment_initiated' | 'payment_completed' | 'payment_failed' | 'payment_refunded',
  ipAddress?: string,
  userAgent?: string,
  amount?: number
): Promise<void> {
  await createAuditLog({
    tenant_id: tenantId,
    user_id: userId,
    action: `payment.${action}`,
    table_name: 'payments',
    record_id: paymentId,
    new_values: { amount },
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

export async function logSubscriptionEvent(
  tenantId: string,
  userId: string,
  subscriptionId: string,
  action: 'subscription_created' | 'subscription_activated' | 'subscription_cancelled' | 'subscription_expired' | 'subscription_renewed',
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    tenant_id: tenantId,
    user_id: userId,
    action: `subscription.${action}`,
    table_name: 'subscriptions',
    record_id: subscriptionId,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

export async function logBookingEvent(
  tenantId: string,
  userId: string,
  bookingId: string,
  action: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'booking_completed',
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    tenant_id: tenantId,
    user_id: userId,
    action: `booking.${action}`,
    table_name: 'bookings',
    record_id: bookingId,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

export async function logListingEvent(
  tenantId: string,
  userId: string,
  listingId: string,
  listingType: string,
  action: 'listing_created' | 'listing_updated' | 'listing_deleted' | 'listing_published' | 'listing_unpublished',
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    tenant_id: tenantId,
    user_id: userId,
    action: `listing.${action}`,
    table_name: listingType,
    record_id: listingId,
    old_values: oldValues,
    new_values: newValues,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

export async function logAdminAction(
  userId: string,
  action: string,
  targetTable?: string,
  targetId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action: `admin.${action}`,
    table_name: targetTable,
    record_id: targetId,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

export async function logSecurityEvent(
  action: 'unauthorized_access' | 'rate_limit_exceeded' | 'suspicious_activity' | 'brute_force_attempt' | 'data_breach_attempt',
  userId?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    action: `security.${action}`,
    new_values: details,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

export async function logDataAccessEvent(
  tenantId: string,
  userId: string,
  action: 'data_exported' | 'data_viewed' | 'bulk_download',
  recordType: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    tenant_id: tenantId,
    user_id: userId,
    action: `data.${action}`,
    table_name: recordType,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

// Utility function to get client IP address from request headers
export function getClientIPAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

// Utility function to get user agent from request headers
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}
