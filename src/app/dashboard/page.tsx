import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/rbac/utils'

export default async function DashboardRouter() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (user.tenant_id === null && user.role === 'owner') {
    redirect('/admin/dashboard')
  }

  if (user.tenant_id) {
    redirect('/vendor/dashboard')
  }

  redirect('/')
}
