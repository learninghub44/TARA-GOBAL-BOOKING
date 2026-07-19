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
import { Loader2, CheckCircle2 } from 'lucide-react'

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Business Registered</CardTitle>
            <CardDescription className="text-center">
              Your business has been successfully registered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Redirecting to KYC verification...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Become a TARA Vendor</h1>
          <p className="text-gray-600">Join thousands of businesses on our platform</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              1
            </div>
            <div className={`w-24 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              2
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 ? 'Business Information' : 'Review & Confirm'}
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
                      onValueChange={(value) => setBusinessInfo({ ...businessInfo, businessCountry: value })}
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
            <div className="text-sm text-center text-muted-foreground">
              Already a vendor?{' '}
              <Link href="/vendor/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
