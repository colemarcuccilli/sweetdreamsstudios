'use client';

import { useState, useRef } from 'react';
import HeroHeader from '@/components/HeroHeader';
import Navigation from '@/components/Navigation'; // Import Navigation

export default function HomePage() {
  const [isNavVisible, setIsNavVisible] = useState(false);
  const navTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleNavShouldShow = () => {
    if (navTimeout.current) clearTimeout(navTimeout.current);
    navTimeout.current = setTimeout(() => {
      setIsNavVisible(true);
    }, 200); // 200ms delay for nav reveal
  };

  const handleNavShouldHide = () => {
    if (navTimeout.current) clearTimeout(navTimeout.current);
    setIsNavVisible(false);
  };

  // Optional: A function to hide nav if scrolling back to very top
  // const handleNavShouldHide = () => {
  //   setIsNavVisible(false);
  // };

  return (
    <>
      {/* Navigation is rendered here, its visibility controlled by isNavVisible prop */}
      {/* The actual Navigation component uses its own internal isNavVisible state for Framer Motion,
          but we need to ensure it gets re-rendered or its prop changes to trigger animation. 
          We might need to adjust Navigation.tsx to accept isNavVisible as a prop directly for its motion.header animate state.
      */}
      <Navigation navShouldBeVisible={isNavVisible} /> {/* Pass state to Navigation */}
      
      <main className={`relative min-h-screen ${isNavVisible ? 'pt-20' : ''}`}> {/* Add pt-20 when nav is visible */}
        <HeroHeader onNavShouldShow={handleNavShouldShow} onNavShouldHide={handleNavShouldHide} />
      </main>
    </>
  );
} 