'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface AuthShellProps {
  /** Small uppercase label above the headline, e.g. "Welcome back". */
  eyebrow: string
  headline: ReactNode
  copy: string
  image: string
  imageAlt: string
  children: ReactNode
}

/**
 * Split-screen shell shared by the customer-facing auth pages. Left panel
 * carries the same dusk-navy motion language as the homepage Hero (photo +
 * gradient wash + drifting glow), with a jagged "horizon" seam standing in
 * for the straight divider a generic split layout would use. Right panel
 * is the form, on the sand neutral.
 */
export default function AuthShell({ eyebrow, headline, copy, image, imageAlt, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-brand-sand lg:flex">
      {/* Visual panel */}
      <div
        className="relative hidden overflow-hidden bg-brand-navy-deep lg:flex lg:w-[44%] lg:flex-col lg:justify-between"
        style={{
          clipPath:
            'polygon(0 0, 100% 0, 100% 6%, 96% 12%, 100% 18%, 97% 26%, 100% 34%, 95% 42%, 100% 50%, 96% 58%, 100% 66%, 94% 74%, 100% 82%, 97% 90%, 100% 96%, 100% 100%, 0 100%)',
        }}
      >
        <Image src={image} alt={imageAlt} fill priority sizes="44vw" className="object-cover" />
        <div className="animate-sky-drift absolute inset-0 bg-gradient-to-br from-brand-navy-deep/95 via-brand-navy/80 to-brand-ember/35 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-deep via-brand-navy-deep/20 to-transparent" />
        <div className="animate-drift-slow absolute -top-24 right-[-10%] h-[340px] w-[340px] rounded-full bg-brand-orange/20 blur-[100px]" />
        <div
          className="animate-drift-slow absolute bottom-10 left-[-10%] h-[280px] w-[280px] rounded-full bg-brand-gold/20 blur-[90px]"
          style={{ animationDelay: '4s' }}
        />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.25em] text-white/70">
            <Image src="/logo-icon.png" alt="" width={22} height={22} className="h-5 w-5" />
            TARA
          </Link>

          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
              {eyebrow}
            </span>
            <h2 className="max-w-sm text-balance font-display text-4xl leading-[1.1] font-medium text-white xl:text-[2.75rem]">
              {headline}
            </h2>
            <p className="mt-4 max-w-xs text-sm text-white/70">{copy}</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col justify-center px-6 py-14 sm:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
            <Image src="/logo-horizontal.png" alt="TARA" width={120} height={30} className="h-7 w-auto" />
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
