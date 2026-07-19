'use client'

import { useEffect, useRef } from 'react'

interface MapProps {
  latitude: number
  longitude: number
  zoom?: number
  markers?: Array<{
    latitude: number
    longitude: number
    title?: string
    description?: string
  }>
  height?: string
  className?: string
}

export default function Map({
  latitude,
  longitude,
  zoom = 13,
  markers = [],
  height = '400px',
  className = '',
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    // Load Leaflet CSS and JS dynamically
    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return

      // Load CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // Load JS
      const L = await import('leaflet')
      
      if (mapRef.current && !mapInstanceRef.current) {
        // Initialize map
        const map = L.map(mapRef.current).setView([latitude, longitude], zoom)
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map)

        // Add main marker
        const mainIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        })

        L.marker([latitude, longitude], { icon: mainIcon })
          .addTo(map)
          .bindPopup('Location')
          .openPopup()

        // Add additional markers
        markers.forEach((marker) => {
          const markerIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          })

          const markerInstance = L.marker([marker.latitude, marker.longitude], { icon: markerIcon })
            .addTo(map)

          if (marker.title || marker.description) {
            markerInstance.bindPopup(`
              <div>
                ${marker.title ? `<strong>${marker.title}</strong><br>` : ''}
                ${marker.description || ''}
              </div>
            `)
          }
        })

        mapInstanceRef.current = map
      }
    }

    loadLeaflet()

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [latitude, longitude, zoom, markers])

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%' }}
      className={`rounded-lg border ${className}`}
    />
  )
}

// Utility function to get coordinates from address using Nominatim (OpenStreetMap geocoding)
export async function geocodeAddress(address: string): Promise<{
  latitude: number
  longitude: number
  display_name: string
} | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    )
    
    if (!response.ok) {
      throw new Error('Geocoding failed')
    }

    const data = await response.json()
    
    if (data.length === 0) {
      return null
    }

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// Utility function to get address from coordinates (reverse geocoding)
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    )
    
    if (!response.ok) {
      throw new Error('Reverse geocoding failed')
    }

    const data = await response.json()
    
    return data.display_name || null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}
