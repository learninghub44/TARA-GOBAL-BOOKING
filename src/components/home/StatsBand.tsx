import AnimatedCounter from './AnimatedCounter'
import Reveal from './Reveal'

export interface StatItem {
  label: string
  value: number
  suffix?: string
}

export default function StatsBand({ stats }: { stats: StatItem[] }) {
  return (
    <section className="border-y border-white/10 bg-brand-navy-deep py-14">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={0.08 * i} className="text-center">
            <div className="font-display text-4xl font-medium text-white sm:text-5xl">
              <AnimatedCounter value={stat.value} suffix={stat.suffix ?? '+'} />
            </div>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-white/50">{stat.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
