'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, useInView, useScroll, useTransform } from 'framer-motion';
import Navigation from '@/components/Navigation';
import HeroHeader from '@/components/HeroHeader';
import PortfolioSection from '@/components/PortfolioSection';
import BrandOfferingsSection from '@/components/BrandOfferingsSection';

export default function Home() {
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

  // Sticky portfolio section
  const portfolioStickyRef = useRef<HTMLDivElement>(null);
  // Scroll trap for horizontal animation
  const scrollTrapRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: trapScrollY } = useScroll({ target: scrollTrapRef, offset: ['start start', 'end start'] });
  const sectionX = useTransform(trapScrollY, [0, 1], ['100vw', '0vw']);
  const showWhiteSection = useTransform(trapScrollY, v => v > 0.01);
  const showCards = useTransform(sectionX, v => {
    if (typeof v === 'string' && v.endsWith('vw')) {
      const num = parseFloat(v);
      return Math.abs(num) < 2; // show when x is within 2vw of 0
    }
    return false;
  });

  return (
    <>
      <Navigation navShouldBeVisible={isNavVisible} />
      <main className={`relative min-h-screen ${isNavVisible ? 'pt-20' : ''}`}
      >
        <HeroHeader onNavShouldShow={handleNavShouldShow} onNavShouldHide={handleNavShouldHide} />
        {/* Sticky portfolio section */}
        <div ref={portfolioStickyRef} style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <PortfolioSection />
        </div>
        {/* Scroll trap for horizontal animation */}
        <div ref={scrollTrapRef} style={{ height: '120vh', position: 'relative' }} />
        {/* Animated Brand Offerings Section (slides in with forced scroll) */}
        {showWhiteSection.get() && (
          <motion.section
            style={{ x: sectionX, background: 'white', width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 40 }}
          >
            <BrandOfferingsSection scrollProgress={trapScrollY} />
          </motion.section>
        )}
        {/* Placeholder for next content to allow scrolling past */}
        <div style={{ height: '200vh', background: '#f0f0f0' }} />
      </main>
    </>
  );
} 