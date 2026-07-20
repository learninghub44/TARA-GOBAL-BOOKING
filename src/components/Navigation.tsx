'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Menu,
  X,
  Search,
  Home,
  MessageCircle,
  Compass,
  LogOut,
  Settings,
  LayoutDashboard,
  User,
} from 'lucide-react'

const EXPLORE_LINKS = [
  { href: '/tours', label: 'Tours', description: 'Guided tours and experiences' },
  { href: '/travel-services', label: 'Travel Services', description: 'Flights, hotels, and travel assistance' },
  { href: '/car-rentals', label: 'Car Rentals', description: 'Rent vehicles for your journey' },
  { href: '/adventures', label: 'Adventures', description: 'Thrilling activities and experiences' },
]

const RAIL_LINKS = [
  { href: '/listings', label: 'Search', icon: Search },
  { href: '/', label: 'Home', icon: Home },
  { href: '/contact', label: 'Support', icon: MessageCircle },
  { href: '/listings', label: 'Explore', icon: Compass },
]

const MOBILE_TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/listings', label: 'Search', icon: Search },
  { href: '/listings', label: 'Explore', icon: Compass },
  { href: '/contact', label: 'Support', icon: MessageCircle },
]

export default function Navigation() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [menuFlyoutOpen, setMenuFlyoutOpen] = useState(false)
  const [railExpanded, setRailExpanded] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const pathname = usePathname()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!menuFlyoutOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setMenuFlyoutOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuFlyoutOpen])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const userInitial = user?.user_metadata?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()

  return (
    <>
      {/* Desktop glass rail — collapsed icon strip that expands with labels on hover */}
      <motion.aside
        onHoverStart={() => setRailExpanded(true)}
        onHoverEnd={() => setRailExpanded(false)}
        animate={{ width: railExpanded ? 224 : 80 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-y-0 left-0 z-50 hidden flex-col justify-between border-r border-white/10 py-6 backdrop-blur-xl transition-colors duration-300 md:flex ${
          scrolled ? 'bg-brand-navy-deep/90' : 'bg-brand-navy-deep/70'
        }`}
      >
        <div className="flex flex-col gap-1 px-4">
          <Link href="/" className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
            <Image src="/logo-icon.png" alt="TARA" width={28} height={28} className="h-7 w-7 shrink-0" />
          </Link>

          <div ref={flyoutRef} className="relative">
            <RailItem
              icon={menuFlyoutOpen ? X : Menu}
              label="Menu"
              expanded={railExpanded}
              active={menuFlyoutOpen}
              onClick={() => setMenuFlyoutOpen((open) => !open)}
              ariaExpanded={menuFlyoutOpen}
            />

            <AnimatePresence>
              {menuFlyoutOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-full top-0 ml-3 w-72 rounded-xl border border-white/10 bg-brand-navy-deep/95 p-2 shadow-2xl backdrop-blur-xl"
                >
                  {EXPLORE_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuFlyoutOpen(false)}
                      className="block rounded-lg px-3 py-2 transition-colors hover:bg-white/10"
                    >
                      <div className="text-sm font-medium text-white">{link.label}</div>
                      <div className="text-xs text-white/50">{link.description}</div>
                    </Link>
                  ))}
                  <div className="my-2 border-t border-white/10" />
                  <Link
                    href="/about"
                    onClick={() => setMenuFlyoutOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    About
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMenuFlyoutOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Contact
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {RAIL_LINKS.map((link) => (
            <RailItem
              key={link.label}
              icon={link.icon}
              label={link.label}
              expanded={railExpanded}
              active={pathname === link.href}
              href={link.href}
            />
          ))}
        </div>

        <div className="flex flex-col items-stretch gap-2 px-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/10">
                <Avatar className="h-9 w-9 shrink-0 cursor-pointer">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.name} />
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
                {railExpanded && (
                  <span className="truncate text-sm text-white/80">
                    {user.user_metadata?.name || 'Account'}
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start" side="right">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.user_metadata?.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = '/dashboard'}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <RailItem icon={User} label="Sign in" expanded={railExpanded} href="/auth/login" />
          )}
        </div>
      </motion.aside>

      {/* Desktop top-right auth bar */}
      <div className="fixed right-4 top-4 z-50 hidden md:flex md:items-center md:gap-3">
        {!user && (
          <>
            <Link href="/auth/login">
              <Button variant="ghost" className="bg-white/90 backdrop-blur hover:bg-white">Sign in</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Get Started</Button>
            </Link>
          </>
        )}
      </div>

      {/* Mobile top bar */}
      <nav
        className={`sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-xl transition-colors md:hidden ${
          scrolled ? 'bg-brand-navy-deep/95' : 'bg-brand-navy-deep/80'
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-horizontal.png"
              alt="TARA — Tours, Accommodation, Rentals & Adventures"
              width={831}
              height={200}
              priority
              className="h-8 w-auto brightness-0 invert"
            />
          </Link>
          <button
            className="text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-white/10"
            >
              <div className="space-y-1 px-4 py-4">
                {EXPLORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-lg px-2 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link href="/about" className="block rounded-lg px-2 py-2 text-sm font-medium text-white/90 hover:bg-white/10">
                  About
                </Link>
                <Link href="/contact" className="block rounded-lg px-2 py-2 text-sm font-medium text-white/90 hover:bg-white/10">
                  Contact
                </Link>
                <div className="space-y-2 border-t border-white/10 pt-4">
                  {user ? (
                    <>
                      <Link href="/dashboard">
                        <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10 hover:text-white">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Dashboard
                        </Button>
                      </Link>
                      <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-white hover:bg-white/10 hover:text-white">
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/auth/login">
                        <Button variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white">
                          Sign in
                        </Button>
                      </Link>
                      <Link href="/auth/register">
                        <Button className="w-full">Get Started</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-brand-navy-deep/95 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon
            const active = pathname === tab.href
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[0.65rem] transition-colors ${
                  active ? 'text-brand-orange' : 'text-white/60'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </Link>
            )
          })}
          {user ? (
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="flex flex-col items-center gap-1 py-2.5 text-[0.65rem] text-white/60"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={user.user_metadata?.avatar_url} alt="" />
                <AvatarFallback className="text-[0.55rem]">{userInitial}</AvatarFallback>
              </Avatar>
              Account
            </button>
          ) : (
            <Link href="/auth/login" className="flex flex-col items-center gap-1 py-2.5 text-[0.65rem] text-white/60">
              <User className="h-5 w-5" />
              Account
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}

function RailItem({
  icon: Icon,
  label,
  expanded,
  active = false,
  href,
  onClick,
  ariaExpanded,
}: {
  icon: typeof Home
  label: string
  expanded: boolean
  active?: boolean
  href?: string
  onClick?: () => void
  ariaExpanded?: boolean
}) {
  const content = (
    <span
      className={`flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white ${
        active ? 'bg-white/10 text-white' : ''
      }`}
      title={label}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <AnimatePresence>
        {expanded && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18 }}
            className="whitespace-nowrap text-sm font-medium"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )

  if (href) {
    return (
      <Link href={href} aria-label={label}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} aria-expanded={ariaExpanded} className="w-full text-left">
      {content}
    </button>
  )
}
