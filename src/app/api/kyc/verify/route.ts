import { createClient } from '@/lib/supabase/server'
import { requireTenantAuth } from '@/lib/rbac/utils'
import { initiateDiditVerification, shouldFallbackToManualReview } from '@/lib/kyc/didit'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, { name: 'kyc:verify', max: 5, windowSeconds: 3600 })
  if (limited) return limited

  try {
    // Previously accepted tenantId from the request body with no auth check,
    // so any caller could submit (or overwrite) KYC data for any tenant.
    // Require a session and scope tenantId to the caller's own tenant.
    const authedUser = await requireTenantAuth()

    const body = await request.json()
    const { documentType, documentNumber, expiryDate, firstName, lastName, dateOfBirth, country } = body
    const tenantId = authedUser.tenant_id

    if (!documentType || !documentNumber || !expiryDate || !firstName || !lastName || !dateOfBirth || !country || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Try Didit verification
    const diditResponse = await initiateDiditVerification({
      documentType,
      documentNumber,
      expiryDate,
      firstName,
      lastName,
      dateOfBirth,
      country,
    })

    // Create KYC verification record
    const kycRecord: any = {
      tenant_id: tenantId,
      provider: 'didit',
      provider_reference_id: diditResponse.referenceId,
      status: diditResponse.status,
      confidence_score: diditResponse.confidenceScore,
      document_type: documentType,
      document_number: documentNumber,
      expiry_date: expiryDate,
      verification_data: diditResponse.data || {},
    }

    if (shouldFallbackToManualReview(diditResponse)) {
      // Fallback to manual review
      kycRecord.status = 'manual_review'
      kycRecord.provider = 'manual'
      kycRecord.failure_reason = diditResponse.error || 'Low confidence score'

      const { error: insertError } = await supabase
        .from('kyc_verifications')
        .insert(kycRecord)

      if (insertError) {
        console.error('Error creating KYC record:', insertError)
      }

      return NextResponse.json({
        success: false,
        confidenceScore: diditResponse.confidenceScore,
        status: 'manual_review',
        error: diditResponse.error,
      })
    }

    // Successful verification
    const { error: insertError } = await supabase
      .from('kyc_verifications')
      .insert(kycRecord)

    if (insertError) {
      console.error('Error creating KYC record:', insertError)
      return NextResponse.json(
        { error: 'Failed to create KYC record' },
        { status: 500 }
      )
    }

    // Update tenant verification status
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        verification_status: 'approved',
        kyc_provider: 'didit',
        kyc_reference_id: diditResponse.referenceId,
        kyc_completed_at: new Date().toISOString(),
      })
      .eq('id', tenantId)

    if (updateError) {
      console.error('Error updating tenant status:', updateError)
    }

    return NextResponse.json({
      success: true,
      confidenceScore: diditResponse.confidenceScore,
      status: diditResponse.status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message === 'Unauthorized' || message === 'Account is inactive') {
      return NextResponse.json({ error: message }, { status: 401 })
    }
    if (message === 'No tenant associated with user') {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('KYC verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
