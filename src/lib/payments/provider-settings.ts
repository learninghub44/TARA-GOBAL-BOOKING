import { createAdminClient } from '@/lib/supabase/admin'

export type PaymentProvider = 'paystack' | 'pesapal' | 'mpesa'

export interface ProviderSetting {
  id: string
  provider: PaymentProvider
  display_name: string
  is_enabled: boolean
  is_default: boolean
  priority: number
  notes: string | null
  updated_at: string
  has_credentials: boolean // derived from env, not stored
}

const CREDENTIAL_CHECKS: Record<PaymentProvider, () => boolean> = {
  paystack: () => !!process.env.PAYSTACK_SECRET_KEY,
  pesapal: () => !!(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET),
  mpesa: () =>
    !!(
      process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY
    ),
}

export function hasCredentials(provider: PaymentProvider): boolean {
  return CREDENTIAL_CHECKS[provider]?.() ?? false
}

/**
 * All provider settings rows, merged with whether env credentials are
 * actually present. A provider is only usable when BOTH is_enabled (admin
 * toggle) and has_credentials (env vars configured) are true.
 */
export async function getProviderSettings(): Promise<ProviderSetting[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('payment_provider_settings')
    .select('*')
    .order('priority', { ascending: true })

  if (error) {
    console.error('Error fetching payment provider settings:', error)
    return []
  }

  return (data || []).map((row) => ({
    ...row,
    has_credentials: hasCredentials(row.provider as PaymentProvider),
  }))
}

/**
 * Providers that are both enabled by an admin AND have credentials
 * configured, ordered by priority (lowest first).
 */
export async function getUsableProviders(): Promise<PaymentProvider[]> {
  const settings = await getProviderSettings()
  return settings.filter((s) => s.is_enabled && s.has_credentials).map((s) => s.provider)
}

export async function getDefaultProvider(): Promise<PaymentProvider | null> {
  const settings = await getProviderSettings()
  const usable = settings.filter((s) => s.is_enabled && s.has_credentials)
  const explicit = usable.find((s) => s.is_default)
  if (explicit) return explicit.provider
  return usable[0]?.provider ?? null
}

export interface UpdateProviderSettingInput {
  provider: PaymentProvider
  is_enabled?: boolean
  is_default?: boolean
  priority?: number
  notes?: string
}

export async function updateProviderSetting(
  input: UpdateProviderSettingInput,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Only one provider can be default. Clear any existing default first if
  // this update sets is_default = true.
  if (input.is_default === true) {
    await supabase
      .from('payment_provider_settings')
      .update({ is_default: false })
      .neq('provider', input.provider)
  }

  const updates: Record<string, unknown> = { updated_by: updatedBy }
  if (input.is_enabled !== undefined) updates.is_enabled = input.is_enabled
  if (input.is_default !== undefined) updates.is_default = input.is_default
  if (input.priority !== undefined) updates.priority = input.priority
  if (input.notes !== undefined) updates.notes = input.notes

  const { error } = await supabase
    .from('payment_provider_settings')
    .update(updates)
    .eq('provider', input.provider)

  if (error) {
    console.error('Error updating payment provider setting:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
