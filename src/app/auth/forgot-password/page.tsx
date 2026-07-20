'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthShell from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="Password reset"
        headline={
          <>
            Link sent — <span className="italic text-brand-orange">check your inbox.</span>
          </>
        }
        copy="The reset link expires in 24 hours. If it doesn't arrive in a few minutes, check spam."
        image="https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1400&q=80&auto=format&fit=crop"
        imageAlt="Savanna landscape at dusk"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-navy/10">
          <CheckCircle2 className="h-5 w-5 text-brand-navy" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-medium text-brand-navy">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
        </p>
        <Button className="mt-8 h-11 w-full" variant="outline" onClick={() => router.push('/auth/login')}>
          Back to login
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      headline={
        <>
          Locked out? <span className="italic text-brand-orange">Let&apos;s fix that.</span>
        </>
      }
      copy="Enter the email on your account and we'll send a link to set a new password."
      image="https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1400&q=80&auto=format&fit=crop"
      imageAlt="Savanna landscape at dusk"
    >
      <h1 className="font-display text-3xl font-medium text-brand-navy">Reset your password</h1>
      <p className="mt-2 text-sm text-muted-foreground">We&apos;ll send you a reset link by email.</p>

      <form onSubmit={handleResetPassword} className="mt-8 space-y-4">
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
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="h-11"
          />
        </div>

        <Button type="submit" className="h-11 w-full bg-brand-navy text-white hover:bg-brand-navy/90" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending reset link...
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href="/auth/login" className="font-medium text-brand-navy hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
