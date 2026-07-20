'use client'

import { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface ListingGalleryProps {
  images: string[]
  title: string
  /** Overlaid content — badge, title, rating, location. Rendered above the image. */
  children?: React.ReactNode
}

/**
 * Hero image for the listing detail page. Previously only ever rendered
 * images[0] even though the gallery could hold several photos — this shows
 * all of them, lets the visitor click through, and falls back to a proper
 * placeholder (not a blank gradient box) when a photo is missing or fails to
 * load.
 */
export default function ListingGallery({ images, title, children }: ListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [failed, setFailed] = useState<Record<number, boolean>>({})

  const activeSrc = images[activeIndex]
  const activeFailed = !activeSrc || failed[activeIndex]

  return (
    <section className="relative bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
      <div className="relative h-[360px]">
        {activeFailed ? (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-12 w-12 text-white/70" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeSrc}
            alt={`${title} photo ${activeIndex + 1}`}
            className="w-full h-full object-cover"
            loading="eager"
            onError={() => setFailed((prev) => ({ ...prev, [activeIndex]: true }))}
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-6 left-0 right-0 max-w-6xl mx-auto px-4">{children}</div>
      </div>

      {images.length > 1 && (
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`View photo ${i + 1} of ${images.length}`}
              aria-current={i === activeIndex}
              className={`relative h-16 w-24 shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                i === activeIndex ? 'border-white' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              {failed[i] ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-700">
                  <ImageOff className="h-4 w-4 text-white/70" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setFailed((prev) => ({ ...prev, [i]: true }))}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
