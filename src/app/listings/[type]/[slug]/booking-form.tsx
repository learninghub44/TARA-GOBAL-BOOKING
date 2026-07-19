'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ListingType } from '@/types/listings'

interface BookingFormProps {
  listingId: string
  listingType: ListingType
  tenantId: string
  title: string
  price: number
  currency: string
  priceIsPerPerson: boolean
  requiresDateRange: boolean
}

export default function BookingForm({
  listingId,
  listingType,
  title,
  price,
  currency,
  priceIsPerPerson,
  requiresDateRange,
}: BookingFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [participants, setParticipants] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const days =
    requiresDateRange && startDate && endDate
      ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
      : 1

  const estimatedTotal = requiresDateRange
    ? price * days
    : priceIsPerPerson
      ? price * participants
      : price

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const payload = {
      listing_id: listingId,
      listing_type: listingType,
      customer_name: formData.get('customer_name'),
      customer_email: formData.get('customer_email'),
      customer_phone: formData.get('customer_phone'),
      start_date: startDate,
      end_date: requiresDateRange ? endDate : startDate,
      number_of_participants: participants,
      special_requests: formData.get('special_requests'),
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      router.push(`/booking/${data.booking.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <Card className="sticky top-24">
      <CardContent className="p-6">
        <div className="mb-4">
          <div className="text-2xl font-bold">
            {currency} {price.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">
            {requiresDateRange ? 'per day' : priceIsPerPerson ? 'per person' : 'total'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customer_name">Full name</Label>
            <Input id="customer_name" name="customer_name" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="customer_email">Email</Label>
            <Input id="customer_email" name="customer_email" type="email" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="customer_phone">Phone</Label>
            <Input id="customer_phone" name="customer_phone" className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start_date">{requiresDateRange ? 'Pickup date' : 'Date'}</Label>
              <Input
                id="start_date"
                type="date"
                required
                className="mt-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {requiresDateRange && (
              <div>
                <Label htmlFor="end_date">Return date</Label>
                <Input
                  id="end_date"
                  type="date"
                  required
                  className="mt-1"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {!requiresDateRange && (
            <div>
              <Label htmlFor="participants">Participants</Label>
              <Input
                id="participants"
                type="number"
                min={1}
                value={participants}
                onChange={(e) => setParticipants(Math.max(1, Number(e.target.value)))}
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="special_requests">Special requests (optional)</Label>
            <Textarea id="special_requests" name="special_requests" className="mt-1" rows={3} />
          </div>

          <div className="border-t pt-4 flex items-center justify-between font-semibold">
            <span>Estimated total</span>
            <span>
              {currency} {estimatedTotal.toLocaleString()}
            </span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? 'Sending request...' : `Request "${title.slice(0, 20)}${title.length > 20 ? '…' : ''}"`}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            You&apos;ll get the vendor&apos;s contact details to arrange payment directly with
            them. TARA doesn&apos;t process this payment.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
