'use client'

import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Stagger delay in seconds — useful for sequencing siblings. */
  delay?: number
  /** Direction the content rises in from. */
  from?: 'up' | 'left' | 'right'
  as?: 'div' | 'section'
}

const OFFSETS: Record<NonNullable<RevealProps['from']>, { x?: number; y?: number }> = {
  up: { y: 28 },
  left: { x: -28 },
  right: { x: 28 },
}

/**
 * Fades + rises content into place the first time it enters the viewport.
 * Used throughout the homepage instead of ad-hoc transitions so every
 * section reveal shares the same easing and timing.
 */
export default function Reveal({ children, className, delay = 0, from = 'up', as = 'div' }: RevealProps) {
  const offset = OFFSETS[from]
  const variants: Variants = {
    hidden: { opacity: 0, x: offset.x ?? 0, y: offset.y ?? 0 },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
    },
  }

  const MotionTag = as === 'section' ? motion.section : motion.div

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
      variants={variants}
    >
      {children}
    </MotionTag>
  )
}
