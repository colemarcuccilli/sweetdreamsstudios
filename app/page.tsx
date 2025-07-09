'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link'; // Added Link import
// import { motion, useAnimation, useInView, useScroll, useTransform } from 'framer-motion'; // Removed Framer Motion imports for scroll effects
import { motion } from 'framer-motion'; // Keep motion if other components use it, or remove if not. Assuming it might still be used by Navigation/HeroHeader or their subcomponents.
import Navigation from '@/components/Navigation';
import HeroHeader from '@/components/HeroHeader';
import PortfolioSection from '@/components/PortfolioSection';
import BrandOfferingsSection from '@/components/BrandOfferingsSection';
import ClientBenefitsSection from '@/components/ClientBenefitsSection';
// import BrandOfferingsSection from '@/components/BrandOfferingsSection'; // Removed

export default function Home() {
  // const { user, logout, loading } = useAuth(); // Usage removed
  const [isNavVisible, setIsNavVisible] = useState(false);
  const navTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleNavShouldShow = () => {
    if (navTimeout.current) clearTimeout(navTimeout.current);
    navTimeout.current = setTimeout(() => {
      setIsNavVisible(true);
    }, 200);
  };

  const handleNavShouldHide = () => {
    if (navTimeout.current) clearTimeout(navTimeout.current);
    setIsNavVisible(false);
  };

  // Removed sticky portfolio refs and scroll trap logic
  // const portfolioStickyRef = useRef<HTMLDivElement>(null);
  // const scrollTrapRef = useRef<HTMLDivElement>(null);
  // const { scrollYProgress: trapScrollY } = useScroll({ target: scrollTrapRef, offset: ['start start', 'end start'] });
  // const sectionX = useTransform(trapScrollY, [0, 1], ['100vw', '0vw']);
  // const showWhiteSection = useTransform(trapScrollY, v => v > 0.01);
  // const showCards = useTransform(sectionX, v => {
  //   if (typeof v === 'string' && v.endsWith('vw')) {
  //     const num = parseFloat(v);
  //     return Math.abs(num) < 2; // show when x is within 2vw of 0
  //   }
  //   return false;
  // });

  return (
    <>
      <Navigation navShouldBeVisible={isNavVisible} />
      <main className={`relative ${isNavVisible ? 'pt-20' : ''}`} // Removed min-h-screen, let content define height
      >
        <HeroHeader onNavShouldShow={handleNavShouldShow} onNavShouldHide={handleNavShouldHide} />
        {/* <div ref={portfolioStickyRef} style={{ position: 'sticky', top: 0, zIndex: 10 }}> // Removed sticky wrapper */}
          <PortfolioSection />
          <BrandOfferingsSection />
          <ClientBenefitsSection />
          {/* Temporary tall div for scroll debugging */}
          {/* 
          <div style={{ height: '2000px', background: 'lightcoral' }}> 
            <p>Temporary content to ensure scrollability. You should see this after Brand Offerings section if pinning works correctly.</p>
        </div>
          */}
        {/* </div> */}
        {/* Removed scroll trap and BrandOfferingsSection */}
        {/* <div ref={scrollTrapRef} style={{ height: '120vh', position: 'relative' }} /> */}
        {/* {showWhiteSection.get() && (
          <motion.section
            style={{ x: sectionX, background: 'white', width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 40 }}
          >
            <BrandOfferingsSection scrollProgress={trapScrollY} />
          </motion.section>
        )} */}
        {/* Removed placeholder div */}
        {/* <div style={{ height: '200vh', background: '#f0f0f0' }} /> */}
      </main>
    </>
  );
} 