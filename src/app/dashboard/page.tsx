import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/rbac/utils'
import { PLATFORM_ADMIN_DASHBOARD_PATH } from '@/types/rbac'

export default async function DashboardRouter() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // A tenant-less "owner" is NOT necessarily a platform admin -- that's
  // also what every fresh signup looks like before they register a
  // business. Only route to an admin portal if platform_admin_role is
  // actually set.
  if (user.tenant_id === null && user.platform_admin_role) {
    redirect(PLATFORM_ADMIN_DASHBOARD_PATH[user.platform_admin_role] ?? '/admin/dashboard')
  }

  if (user.tenant_id) {
    redirect('/vendor/dashboard')
  }

  // Signed in, no tenant yet, not a platform admin -- they haven't
  // finished setting up their business yet.
  redirect('/vendor/register')
}
