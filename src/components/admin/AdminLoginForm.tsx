'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ShieldCheck } from 'lucide-react'
import { PlatformAdminRole } from '@/types/rbac'

interface AdminLoginFormProps {
  /** Which portal this login page is for. */
  portalRole: PlatformAdminRole
  /** Display label, e.g. "KYC Admin". */
  label: string
  /** One-line description under the title. */
  description: string
  /** Where to send the user after a successful, correctly-scoped login. */
  dashboardPath: string
}

export function AdminLoginForm({ portalRole, label, description, dashboardPath }: AdminLoginFormProps) {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authData.user) {
        setError(authError?.message || 'Invalid credentials')
        return
      }

      // Confirm this account is a platform admin scoped to THIS portal
      // (or super_admin, who can use any portal) before granting access.
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('role, tenant_id, platform_admin_role, is_active')
        .eq('id', authData.user.id)
        .single()

      const isPlatformAdmin = userRow && userRow.role === 'owner' && userRow.tenant_id === null
      const hasPortalAccess =
        isPlatformAdmin &&
        (userRow.platform_admin_role === 'super_admin' || userRow.platform_admin_role === portalRole)

      if (userError || !userRow || !userRow.is_active || !hasPortalAccess) {
        await supabase.auth.signOut()
        setError(`This login is for ${label} accounts only.`)
        return
      }

      router.push(dashboardPath)
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-slate-900 p-3">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">{label}</CardTitle>
          <CardDescription className="text-center">{description}</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Sign in as ${label}`}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
