import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdminRole } from '@/lib/rbac/utils'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_STATUSES = ['pending', 'reviewed', 'dismissed', 'actioned']

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePlatformAdminRole(['support_admin'])
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { status } = body as { status?: string }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: report, error } = await supabase
      .from('review_reports')
      .update({ status, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, status')
      .single()

    if (error || !report) {
      console.error('Error updating review report:', error)
      return NextResponse.json({ error: 'Failed to update review report' }, { status: 500 })
    }

    return NextResponse.json({ success: true, report })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
