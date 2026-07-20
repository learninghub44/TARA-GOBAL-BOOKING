'use client'

import { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  suffix?: string
  className?: string
}

/** Counts up to `value` once it scrolls into view. Purely presentational —
 *  the number itself always comes from real data passed in by the caller. */
export default function AnimatedCounter({ value, suffix = '', className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { duration: 1200, bounce: 0 })

  useEffect(() => {
    if (inView) motionValue.set(value)
  }, [inView, value, motionValue])

  useEffect(() => {
    return spring.on('change', (latest) => {
      if (ref.current) ref.current.textContent = `${Math.round(latest)}${suffix}`
    })
  }, [spring, suffix])

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  )
}
