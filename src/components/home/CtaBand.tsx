import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Reveal from './Reveal'

export default function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-brand-sand py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="relative overflow-hidden rounded-3xl bg-brand-navy-deep px-6 py-16 text-center sm:px-16 sm:py-20">
          <div className="animate-sky-drift absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-ember/50 to-brand-orange/40" />
          <div className="animate-drift-slow absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-orange/25 blur-[100px]" />

          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance font-display text-4xl font-medium text-white sm:text-5xl">
              Ready when you are.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-balance text-white/80">
              Create a free account to book directly with verified tour operators, hosts,
              and rental partners across East Africa.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-sand"
              >
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/listings"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                Browse listings
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
