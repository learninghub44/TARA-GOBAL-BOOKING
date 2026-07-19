import { createClient } from '@/lib/supabase/server'
import { UserRole, hasPermission, hasAnyPermission, hasAllPermissions, canAccessRole, PlatformAdminRole, canAccessPlatformAdminRole } from '@/types/rbac'

export interface UserContext {
  id: string
  email: string
  tenant_id: string | null
  role: UserRole
  is_active: boolean
  email_verified: boolean
  platform_admin_role: PlatformAdminRole | null
}

export async function getCurrentUser(): Promise<UserContext | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !userData) {
    return null
  }

  return {
    id: userData.id,
    email: userData.email,
    tenant_id: userData.tenant_id,
    role: userData.role as UserRole,
    is_active: userData.is_active,
    email_verified: userData.email_verified || user.email_confirmed_at !== null,
    platform_admin_role: (userData.platform_admin_role as PlatformAdminRole | null) ?? null,
  }
}

export async function requireAuth(): Promise<UserContext> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  if (!user.is_active) {
    throw new Error('Account is inactive')
  }
  
  return user
}

export async function requireTenantAuth(): Promise<UserContext> {
  const user = await requireAuth()
  
  if (!user.tenant_id) {
    throw new Error('No tenant associated with user')
  }
  
  return user
}

export async function requirePermission(resource: string, action: string): Promise<UserContext> {
  const user = await requireAuth()
  
  if (!hasPermission(user.role, resource, action)) {
    throw new Error(`Insufficient permissions for ${resource}:${action}`)
  }
  
  return user
}

export async function requireAnyPermission(permissions: { resource: string; action: string }[]): Promise<UserContext> {
  const user = await requireAuth()
  
  if (!hasAnyPermission(user.role, permissions)) {
    throw new Error('Insufficient permissions')
  }
  
  return user
}

export async function requireAllPermissions(permissions: { resource: string; action: string }[]): Promise<UserContext> {
  const user = await requireAuth()
  
  if (!hasAllPermissions(user.role, permissions)) {
    throw new Error('Insufficient permissions')
  }
  
  return user
}

export async function requireRole(role: UserRole): Promise<UserContext> {
  const user = await requireAuth()
  
  if (user.role !== role) {
    throw new Error(`Required role: ${role}`)
  }
  
  return user
}

export async function requireMinRole(minRole: UserRole): Promise<UserContext> {
  const user = await requireAuth()
  
  if (!canAccessRole(minRole, user.role)) {
    throw new Error(`Insufficient role level`)
  }
  
  return user
}

export async function isPlatformAdmin(): Promise<boolean> {
  try {
    const user = await requireAuth()
    return user.tenant_id === null && user.role === 'owner'
  } catch {
    return false
  }
}

export async function requirePlatformAdmin(): Promise<UserContext> {
  const user = await requireAuth()
  
  if (user.tenant_id !== null || user.role !== 'owner') {
    throw new Error('Platform admin access required')
  }
  
  return user
}

/**
 * Guard for the 4 separate admin portals (super/kyc/finance/support).
 * super_admin is always allowed through; the other roles must match one of
 * `allowedRoles`. This is an app-layer convenience -- RLS enforces the same
 * scoping as the real trust boundary (see migration 007).
 */
export async function requirePlatformAdminRole(allowedRoles: PlatformAdminRole[]): Promise<UserContext> {
  const user = await requirePlatformAdmin()

  if (!canAccessPlatformAdminRole(user.platform_admin_role, allowedRoles)) {
    throw new Error('Insufficient admin portal access')
  }

  return user
}

export async function isPlatformAdminRole(allowedRoles: PlatformAdminRole[]): Promise<boolean> {
  try {
    const user = await requirePlatformAdmin()
    return canAccessPlatformAdminRole(user.platform_admin_role, allowedRoles)
  } catch {
    return false
  }
}
