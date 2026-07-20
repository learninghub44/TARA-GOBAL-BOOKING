'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import HeroSearch from './HeroSearch'

const MARKERS = [
  { x: '18%', delay: 0 },
  { x: '38%', delay: 0.6 },
  { x: '61%', delay: 1.1 },
  { x: '82%', delay: 1.7 },
]

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[92vh] items-center justify-center overflow-hidden bg-brand-navy-deep"
    >
      {/* Layer 1 — photographic backdrop, slow parallax on scroll */}
      <motion.div style={{ y: imageY }} className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1516426122078-c23e76319801?w=2000&q=80&auto=format&fit=crop"
          alt="Savanna landscape at dusk"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      {/* Layer 2 — animated dusk gradient wash, ties the photo to brand color */}
      <div className="animate-sky-drift absolute inset-0 bg-gradient-to-br from-brand-navy-deep/95 via-brand-navy/80 to-brand-ember/40 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-deep via-brand-navy-deep/30 to-transparent" />

      {/* Layer 3 — slow-drifting decorative glow, ambient not distracting */}
      <div className="animate-drift-slow absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-brand-orange/20 blur-[110px]" />
      <div className="animate-drift-slow absolute bottom-0 left-[-8%] h-[360px] w-[360px] rounded-full bg-brand-gold/20 blur-[100px]" style={{ animationDelay: '4s' }} />

      {/* Layer 4 — content */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pt-24 pb-20 text-center sm:px-6"
      >
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-white/80 backdrop-blur-md"
        >
          Tours · Accommodation · Rentals · Adventures
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="text-balance font-display text-5xl leading-[1.05] font-medium text-white sm:text-6xl md:text-7xl"
        >
          East Africa, planned <span className="italic text-brand-orange">beautifully.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-5 max-w-xl text-balance text-lg text-white/80"
        >
          One marketplace for guided tours, trusted travel services, car rentals, and
          adventures — booked directly with the people who run them.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-9 w-full"
        >
          <HeroSearch />
        </motion.div>
      </motion.div>

      {/* Layer 5 — signature horizon ridge with glowing destination markers */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <svg viewBox="0 0 1440 160" preserveAspectRatio="none" className="h-28 w-full sm:h-36">
          <path
            d="M0,160 L0,86 L80,72 L160,96 L230,54 L300,78 L370,30 L440,64 L520,42 L590,80 L660,20 L740,60 L810,38 L890,72 L960,46 L1040,82 L1110,34 L1190,66 L1270,44 L1350,76 L1440,50 L1440,160 Z"
            fill="var(--brand-sand)"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-16 flex justify-center sm:bottom-20">
          <div className="relative h-0 w-full max-w-5xl px-4">
            {MARKERS.map((marker) => (
              <span
                key={marker.x}
                className="animate-glow-pulse absolute h-2 w-2 rounded-full bg-brand-orange shadow-[0_0_16px_4px_rgba(240,145,35,0.55)]"
                style={{ left: marker.x, animationDelay: `${marker.delay}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
