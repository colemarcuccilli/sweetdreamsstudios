import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
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
      <body className="min-h-screen bg-background text-foreground font-sans">
        <AuthProvider>
          <Navigation />
          <div className="pt-20">{children}</div>
        </AuthProvider>
      </body>
    </html>
  )
} 