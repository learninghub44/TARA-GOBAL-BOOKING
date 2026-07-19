import { createClient } from '@/lib/supabase/server'
import { UserContext } from '@/lib/rbac/utils'

export interface TenantContext {
  id: string
  business_name: string
  business_slug: string
  business_email: string
  business_country: string
  verification_status: 'pending' | 'approved' | 'rejected' | 'manual_review'
  subscription_status: 'active' | 'inactive' | 'past_due' | 'cancelled' | 'expired'
  is_featured: boolean
  is_sponsored: boolean
}

export async function getTenantById(tenantId: string): Promise<TenantContext | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    business_name: data.business_name,
    business_slug: data.business_slug,
    business_email: data.business_email,
    business_country: data.business_country,
    verification_status: data.verification_status,
    subscription_status: data.subscription_status,
    is_featured: data.is_featured,
    is_sponsored: data.is_sponsored,
  }
}

export async function getTenantBySlug(slug: string): Promise<TenantContext | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('business_slug', slug)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    business_name: data.business_name,
    business_slug: data.business_slug,
    business_email: data.business_email,
    business_country: data.business_country,
    verification_status: data.verification_status,
    subscription_status: data.subscription_status,
    is_featured: data.is_featured,
    is_sponsored: data.is_sponsored,
  }
}

export async function getUserTenant(user: UserContext): Promise<TenantContext | null> {
  if (!user.tenant_id) {
    return null
  }
  
  return getTenantById(user.tenant_id)
}

export async function requireTenant(user: UserContext): Promise<TenantContext> {
  if (!user.tenant_id) {
    throw new Error('No tenant associated with user')
  }
  
  const tenant = await getTenantById(user.tenant_id)
  
  if (!tenant) {
    throw new Error('Tenant not found')
  }
  
  return tenant
}

export async function requireVerifiedTenant(user: UserContext): Promise<TenantContext> {
  const tenant = await requireTenant(user)
  
  if (tenant.verification_status !== 'approved') {
    throw new Error('Tenant must be verified')
  }
  
  return tenant
}

export async function requireActiveSubscription(user: UserContext): Promise<TenantContext> {
  const tenant = await requireTenant(user)
  
  if (tenant.subscription_status !== 'active') {
    throw new Error('Active subscription required')
  }
  
  return tenant
}

export async function isTenantAccessible(user: UserContext, tenantId: string): Promise<boolean> {
  // Platform admins can access any tenant
  if (user.tenant_id === null && user.role === 'owner') {
    return true
  }
  
  // Users can only access their own tenant
  return user.tenant_id === tenantId
}

export async function requireTenantAccess(user: UserContext, tenantId: string): Promise<void> {
  if (!(await isTenantAccessible(user, tenantId))) {
    throw new Error('Access denied to tenant')
  }
}

export function generateBusinessSlug(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function isBusinessSlugAvailable(slug: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('business_slug', slug)
    .single()

  return !data
}

export async function generateUniqueBusinessSlug(businessName: string): Promise<string> {
  let slug = generateBusinessSlug(businessName)
  let counter = 1
  
  while (!(await isBusinessSlugAvailable(slug))) {
    slug = `${generateBusinessSlug(businessName)}-${counter}`
    counter++
  }
  
  return slug
}
