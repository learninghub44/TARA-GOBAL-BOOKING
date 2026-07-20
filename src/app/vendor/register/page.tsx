'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle2, Building2, Check } from 'lucide-react'
import Image from 'next/image'

export default function VendorRegisterPage() {
  const router = useRouter()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    businessSlug: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    businessCity: '',
    businessCountry: 'Kenya', // Default value
    websiteUrl: '',
    registrationNumber: '',
    taxId: '',
    businessDescription: '',
  })

  const supabase = createClient()

  const handleBusinessInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Generate business slug if not provided
      if (!businessInfo.businessSlug) {
        const slug = businessInfo.businessName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
        setBusinessInfo({ ...businessInfo, businessSlug: slug })
      }

      // Check if email is already registered
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('business_email', businessInfo.businessEmail)
        .single()

      if (existingTenant) {
        setError('A business with this email already exists')
        setLoading(false)
        return
      }

      // Check if slug is available
      const { data: existingSlug } = await supabase
        .from('tenants')
        .select('id')
        .eq('business_slug', businessInfo.businessSlug)
        .single()

      if (existingSlug) {
        setError('This business URL is already taken. Please choose another.')
        setLoading(false)
        return
      }

      setStep(2)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleVendorRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to register as a vendor')
        router.push('/auth/login?redirect=/vendor/register')
        return
      }

      // Create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          business_name: businessInfo.businessName,
          business_slug: businessInfo.businessSlug,
          business_email: businessInfo.businessEmail,
          business_phone: businessInfo.businessPhone,
          business_address: businessInfo.businessAddress,
          business_city: businessInfo.businessCity,
          business_country: businessInfo.businessCountry,
          website_url: businessInfo.websiteUrl,
          registration_number: businessInfo.registrationNumber,
          tax_id: businessInfo.taxId,
          business_description: businessInfo.businessDescription,
          verification_status: 'pending',
          subscription_status: 'inactive',
        })
        .select()
        .single()

      if (tenantError) {
        setError(tenantError.message)
        return
      }

      // Update user with tenant_id and role
      const { error: userError } = await supabase
        .from('users')
        .update({
          tenant_id: tenant.id,
          role: 'owner',
        })
        .eq('id', user.id)

      if (userError) {
        setError(userError.message)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/vendor/onboarding/kyc')
      }, 2000)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-sand p-4">
        <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-10 text-center shadow-[0_1px_2px_rgba(16,42,67,0.04),0_16px_40px_-16px_rgba(16,42,67,0.18)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy/10">
            <CheckCircle2 className="h-7 w-7 text-brand-navy" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-medium text-brand-navy">Business registered</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {businessInfo.businessName} has been added to TARA. Redirecting you to identity verification...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-sand">
      {/* Brand banner */}
      <div className="relative overflow-hidden bg-brand-navy-deep px-4 pt-14 pb-16">
        <div className="animate-sky-drift absolute inset-0 bg-gradient-to-br from-brand-navy-deep/95 via-brand-navy/80 to-brand-ember/30 mix-blend-multiply" />
        <div className="animate-drift-slow absolute -top-20 right-[-6%] h-[280px] w-[280px] rounded-full bg-brand-orange/20 blur-[100px]" />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <Link href="/" className="mb-5 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-white/70">
            <Image src="/logo-icon.png" alt="" width={20} height={20} className="h-5 w-5" />
            TARA
          </Link>
          <span className="mb-4 flex items-center justify-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-brand-orange">
            <Building2 className="h-3.5 w-3.5" />
            Vendor registration
          </span>
          <h1 className="text-balance font-display text-3xl font-medium text-white sm:text-4xl">
            Become a <span className="italic text-brand-orange">TARA vendor.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
            Tell us about your business — you can start listing as soon as verification clears.
          </p>
        </div>

        {/* signature horizon ridge, echoing the homepage hero */}
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px h-10 w-full">
          <path
            d="M0,80 L0,44 L120,36 L240,50 L360,26 L480,42 L600,14 L720,34 L840,20 L960,44 L1080,10 L1200,32 L1320,18 L1440,38 L1440,80 Z"
            fill="var(--brand-sand)"
          />
        </svg>
      </div>

      <div className="mx-auto -mt-2 max-w-2xl px-4 pb-16">
        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-medium transition-colors ${
                step >= 1 ? 'bg-brand-navy text-white' : 'bg-white text-muted-foreground'
              }`}
            >
              {step > 1 ? <Check className="h-4 w-4" /> : '1'}
            </div>
            <span className={`font-mono text-xs uppercase tracking-wide ${step >= 1 ? 'text-brand-navy' : 'text-muted-foreground'}`}>
              Business info
            </span>
          </div>
          <div className={`h-px w-10 ${step >= 2 ? 'bg-brand-navy' : 'bg-border'}`} />
          <div className="flex items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-medium transition-colors ${
                step >= 2 ? 'bg-brand-navy text-white' : 'bg-white text-muted-foreground'
              }`}
            >
              2
            </div>
            <span className={`font-mono text-xs uppercase tracking-wide ${step >= 2 ? 'text-brand-navy' : 'text-muted-foreground'}`}>
              Review
            </span>
          </div>
        </div>

        <Card className="border-black/5 shadow-[0_1px_2px_rgba(16,42,67,0.04),0_16px_40px_-16px_rgba(16,42,67,0.15)]">
          <CardHeader>
            <CardTitle className="font-display text-xl font-medium text-brand-navy">
              {step === 1 ? 'Business information' : 'Review & confirm'}
            </CardTitle>
            <CardDescription>
              {step === 1 
                ? 'Tell us about your business' 
                : 'Please review your information before submitting'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 1 ? (
              <form onSubmit={handleBusinessInfoSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={businessInfo.businessName}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessSlug">Business URL (optional)</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                      tara.com/
                    </span>
                    <Input
                      id="businessSlug"
                      value={businessInfo.businessSlug}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, businessSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      disabled={loading}
                      className="rounded-l-none"
                      placeholder="your-business-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessEmail">Business Email *</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      value={businessInfo.businessEmail}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, businessEmail: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Business Phone</Label>
                    <Input
                      id="businessPhone"
                      type="tel"
                      value={businessInfo.businessPhone}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, businessPhone: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address *</Label>
                  <Input
                    id="businessAddress"
                    value={businessInfo.businessAddress}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, businessAddress: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessCity">City *</Label>
                    <Input
                      id="businessCity"
                      value={businessInfo.businessCity}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, businessCity: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessCountry">Country *</Label>
                    <Select
                      value={businessInfo.businessCountry || 'Kenya'}
                      onValueChange={(value) => setBusinessInfo({ ...businessInfo, businessCountry: value ?? '' })}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kenya">Kenya</SelectItem>
                        <SelectItem value="Tanzania">Tanzania</SelectItem>
                        <SelectItem value="Uganda">Uganda</SelectItem>
                        <SelectItem value="Rwanda">Rwanda</SelectItem>
                        <SelectItem value="South Africa">South Africa</SelectItem>
                        <SelectItem value="Nigeria">Nigeria</SelectItem>
                        <SelectItem value="Ghana">Ghana</SelectItem>
                        <SelectItem value="Ethiopia">Ethiopia</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    value={businessInfo.websiteUrl}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, websiteUrl: e.target.value })}
                    disabled={loading}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    <Input
                      id="registrationNumber"
                      value={businessInfo.registrationNumber}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, registrationNumber: e.target.value })}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID</Label>
                    <Input
                      id="taxId"
                      value={businessInfo.taxId}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, taxId: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessDescription">Business Description *</Label>
                  <Textarea
                    id="businessDescription"
                    value={businessInfo.businessDescription}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, businessDescription: e.target.value })}
                    required
                    disabled={loading}
                    rows={4}
                    placeholder="Describe your business and the services you offer..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <p className="text-sm font-medium">{businessInfo.businessName}</p>
                </div>

                <div className="space-y-2">
                  <Label>Business URL</Label>
                  <p className="text-sm font-medium">tara.com/{businessInfo.businessSlug || 'pending'}</p>
                </div>

                <div className="space-y-2">
                  <Label>Business Email</Label>
                  <p className="text-sm font-medium">{businessInfo.businessEmail}</p>
                </div>

                <div className="space-y-2">
                  <Label>Business Phone</Label>
                  <p className="text-sm font-medium">{businessInfo.businessPhone || 'Not provided'}</p>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <p className="text-sm font-medium">{businessInfo.businessAddress}</p>
                  <p className="text-sm font-medium">{businessInfo.businessCity}, {businessInfo.businessCountry}</p>
                </div>

                <div className="space-y-2">
                  <Label>Website</Label>
                  <p className="text-sm font-medium">{businessInfo.websiteUrl || 'Not provided'}</p>
                </div>

                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <p className="text-sm font-medium">{businessInfo.registrationNumber || 'Not provided'}</p>
                </div>

                <div className="space-y-2">
                  <Label>Tax ID</Label>
                  <p className="text-sm font-medium">{businessInfo.taxId || 'Not provided'}</p>
                </div>

                <div className="space-y-2">
                  <Label>Business Description</Label>
                  <p className="text-sm font-medium">{businessInfo.businessDescription}</p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleVendorRegistration}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      'Confirm & Register'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Already a vendor?{' '}
              <Link href="/auth/login" className="font-medium text-brand-navy hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
