'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, LocateFixed, Compass, Car, Briefcase, Mountain, Loader2 } from 'lucide-react'
import type { ListingType } from '@/types/listings'

const QUICK_ACTIONS: { label: string; type?: ListingType; icon: typeof Compass }[] = [
  { label: 'Current location', icon: LocateFixed },
  { label: 'Nearby tours', type: 'tour', icon: Compass },
  { label: 'Nearby rentals', type: 'car_rental', icon: Car },
  { label: 'Nearby adventures', type: 'adventure', icon: Mountain },
  { label: 'Nearby travel services', type: 'travel_service', icon: Briefcase },
]

async function reverseGeocodeCountry(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    )
    if (!res.ok) return null
    const data = await res.json()
    return (data.countryName as string) || null
  } catch {
    return null
  }
}

export default function HeroSearch() {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (country) params.set('country', country)
    router.push(`/listings${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    setLocationError(null)

    if (!('geolocation' in navigator)) {
      setLocationError('Location is not available in this browser.')
      return
    }

    setPendingAction(action.label)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const countryName = await reverseGeocodeCountry(latitude, longitude)
        setPendingAction(null)

        const params = new URLSearchParams()
        if (action.type) params.set('type', action.type)
        if (countryName) params.set('country', countryName)
        router.push(`/listings${params.toString() ? `?${params.toString()}` : ''}`)
      },
      () => {
        setPendingAction(null)
        setLocationError('We could not access your location — you can search by name instead.')
      },
      { timeout: 8000 }
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/95 p-3 shadow-[0_30px_80px_-20px_rgba(10,31,56,0.65)] backdrop-blur-xl sm:flex-row sm:items-center sm:gap-2 sm:p-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-brand-navy/40" />
          <input
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where do you want to go?"
            className="h-12 w-full rounded-xl bg-transparent pl-10 pr-3 text-sm text-brand-navy placeholder:text-brand-navy/40 focus:outline-none"
          />
        </div>
        <div className="hidden h-8 w-px bg-brand-navy/10 sm:block" />
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-brand-navy/40" />
          <input
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country"
            className="h-12 w-full rounded-xl bg-transparent pl-10 pr-3 text-sm text-brand-navy placeholder:text-brand-navy/40 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-navy px-6 text-sm font-medium text-white transition-colors hover:bg-brand-ember"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          const isPending = pendingAction === action.label
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => handleQuickAction(action)}
              disabled={pendingAction !== null}
              className="group flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md transition-all hover:border-brand-orange/60 hover:bg-white/20 disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5 text-brand-orange transition-transform group-hover:scale-110" />
              )}
              {action.label}
            </button>
          )
        })}
      </div>
      {locationError && (
        <p className="mt-2 text-center text-xs text-white/70">{locationError}</p>
      )}
    </div>
  )
}
