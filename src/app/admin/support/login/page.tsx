import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

export default function SupportAdminLoginPage() {
  return (
    <AdminLoginForm
      portalRole="support_admin"
      label="Support Admin"
      description="Support tickets & review moderation portal"
      dashboardPath="/admin/support/dashboard"
    />
  )
}
