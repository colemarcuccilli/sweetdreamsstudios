'use client'
import { motion } from 'framer-motion'
import { useState } from 'react'
import AccentText from '@/components/AccentText'
import HeroHeader from '@/components/HeroHeader'
import PortfolioSection from '@/components/PortfolioSection'

export default function Home() {
  const [showNav, setShowNav] = useState(false);

  return (
    <main className="relative w-full">
      <div className="relative w-full">
        <HeroHeader 
          onNavShouldShow={() => setShowNav(true)}
          onNavShouldHide={() => setShowNav(false)}
        />
        <PortfolioSection />
      </div>
    </main>
  )
} 