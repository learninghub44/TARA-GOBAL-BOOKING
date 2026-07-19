import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/rbac/utils'

export interface ConversationAccess {
  conversation: {
    id: string
    tenant_id: string
    customer_id: string | null
    customer_email: string | null
    staff_id: string | null
  }
  role: 'staff' | 'customer'
  staffUserId?: string
  staffName?: string
}

/**
 * Authorizes access to a conversation for either:
 *  - a logged-in tenant staff member belonging to the conversation's tenant, or
 *  - a guest/customer who supplies the exact customer_email on the conversation.
 *
 * Returns null if neither check passes -- callers should respond 403/404.
 */
export async function authorizeConversationAccess(
  conversationId: string,
  customerEmail?: string | null
): Promise<ConversationAccess | null> {
  const supabase = createAdminClient()

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, tenant_id, customer_id, customer_email, staff_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (!conversation) return null

  const user = await getCurrentUser()
  if (user && user.tenant_id === conversation.tenant_id) {
    const { data: profile } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle()
    const staffName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : undefined
    return { conversation, role: 'staff', staffUserId: user.id, staffName }
  }

  if (
    customerEmail &&
    conversation.customer_email &&
    customerEmail.trim().toLowerCase() === conversation.customer_email.trim().toLowerCase()
  ) {
    return { conversation, role: 'customer' }
  }

  return null
}
