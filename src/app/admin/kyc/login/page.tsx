import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

export default function KycAdminLoginPage() {
  return (
    <AdminLoginForm
      portalRole="kyc_admin"
      label="KYC Admin"
      description="Vendor verification portal"
      dashboardPath="/admin/kyc/dashboard"
    />
  )
}
