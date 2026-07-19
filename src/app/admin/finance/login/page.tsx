import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

export default function FinanceAdminLoginPage() {
  return (
    <AdminLoginForm
      portalRole="finance_admin"
      label="Finance Admin"
      description="Payments, refunds & subscriptions portal"
      dashboardPath="/admin/payments"
    />
  )
}
