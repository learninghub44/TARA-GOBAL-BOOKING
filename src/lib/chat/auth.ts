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
 *  - a guest/customer who supplies the conversation's access_token (preferred --
 *    an unguessable per-conversation secret issued once at creation), or
 *  - a guest/customer who supplies the exact customer_email (fallback recovery
 *    path only -- weaker, since emails aren't secret; kept so a customer who
 *    lost their token isn't permanently locked out).
 *
 * Returns null if none of these pass -- callers should respond 404 (never
 * leak whether a conversation exists to a failed auth attempt).
 */
export async function authorizeConversationAccess(
  conversationId: string,
  opts?: { customerEmail?: string | null; accessToken?: string | null }
): Promise<ConversationAccess | null> {
  const supabase = createAdminClient()

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, tenant_id, customer_id, customer_email, staff_id, access_token')
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

  if (opts?.accessToken && conversation.access_token && opts.accessToken === conversation.access_token) {
    return { conversation, role: 'customer' }
  }

  if (
    opts?.customerEmail &&
    conversation.customer_email &&
    opts.customerEmail.trim().toLowerCase() === conversation.customer_email.trim().toLowerCase()
  ) {
    return { conversation, role: 'customer' }
  }

  return null
}
