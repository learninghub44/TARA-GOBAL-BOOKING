import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdminRole } from '@/lib/rbac/utils'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed']

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdminRole(['support_admin'])
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { status } = body as { status?: string }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', id)
      .select('id, ticket_number, status')
      .single()

    if (error || !ticket) {
      console.error('Error updating support ticket:', error)
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : message.includes('admin') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
