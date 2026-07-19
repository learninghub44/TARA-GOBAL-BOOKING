export type PlanId = 'monthly' | 'quarterly' | 'annual'

export interface SubscriptionPlan {
  id: PlanId
  name: string
  amount: number
  currency: string
  periodDays: number
  description: string
  features: string[]
}

export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    amount: 2500,
    currency: 'KES',
    periodDays: 30,
    description: 'Billed every month',
    features: ['Unlisted-listing access', 'Booking inbox', 'Standard support'],
  },
  quarterly: {
    id: 'quarterly',
    name: 'Quarterly',
    amount: 6500,
    currency: 'KES',
    periodDays: 90,
    description: 'Billed every 3 months — save ~13%',
    features: ['Everything in Monthly', 'Featured placement rotation', 'Priority support'],
  },
  annual: {
    id: 'annual',
    name: 'Annual',
    amount: 24000,
    currency: 'KES',
    periodDays: 365,
    description: 'Billed once a year — save ~20%',
    features: ['Everything in Quarterly', 'Sponsored badge', 'Dedicated onboarding'],
  },
}

export function getPlan(planId: string): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS[planId as PlanId] || null
}

export function listPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS)
}
