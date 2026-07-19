import { createClient } from '@/lib/supabase/server'
import { UserRole, hasPermission, hasAnyPermission, hasAllPermissions, canAccessRole } from '@/types/rbac'

export interface UserContext {
  id: string
  email: string
  tenant_id: string | null
  role: UserRole
  is_active: boolean
  email_verified: boolean
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
