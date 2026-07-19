'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ListingType } from '@/types/listings'

const TYPE_TITLES: Record<ListingType, string> = {
  tour: 'New Tour',
  travel_service: 'New Travel Service',
  car_rental: 'New Car Rental',
  adventure: 'New Adventure Activity',
}

function NewListingForm() {
  const params = useSearchParams()
  const router = useRouter()
  const type = (params.get('type') as ListingType) || 'tour'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const payload: Record<string, unknown> = { type }
    fd.forEach((value, key) => {
      if (value !== '') payload[key] = value
    })
    payload.price_per_person = fd.get('price_per_person') === 'on'

    try {
      const res = await fetch('/api/vendor/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create listing')
      router.push('/vendor/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{TYPE_TITLES[type]}</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Title" name="title" required />
              <div>
                <Label htmlFor="short_description">Short description</Label>
                <Input id="short_description" name="short_description" className="mt-1" maxLength={500} />
              </div>
              <div>
                <Label htmlFor="description">Full description</Label>
                <Textarea id="description" name="description" required rows={5} className="mt-1" />
              </div>
              <Field label="Primary image URL" name="primary_image_url" />

              {(type === 'tour' || type === 'travel_service') && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Destination country" name="destination_country" required />
                  <Field label="Destination city" name="destination_city" />
                </div>
              )}
              {(type === 'car_rental' || type === 'adventure') && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Location country" name="location_country" required />
                  <Field label="Location city" name="location_city" />
                </div>
              )}

              {type === 'tour' && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Base price" name="base_price" type="number" required />
                  <Field label="Duration (days)" name="duration_days" type="number" required />
                  <Field label="Max group size" name="max_group_size" type="number" />
                  <Field label="Difficulty level" name="difficulty_level" />
                </div>
              )}

              {type === 'travel_service' && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Service type" name="service_type" required placeholder="e.g. airport_transfer" />
                  <Field label="Base price" name="base_price" type="number" required />
                  <Field label="Price unit" name="price_per_unit" placeholder="e.g. per trip" />
                </div>
              )}

              {type === 'car_rental' && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Make" name="make" />
                  <Field label="Model" name="model" />
                  <Field label="Year" name="year" type="number" />
                  <Field label="Seating capacity" name="seating_capacity" type="number" />
                  <Field label="Transmission" name="transmission_type" placeholder="automatic / manual" />
                  <Field label="Fuel type" name="fuel_type" placeholder="petrol / diesel / electric" />
                  <Field label="Daily rate" name="daily_rate" type="number" required />
                  <Field label="Minimum rental days" name="minimum_rental_days" type="number" />
                  <Field label="Pickup location" name="pickup_location" />
                </div>
              )}

              {type === 'adventure' && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Activity type" name="activity_type" required placeholder="e.g. hiking" />
                  <Field label="Base price" name="base_price" type="number" required />
                  <Field label="Duration (hours)" name="duration_hours" type="number" />
                  <Field label="Difficulty level" name="difficulty_level" />
                  <Field label="Group size minimum" name="group_size_minimum" type="number" />
                  <Field label="Group size maximum" name="group_size_maximum" type="number" />
                </div>
              )}

              <p className="text-xs text-gray-500">
                New listings are created as drafts. Activate them from your dashboard once
                verification is complete.
              </p>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Creating...' : 'Create Listing'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  required = false,
  placeholder,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <div>
      <Label htmlFor={name}>
        {label}
        {required ? ' *' : ''}
      </Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} className="mt-1" />
    </div>
  )
}

export default function NewListingPage() {
  return (
    <Suspense fallback={null}>
      <NewListingForm />
    </Suspense>
  )
}
