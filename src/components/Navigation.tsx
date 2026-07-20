'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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

const RAIL_ICON_CLASS =
  'flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white'

export default function Navigation() {
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [menuFlyoutOpen, setMenuFlyoutOpen] = useState(false)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const userInitial = user?.user_metadata?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()

  return (
    <>
      {/* Desktop icon rail */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-20 flex-col items-center justify-between border-r border-white/10 bg-slate-950 py-6 md:flex">
        <div className="flex flex-col items-center gap-2">
          <Link href="/" className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
            <Image src="/logo-icon.png" alt="TARA" width={28} height={28} className="h-7 w-7" />
          </Link>

          <div ref={flyoutRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuFlyoutOpen((open) => !open)}
              className={RAIL_ICON_CLASS}
              aria-label="Open menu"
              aria-expanded={menuFlyoutOpen}
            >
              {menuFlyoutOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {menuFlyoutOpen && (
              <div className="absolute left-full top-0 ml-3 w-72 rounded-xl border border-white/10 bg-slate-950 p-2 shadow-2xl">
                {EXPLORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuFlyoutOpen(false)}
                    className="block rounded-lg px-3 py-2 hover:bg-white/10"
                  >
                    <div className="text-sm font-medium text-white">{link.label}</div>
                    <div className="text-xs text-white/50">{link.description}</div>
                  </Link>
                ))}
                <div className="my-2 border-t border-white/10" />
                <Link
                  href="/about"
                  onClick={() => setMenuFlyoutOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  About
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMenuFlyoutOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  Contact
                </Link>
              </div>
            )}
          </div>

          <Link href="/listings" className={RAIL_ICON_CLASS} aria-label="Search listings">
            <Search className="h-5 w-5" />
          </Link>
          <Link href="/" className={RAIL_ICON_CLASS} aria-label="Home">
            <Home className="h-5 w-5" />
          </Link>
          <Link href="/contact" className={RAIL_ICON_CLASS} aria-label="Contact support">
            <MessageCircle className="h-5 w-5" />
          </Link>
          <Link href="/listings" className={RAIL_ICON_CLASS} aria-label="Explore categories">
            <Compass className="h-5 w-5" />
          </Link>
        </div>

        <div className="flex flex-col items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar className="h-10 w-10 cursor-pointer">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.name} />
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
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
            <Link href="/auth/login" className={RAIL_ICON_CLASS} aria-label="Sign in">
              <User className="h-5 w-5" />
            </Link>
          )}
        </div>
      </aside>

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
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950 md:hidden">
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

        {mobileMenuOpen && (
          <div className="space-y-1 border-t border-white/10 px-4 py-4">
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
        )}
      </nav>
    </>
  )
}
