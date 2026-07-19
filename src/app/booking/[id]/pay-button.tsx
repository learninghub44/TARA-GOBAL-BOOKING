'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function PayButton({
  bookingId,
  amount,
  currency,
}: {
  bookingId: string
  amount: number
  currency: string
  email: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/pay`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.payment_url) {
        throw new Error(data.error || 'Could not start payment')
      }
      window.location.href = data.payment_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed to start')
      setLoading(false)
    }
  }

  return (
    <div>
      <Button onClick={handlePay} disabled={loading} className="w-full h-11">
        {loading ? 'Redirecting to payment...' : `Pay ${currency} ${amount.toLocaleString()} now`}
      </Button>
      {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
    </div>
  )
}
