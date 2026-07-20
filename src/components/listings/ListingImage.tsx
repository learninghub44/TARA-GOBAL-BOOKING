'use client'

import { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface ListingImageProps {
  src?: string | null
  alt: string
  className?: string
  /** Tailwind gradient classes shown behind/instead of the image */
  fallbackClassName?: string
}

/**
 * Drop-in replacement for a bare <img> on listing cards.
 * - Shows a branded gradient + icon placeholder when there's no image, or the
 *   image fails to load, instead of a blank box.
 * - Fades the image in once it's actually loaded, so slow connections don't
 *   show a flash of broken/empty content.
 * - Lazy-loads by default since these render inside grids, often off-screen.
 */
export default function ListingImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackClassName = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-navy to-brand-ember',
}: ListingImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error')

  if (!src || status === 'error') {
    return (
      <div className={fallbackClassName} role="img" aria-label={alt}>
        <ImageOff className="h-8 w-8 text-white/70" />
      </div>
    )
  }

  return (
    <>
      {status === 'loading' && (
        <div className={`${fallbackClassName} animate-pulse absolute inset-0`} aria-hidden="true" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={`${className} transition-opacity duration-300 ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  )
}
