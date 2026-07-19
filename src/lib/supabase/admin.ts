import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client for trusted server-side operations only
// (payment webhooks, public booking writes). Never import this into
// client components or expose the service role key to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service role configuration')
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
