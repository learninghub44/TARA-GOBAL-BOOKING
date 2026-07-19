import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: { code?: string; redirect?: string }
}) {
  const supabase = await createClient()
  const redirectPath = searchParams.redirect || '/dashboard'

  if (searchParams.code) {
    await supabase.auth.exchangeCodeForSession(searchParams.code)
  }

  redirect(redirectPath)
}
