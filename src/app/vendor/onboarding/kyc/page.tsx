'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function KYCVerificationPage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [manualReview, setManualReview] = useState(false)
  
  const [kycData, setKycData] = useState({
    documentType: '',
    documentNumber: '',
    expiryDate: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    country: '',
  })

  const supabase = createClient()

  const handleKYCSubmission = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in')
        router.push('/auth/login')
        return
      }

      // Get user's tenant
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!userData?.tenant_id) {
        setError('No tenant found. Please complete business registration first.')
        router.push('/vendor/register')
        return
      }

      // Try Didit verification
      const diditResponse = await fetch('/api/kyc/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...kycData,
          tenantId: userData.tenant_id,
        }),
      })

      const result = await diditResponse.json()

      if (result.success && result.confidenceScore >= 0.7) {
        // KYC successful
        setSuccess(true)
        setTimeout(() => {
          router.push('/vendor/dashboard')
        }, 2000)
      } else {
        // Fallback to manual review
        setManualReview(true)
        setError('Automatic verification could not be completed. Your documents have been submitted for manual review.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Your documents have been submitted for manual review.')
      setManualReview(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSkipForNow = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!userData?.tenant_id) {
        router.push('/vendor/register')
        return
      }

      // Create manual review record
      await supabase
        .from('kyc_verifications')
        .insert({
          tenant_id: userData.tenant_id,
          provider: 'manual',
          status: 'manual_review',
          verification_data: { skipped: true },
        })

      router.push('/vendor/dashboard')
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
            <CardTitle className="text-2xl font-bold text-center">Verification Complete</CardTitle>
            <CardDescription className="text-center">
              Your business has been verified successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Redirecting to your dashboard...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (manualReview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Manual Review Required</CardTitle>
            <CardDescription className="text-center">
              Your documents have been submitted for manual review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Our team will review your documents within 1-2 business days. You can continue using the platform with limited functionality.
              </AlertDescription>
            </Alert>
            <Button
              className="w-full"
              onClick={() => router.push('/vendor/dashboard')}
            >
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">KYC Verification</h1>
          <p className="text-gray-600">Verify your business identity to unlock all features</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business Verification</CardTitle>
            <CardDescription>
              Please provide your business identification documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleKYCSubmission} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">Document Type *</Label>
                <Select
                  value={kycData.documentType}
                  onValueChange={(value) => setKycData({ ...kycData, documentType: value ?? '' })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="driving_license">Driving License</SelectItem>
                    <SelectItem value="business_license">Business License</SelectItem>
                    <SelectItem value="tax_certificate">Tax Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentNumber">Document Number *</Label>
                <Input
                  id="documentNumber"
                  value={kycData.documentNumber}
                  onChange={(e) => setKycData({ ...kycData, documentNumber: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date *</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={kycData.expiryDate}
                  onChange={(e) => setKycData({ ...kycData, expiryDate: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={kycData.firstName}
                    onChange={(e) => setKycData({ ...kycData, firstName: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={kycData.lastName}
                    onChange={(e) => setKycData({ ...kycData, lastName: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={kycData.dateOfBirth}
                  onChange={(e) => setKycData({ ...kycData, dateOfBirth: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Issuing Country *</Label>
                <Select
                  value={kycData.country}
                  onValueChange={(value) => setKycData({ ...kycData, country: value ?? '' })}
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
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Submit for Verification'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipForNow}
                  disabled={loading}
                >
                  Skip for Now
                </Button>
              </div>
            </form>

            <Alert className="mt-4">
              <AlertDescription>
                Your information is encrypted and securely processed. We use Didit for automated verification, with manual review as a backup.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
