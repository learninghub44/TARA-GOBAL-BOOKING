'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-navy-deep px-4 py-12">
      {/* Ambient ops-console backdrop -- same dusk motion system as the rest
          of the site, without the travel photography, since this is an
          internal tool, not a marketing surface. */}
      <div className="animate-sky-drift absolute inset-0 bg-gradient-to-br from-brand-navy-deep via-brand-navy to-brand-navy-deep bg-[length:200%_200%]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="animate-drift-slow absolute -top-24 left-[-8%] h-[360px] w-[360px] rounded-full bg-brand-gold/15 blur-[110px]" />
      <div
        className="animate-drift-slow absolute -bottom-24 right-[-8%] h-[360px] w-[360px] rounded-full bg-brand-orange/15 blur-[110px]"
        style={{ animationDelay: '5s' }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo-icon.png" alt="" width={36} height={36} className="mb-4 h-9 w-9" />
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-white/50">TARA · Internal</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-medium text-white">{label}</h1>
              <p className="text-xs text-white/60">{description}</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-brand-ember/40 bg-brand-ember/10 text-white [&_svg]:text-brand-ember">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wide text-white/70">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-brand-gold/60 focus-visible:ring-brand-gold/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wide text-white/70">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-brand-gold/60 focus-visible:ring-brand-gold/30"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-brand-gold text-brand-navy-deep hover:bg-brand-gold/90"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Sign in as ${label}`}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center font-mono text-[0.65rem] uppercase tracking-[0.15em] text-white/30">
          Restricted access · Authorized personnel only
        </p>
      </div>
    </div>
  )
}
