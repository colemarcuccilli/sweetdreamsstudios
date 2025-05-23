'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Studio', href: '/studio' },
  { name: 'Videography', href: '/videography' },
  { name: 'Branding', href: '/branding' },
  { name: 'Contact', href: '/contact' },
]

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user } = useAuth()

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[color:var(--background)] text-[color:var(--foreground)] shadow-md">
      <nav className="container flex items-center justify-between py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-5 rounded-full bg-accent-red mr-1" />
          <Link href="/" className="font-sans font-extrabold text-lg md:text-xl tracking-tight">
            Sweet Dreams Music
          </Link>
        </div>
        {/* Desktop navigation */}
        <div className="hidden md:flex gap-8 items-center">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
            >
              {item.name}
            </Link>
          ))}
          {user ? (
            <Link
              href="/dashboard"
              className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
            >
              Login
            </Link>
          )}
          <Link
            href="/book"
            className="ml-2 rounded-lg px-4 py-2 font-semibold bg-accent-blue text-white hover:bg-accent-red transition-colors shadow-sm"
          >
            Book Now
          </Link>
        </div>
        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-[color:var(--foreground)] hover:bg-accent-blue/10"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </nav>
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[color:var(--background)]/95 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="inline-block w-5 h-5 rounded-full bg-accent-red mr-1" />
              <Link href="/" className="font-sans font-extrabold text-lg tracking-tight" onClick={() => setMobileMenuOpen(false)}>
                Sweet Dreams Music
              </Link>
            </div>
            <button
              type="button"
              className="rounded-md p-2 text-[color:var(--foreground)] hover:bg-accent-blue/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col gap-6 px-8 py-8 text-lg">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {user ? (
              <Link
                href="/dashboard"
                className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
            <Link
              href="/book"
              className="rounded-lg px-4 py-2 font-semibold bg-accent-blue text-white hover:bg-accent-red transition-colors shadow-sm text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Book Now
            </Link>
          </div>
        </div>
      )}
    </header>
  )
} 