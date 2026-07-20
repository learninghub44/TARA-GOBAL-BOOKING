import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import Reveal from './Reveal'
import HorizonDivider from './HorizonDivider'

export interface CategoryTile {
  letter: string
  href: string
  label: string
  description: string
  image: string
  count: number
}

export default function CategoryShowcase({ categories }: { categories: CategoryTile[] }) {
  const [primary, ...rest] = categories

  return (
    <section className="relative bg-brand-sand py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <div className="mb-4 flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-brand-navy/50">
            {categories.map((c, i) => (
              <span key={c.letter} className="flex items-center gap-3">
                <span className={i === 0 ? 'text-brand-ember' : ''}>{c.letter}</span>
                {i < categories.length - 1 && <span className="text-brand-navy/20">—</span>}
              </span>
            ))}
          </div>
          <h2 className="font-display text-4xl font-medium text-brand-navy sm:text-5xl">
            Everything for the trip, in one place
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:grid-rows-2">
          {primary && (
            <Reveal from="left" className="lg:col-span-2 lg:row-span-2">
              <CategoryCard tile={primary} large />
            </Reveal>
          )}
          {rest.map((tile, i) => (
            <Reveal key={tile.href} from="right" delay={0.1 * (i + 1)}>
              <CategoryCard tile={tile} />
            </Reveal>
          ))}
        </div>
      </div>
      <HorizonDivider tone="navy" className="mt-20 sm:mt-28" />
    </section>
  )
}

function CategoryCard({ tile, large = false }: { tile: CategoryTile; large?: boolean }) {
  return (
    <Link
      href={tile.href}
      className={`group relative flex h-full flex-col justify-end overflow-hidden rounded-2xl ring-1 ring-brand-navy/10 ${
        large ? 'aspect-[4/3] lg:aspect-auto lg:min-h-[420px]' : 'aspect-[4/3]'
      }`}
    >
      <Image
        src={`${tile.image}?w=1200&q=80&auto=format&fit=crop`}
        alt={tile.label}
        fill
        sizes={large ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 1024px) 30vw, 100vw'}
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-deep via-brand-navy-deep/25 to-transparent transition-opacity duration-500 group-hover:from-brand-navy-deep/90" />

      <div className="relative flex items-end justify-between gap-3 p-5 sm:p-6">
        <div>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-brand-orange">
            {tile.count > 0 ? `${tile.count}+ available` : 'Coming soon'}
          </span>
          <h3 className={`mt-1 font-display font-medium text-white ${large ? 'text-3xl' : 'text-xl'}`}>
            {tile.label}
          </h3>
          <p className="mt-1 max-w-xs text-sm text-white/70">{tile.description}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-brand-orange">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}
