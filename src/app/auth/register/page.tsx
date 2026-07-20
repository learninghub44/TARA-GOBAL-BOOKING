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
import { Loader2, Mail } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        // The matching public.users profile row is created server-side by
        // the on_auth_user_created trigger (see migration 013) -- it runs
        // with elevated privileges, so it works immediately regardless of
        // whether email confirmation is pending.
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="Almost there"
        headline={
          <>
            One more step <span className="italic text-brand-orange">to go.</span>
          </>
        }
        copy="Confirm your email and you'll be ready to list your first tour, rental, or service."
        image="https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=1400&q=80&auto=format&fit=crop"
        imageAlt="Traveler at an airport gate"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-navy/10">
          <Mail className="h-5 w-5 text-brand-navy" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-medium text-brand-navy">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve sent a confirmation link to <span className="font-medium text-foreground">{formData.email}</span>.
          Click it to verify your account and finish setting up.
        </p>
        <Button className="mt-8 h-11 w-full" variant="outline" onClick={() => router.push('/auth/login')}>
          Go to login
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Join TARA"
      headline={
        <>
          Start your travel <span className="italic text-brand-orange">business here.</span>
        </>
      }
      copy="List tours, travel services, car rentals, or adventures and reach travelers across East Africa."
      image="https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=1400&q=80&auto=format&fit=crop"
      imageAlt="Traveler at an airport gate"
    >
      <h1 className="font-display text-3xl font-medium text-brand-navy">Create an account</h1>
      <p className="mt-2 text-sm text-muted-foreground">Join TARA to start your travel business.</p>

      <form onSubmit={handleRegister} className="mt-8 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              disabled={loading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              disabled={loading}
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={loading}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            disabled={loading}
            minLength={6}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            disabled={loading}
            minLength={6}
            className="h-11"
          />
        </div>

        <Button type="submit" className="h-11 w-full bg-brand-navy text-white hover:bg-brand-navy/90" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-medium text-brand-navy hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
