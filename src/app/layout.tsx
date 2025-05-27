import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// import Navigation from '@/components/Navigation' // Temporarily commented out
import { AuthProvider } from '@/lib/auth-context'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Sweet Dreams Music',
  description: 'Where Passion Meets Professionalism',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Bungee&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="relative min-h-screen bg-background text-foreground font-sans">
        <AuthProvider>
          {/* <Navigation /> */} {/* Temporarily commented out */}
          {/* <div className="pt-20">{children}</div> */}
          {/* Removed pt-20 as Navigation is commented out */}
          {children}
        </AuthProvider>
      </body>
    </html>
  )
} 