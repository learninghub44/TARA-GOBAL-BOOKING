'use client'

import { motion } from 'framer-motion'

interface HorizonDividerProps {
  /** Which side the ridge silhouette sits against. */
  tone?: 'navy' | 'sand'
  /** Flip vertically, used when a section needs the ridge along its top edge. */
  flip?: boolean
  className?: string
}

/**
 * A single reused skyline silhouette — evokes the ridgelines TARA sells
 * trips into. Used at every section seam instead of a generic straight
 * or wave divider so the whole page reads as one continuous horizon.
 */
export default function HorizonDivider({ tone = 'sand', flip = false, className = '' }: HorizonDividerProps) {
  const fill = tone === 'navy' ? 'var(--brand-navy-deep)' : 'var(--brand-sand)'

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative w-full overflow-hidden leading-[0] ${flip ? 'rotate-180' : ''} ${className}`}
      style={{ height: 'clamp(28px, 6vw, 64px)' }}
    >
      <motion.svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="h-full w-full"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <path
          d="M0,120 L0,64 L60,58 L140,70 L210,40 L260,54 L320,20 L360,44 L420,30 L470,52 L540,10 L610,46 L660,28 L720,50 L780,34 L840,58 L900,24 L960,48 L1020,36 L1090,56 L1150,30 L1220,50 L1290,38 L1360,60 L1440,44 L1440,120 Z"
          fill={fill}
        />
      </motion.svg>
    </div>
  )
}
