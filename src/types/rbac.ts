export type UserRole = 'owner' | 'manager' | 'staff' | 'sales_agent' | 'customer_support'

export interface Permission {
  resource: string
  action: string
}

export interface RolePermissions {
  [key: string]: Permission[]
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 5,
  manager: 4,
  staff: 3,
  sales_agent: 2,
  customer_support: 1,
}

export const ROLE_PERMISSIONS: RolePermissions = {
  owner: [
    { resource: 'tenants', action: 'read' },
    { resource: 'tenants', action: 'update' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    { resource: 'tours', action: 'read' },
    { resource: 'tours', action: 'create' },
    { resource: 'tours', action: 'update' },
    { resource: 'tours', action: 'delete' },
    { resource: 'tours', action: 'publish' },
    { resource: 'travel_services', action: 'read' },
    { resource: 'travel_services', action: 'create' },
    { resource: 'travel_services', action: 'update' },
    { resource: 'travel_services', action: 'delete' },
    { resource: 'travel_services', action: 'publish' },
    { resource: 'car_rentals', action: 'read' },
    { resource: 'car_rentals', action: 'create' },
    { resource: 'car_rentals', action: 'update' },
    { resource: 'car_rentals', action: 'delete' },
    { resource: 'car_rentals', action: 'publish' },
    { resource: 'adventure_activities', action: 'read' },
    { resource: 'adventure_activities', action: 'create' },
    { resource: 'adventure_activities', action: 'update' },
    { resource: 'adventure_activities', action: 'delete' },
    { resource: 'adventure_activities', action: 'publish' },
    { resource: 'bookings', action: 'read' },
    { resource: 'bookings', action: 'create' },
    { resource: 'bookings', action: 'update' },
    { resource: 'bookings', action: 'cancel' },
    { resource: 'bookings', action: 'refund' },
    { resource: 'conversations', action: 'read' },
    { resource: 'conversations', action: 'create' },
    { resource: 'conversations', action: 'update' },
    { resource: 'conversations', action: 'delete' },
    { resource: 'messages', action: 'read' },
    { resource: 'messages', action: 'create' },
    { resource: 'reviews', action: 'read' },
    { resource: 'reviews', action: 'moderate' },
    { resource: 'reviews', action: 'delete' },
    { resource: 'subscriptions', action: 'read' },
    { resource: 'subscriptions', action: 'update' },
    { resource: 'payments', action: 'read' },
    { resource: 'reports', action: 'read' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
    { resource: 'promotions', action: 'read' },
    { resource: 'promotions', action: 'create' },
    { resource: 'promotions', action: 'update' },
    { resource: 'promotions', action: 'cancel' },
    { resource: 'advertisements', action: 'read' },
    { resource: 'advertisements', action: 'create' },
    { resource: 'advertisements', action: 'update' },
  ],
  manager: [
    { resource: 'tenants', action: 'read' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'update' },
    { resource: 'tours', action: 'read' },
    { resource: 'tours', action: 'create' },
    { resource: 'tours', action: 'update' },
    { resource: 'tours', action: 'delete' },
    { resource: 'tours', action: 'publish' },
    { resource: 'travel_services', action: 'read' },
    { resource: 'travel_services', action: 'create' },
    { resource: 'travel_services', action: 'update' },
    { resource: 'travel_services', action: 'delete' },
    { resource: 'travel_services', action: 'publish' },
    { resource: 'car_rentals', action: 'read' },
    { resource: 'car_rentals', action: 'create' },
    { resource: 'car_rentals', action: 'update' },
    { resource: 'car_rentals', action: 'delete' },
    { resource: 'car_rentals', action: 'publish' },
    { resource: 'adventure_activities', action: 'read' },
    { resource: 'adventure_activities', action: 'create' },
    { resource: 'adventure_activities', action: 'update' },
    { resource: 'adventure_activities', action: 'delete' },
    { resource: 'adventure_activities', action: 'publish' },
    { resource: 'bookings', action: 'read' },
    { resource: 'bookings', action: 'create' },
    { resource: 'bookings', action: 'update' },
    { resource: 'bookings', action: 'cancel' },
    { resource: 'conversations', action: 'read' },
    { resource: 'conversations', action: 'create' },
    { resource: 'conversations', action: 'update' },
    { resource: 'messages', action: 'read' },
    { resource: 'messages', action: 'create' },
    { resource: 'reviews', action: 'read' },
    { resource: 'reviews', action: 'moderate' },
    { resource: 'subscriptions', action: 'read' },
    { resource: 'payments', action: 'read' },
    { resource: 'reports', action: 'read' },
    { resource: 'settings', action: 'read' },
    { resource: 'promotions', action: 'read' },
    { resource: 'promotions', action: 'create' },
    { resource: 'promotions', action: 'update' },
    { resource: 'promotions', action: 'cancel' },
    { resource: 'advertisements', action: 'read' },
    { resource: 'advertisements', action: 'create' },
    { resource: 'advertisements', action: 'update' },
  ],
  staff: [
    { resource: 'tours', action: 'read' },
    { resource: 'tours', action: 'create' },
    { resource: 'tours', action: 'update' },
    { resource: 'tours', action: 'publish' },
    { resource: 'travel_services', action: 'read' },
    { resource: 'travel_services', action: 'create' },
    { resource: 'travel_services', action: 'update' },
    { resource: 'travel_services', action: 'publish' },
    { resource: 'car_rentals', action: 'read' },
    { resource: 'car_rentals', action: 'create' },
    { resource: 'car_rentals', action: 'update' },
    { resource: 'car_rentals', action: 'publish' },
    { resource: 'adventure_activities', action: 'read' },
    { resource: 'adventure_activities', action: 'create' },
    { resource: 'adventure_activities', action: 'update' },
    { resource: 'adventure_activities', action: 'publish' },
    { resource: 'bookings', action: 'read' },
    { resource: 'bookings', action: 'create' },
    { resource: 'bookings', action: 'update' },
    { resource: 'conversations', action: 'read' },
    { resource: 'conversations', action: 'create' },
    { resource: 'conversations', action: 'update' },
    { resource: 'messages', action: 'read' },
    { resource: 'messages', action: 'create' },
    { resource: 'reviews', action: 'read' },
    { resource: 'promotions', action: 'read' },
    { resource: 'advertisements', action: 'read' },
  ],
  sales_agent: [
    { resource: 'tours', action: 'read' },
    { resource: 'travel_services', action: 'read' },
    { resource: 'car_rentals', action: 'read' },
    { resource: 'adventure_activities', action: 'read' },
    { resource: 'bookings', action: 'read' },
    { resource: 'bookings', action: 'create' },
    { resource: 'bookings', action: 'update' },
    { resource: 'conversations', action: 'read' },
    { resource: 'conversations', action: 'create' },
    { resource: 'conversations', action: 'update' },
    { resource: 'messages', action: 'read' },
    { resource: 'messages', action: 'create' },
    { resource: 'reviews', action: 'read' },
    { resource: 'reports', action: 'read' },
  ],
  customer_support: [
    { resource: 'tenants', action: 'read' },
    { resource: 'users', action: 'read' },
    { resource: 'tours', action: 'read' },
    { resource: 'travel_services', action: 'read' },
    { resource: 'car_rentals', action: 'read' },
    { resource: 'adventure_activities', action: 'read' },
    { resource: 'bookings', action: 'read' },
    { resource: 'bookings', action: 'update' },
    { resource: 'conversations', action: 'read' },
    { resource: 'conversations', action: 'create' },
    { resource: 'conversations', action: 'update' },
    { resource: 'conversations', action: 'delete' },
    { resource: 'messages', action: 'read' },
    { resource: 'messages', action: 'create' },
    { resource: 'reviews', action: 'read' },
    { resource: 'reviews', action: 'moderate' },
    { resource: 'support_tickets', action: 'read' },
    { resource: 'support_tickets', action: 'create' },
    { resource: 'support_tickets', action: 'update' },
  ],
}

export function hasPermission(role: UserRole, resource: string, action: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.some(
    (permission) => permission.resource === resource && permission.action === action
  )
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || []
  return permissions.some((permission) =>
    rolePermissions.some(
      (rp) => rp.resource === permission.resource && rp.action === permission.action
    )
  )
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || []
  return permissions.every((permission) =>
    rolePermissions.some(
      (rp) => rp.resource === permission.resource && rp.action === permission.action
    )
  )
}

export function canAccessRole(userRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[targetRole]
}

// ============================================
// PLATFORM ADMIN PORTALS
// ============================================
// A platform admin row (role = 'owner', tenant_id = NULL) is further scoped by
// platform_admin_role into one of 4 separate login portals. super_admin has the
// union of everything the other 3 can do.

export type PlatformAdminRole = 'super_admin' | 'kyc_admin' | 'finance_admin' | 'support_admin'

export const PLATFORM_ADMIN_ROLES: PlatformAdminRole[] = [
  'super_admin',
  'kyc_admin',
  'finance_admin',
  'support_admin',
]

export const PLATFORM_ADMIN_LABELS: Record<PlatformAdminRole, string> = {
  super_admin: 'Super Admin',
  kyc_admin: 'KYC Admin',
  finance_admin: 'Finance Admin',
  support_admin: 'Support Admin',
}

export const PLATFORM_ADMIN_LOGIN_PATH: Record<PlatformAdminRole, string> = {
  super_admin: '/admin/login',
  kyc_admin: '/admin/kyc/login',
  finance_admin: '/admin/finance/login',
  support_admin: '/admin/support/login',
}

export const PLATFORM_ADMIN_DASHBOARD_PATH: Record<PlatformAdminRole, string> = {
  super_admin: '/admin/dashboard',
  kyc_admin: '/admin/kyc/dashboard',
  finance_admin: '/admin/payments',
  support_admin: '/admin/support/dashboard',
}

/** Does an admin whose portal role is `actual` get to use a page scoped to `required`? */
export function canAccessPlatformAdminRole(
  actual: PlatformAdminRole | null | undefined,
  required: PlatformAdminRole[]
): boolean {
  if (!actual) return false
  if (actual === 'super_admin') return true
  return required.includes(actual)
}
