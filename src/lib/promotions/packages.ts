import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface PromotionPackage {
  id: string
  name: string
  slug: string
  promotion_type: string
  placement: string | null
  description: string | null
  price: number
  currency: string
  billing_cycle: 'fixed' | 'daily' | 'weekly' | 'monthly'
  duration_days: number
  max_active_slots: number | null
  is_active: boolean
  sort_order: number
}

export async function getActivePackages(): Promise<PromotionPackage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('promotion_packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching promotion packages:', error.message)
    return []
  }
  return (data || []) as PromotionPackage[]
}

export async function getPackageBySlug(slug: string): Promise<PromotionPackage | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('promotion_packages')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data as PromotionPackage
}

// Admin-only: full catalog including inactive packages, via service role.
export async function getAllPackagesAdmin(): Promise<PromotionPackage[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('promotion_packages')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching promotion packages (admin):', error.message)
    return []
  }
  return (data || []) as PromotionPackage[]
}
