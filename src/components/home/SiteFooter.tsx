import Image from 'next/image'
import Link from 'next/link'

const EXPLORE_LINKS = [
  { href: '/tours', label: 'Tours' },
  { href: '/travel-services', label: 'Travel Services' },
  { href: '/car-rentals', label: 'Car Rentals' },
  { href: '/adventures', label: 'Adventures' },
]

const COMPANY_LINKS = [
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
]

const BUSINESS_LINKS = [
  { href: '/vendor/register', label: 'Partner with Us' },
  { href: '/auth/login', label: 'Vendor Login' },
]

export default function SiteFooter() {
  return (
    <footer className="bg-brand-navy-deep px-4 py-14 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src="/logo-horizontal.png"
              alt="TARA — Tours, Accommodation, Rentals & Adventures"
              width={831}
              height={200}
              className="h-8 w-auto brightness-0 invert"
            />
            <p className="mt-4 max-w-xs text-sm text-white/50">
              One marketplace for tours, travel services, car rentals, and adventures
              across East Africa.
            </p>
          </div>
          <FooterColumn title="Explore" links={EXPLORE_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="For Business" links={BUSINESS_LINKS} />
        </div>
        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-white/40">
          <p>&copy; {new Date().getFullYear()} TARA. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
