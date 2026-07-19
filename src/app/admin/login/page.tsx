import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

export default function SuperAdminLoginPage() {
  return (
    <AdminLoginForm
      portalRole="super_admin"
      label="Super Admin"
      description="Full platform access — TARA administration"
      dashboardPath="/admin/dashboard"
    />
  )
}
