import { createClient } from '@/lib/supabase/server'
import { initiateDiditVerification, shouldFallbackToManualReview } from '@/lib/kyc/didit'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { documentType, documentNumber, expiryDate, firstName, lastName, dateOfBirth, country, tenantId } = body

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
    console.error('KYC verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
