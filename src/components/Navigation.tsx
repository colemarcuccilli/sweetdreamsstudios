'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'; // Import Image for the logo
import { useAuth } from '@/context/AuthContext'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'; // Import motion

const mainNavLinks = [
  { name: 'Studio', href: '/studio' },
  { name: 'Videography', href: '/videography' },
  { name: 'Branding', href: '/branding' },
  { name: 'Contact', href: '/contact' },
];

interface NavigationProps {
  navShouldBeVisible: boolean;
}

export default function Navigation({ navShouldBeVisible }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  if (!hasMounted || loading) {
    if (!navShouldBeVisible) return null;
    return (
        <motion.header 
          id="main-navbar-loading"
          className="fixed inset-x-0 top-0 z-50 bg-[color:var(--background)] text-[color:var(--foreground)] shadow-md h-[68px]"
          initial={{ opacity: 0, y: -100 }}
          animate={navShouldBeVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -100 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
            <nav className="container mx-auto flex items-center justify-between py-3 px-4 sm:px-6 lg:px-8">
                 <div className="flex-1"></div>
                <div className="h-10 w-20 bg-gray-700 animate-pulse rounded"></div>
                <div className="flex-1 flex justify-end">
                    <div className="h-8 w-16 bg-gray-700 animate-pulse rounded"></div>
                </div>
            </nav>
        </motion.header>
    );
  }

  return (
    <motion.header 
      id="main-navbar"
      className="fixed inset-x-0 top-0 z-50 bg-[color:var(--background)] text-[color:var(--foreground)] shadow-md"
      initial={{ opacity: 0, y: -100 }} // Initially hidden and off-screen
      animate={navShouldBeVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -100 }} // Use prop for animation
      transition={{ duration: 0.3, ease: 'easeOut' }} // Slightly faster transition
    >
      <nav className="container mx-auto flex items-center justify-between py-3 px-4 sm:px-6 lg:px-8">
        {/* Left: Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {mainNavLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Center: SDMOvalLogo in the navbar */}
        <div id="navbar-logo-placeholder" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <Image
            src="/images/logos/SDMOvalLogo.svg"
            alt="Sweet Dreams Music Logo"
            width={120}
            height={40}
            className="font-logo"
            priority
            style={{ height: 'auto' }}
          />
        </div>

        {/* Right: Auth Links & Book Now */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
            <Link
                href="/profile/edit"
              className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
            >
                My Account 
            </Link>
              <button
                onClick={logout}
                className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
            <Link
              href="/login"
              className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
            >
              Login
            </Link>
              <Link
                href="/signup"
                className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
          <Link
            href="/book"
            className="rounded-lg px-4 py-2 font-semibold bg-accent-green text-white hover:bg-accent-green/80 transition-colors shadow-sm"
          >
            Book Now
          </Link>
        </div>

        {/* Mobile menu button (remains on the right for mobile) */}
        <div className="flex md:hidden items-center">
           {/* Spacer to push mobile menu button to the far right if no other elements are there for mobile right side */}
          <div className="flex-grow"></div> 
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

      {/* Mobile menu - layout adjusted for central logo idea if applicable */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-[color:var(--background)]/95 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            {/* Mobile: Logo could be here or just a title */}
            <Link href="/" className="font-sans font-extrabold text-lg tracking-tight" onClick={() => setMobileMenuOpen(false)}>
               {/* Using text logo for mobile for now */}
               Sweet Dreams Music 
            </Link>
            <button
              type="button"
              className="rounded-md p-2 text-[color:var(--foreground)] hover:bg-accent-blue/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col gap-6 px-8 py-8 text-lg items-center">
            {mainNavLinks.map((item) => (
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
              <>
              <Link
                  href="/profile/edit"
                className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                  My Account
              </Link>
                <button
                  onClick={async () => {
                    await logout();
                    setMobileMenuOpen(false);
                  }}
                  className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors w-full text-center"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
              <Link
                href="/login"
                className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
                <Link
                  href="/signup"
                  className="font-medium text-[color:var(--foreground)] hover:text-accent-blue transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
            <Link
              href="/book"
              className="mt-4 rounded-lg px-6 py-3 font-semibold bg-accent-green text-white hover:bg-accent-green/80 transition-colors shadow-sm text-center w-full max-w-xs"
              onClick={() => setMobileMenuOpen(false)}
            >
              Book Now
            </Link>
          </div>
        </div>
      )}
    </motion.header>
  );
} 