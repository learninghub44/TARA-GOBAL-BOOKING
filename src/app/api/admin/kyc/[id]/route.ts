import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdminRole } from '@/lib/rbac/utils'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePlatformAdminRole(['kyc_admin'])
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { decision, notes } = body as { decision?: 'approved' | 'rejected' | 'manual_review'; notes?: string }

    if (!decision || !['approved', 'rejected', 'manual_review'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be approved, rejected, or manual_review' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: tenant, error } = await supabase
      .from('tenants')
      .update({
        verification_status: decision,
        kyc_notes: notes ?? null,
        kyc_completed_at: decision === 'approved' || decision === 'rejected' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select('id, business_name, verification_status')
      .single()

    if (error || !tenant) {
      console.error('Error updating tenant verification:', error)
      return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 })
    }

    // Mirror the decision on the most recent kyc_verifications row for the audit trail.
    const { data: latestVerification } = await supabase
      .from('kyc_verifications')
      .select('id')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestVerification) {
      await supabase
        .from('kyc_verifications')
        .update({
          status: decision,
          manual_review_notes: notes ?? null,
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', latestVerification.id)
    }

    return NextResponse.json({ success: true, tenant })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
