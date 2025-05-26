'use client'

import { useState, useRef } from 'react'
import Navigation from '@/components/Navigation'
import HeroHeader from '@/components/HeroHeader'
import PortfolioSection from '@/components/PortfolioSection'
import BrandOfferingsSection from '../components/BrandOfferingsSection'
import TransitionalSection from '../components/TransitionalSection'

export default function Home() {
  const [isNavVisible, setIsNavVisible] = useState(false)
  const navTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleNavShouldShow = () => {
    if (navTimeout.current) clearTimeout(navTimeout.current)
    navTimeout.current = setTimeout(() => {
      setIsNavVisible(true)
    }, 200)
  }

  const handleNavShouldHide = () => {
    if (navTimeout.current) clearTimeout(navTimeout.current)
    setIsNavVisible(false)
  }

  return (
    <>
      <Navigation navShouldBeVisible={isNavVisible} />
      <main className={`relative ${isNavVisible ? 'pt-20' : ''}`}>
        <HeroHeader 
          onNavShouldShow={handleNavShouldShow} 
          onNavShouldHide={handleNavShouldHide} 
        />
        <PortfolioSection />
        <BrandOfferingsSection />
        <TransitionalSection />
      </main>
    </>
  )
} 