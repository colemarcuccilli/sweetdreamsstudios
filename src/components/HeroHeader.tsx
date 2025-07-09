'use client'

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface HeroHeaderProps {
  onNavShouldShow: () => void;
  onNavShouldHide: () => void;
}

// Adjusted initial logo size (15% smaller)
const LOGO_INITIAL_WIDTH = 765; // Reduced from 900
const LOGO_INITIAL_HEIGHT = 127; // Reduced from 150
const LOGO_FINAL_WIDTH = 120;
const LOGO_FINAL_HEIGHT = 40;
const PARAGRAPH_THRESHOLD = 120;
const HIDE_HEADER_THRESHOLD = 0.6;

const HeroHeader = ({ onNavShouldShow, onNavShouldHide }: HeroHeaderProps) => {
  const [isSnapped, setIsSnapped] = useState(false);
  const [showParagraph, setShowParagraph] = useState(false);
  const [hideHeaderContent, setHideHeaderContent] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const hasTriggeredShow = useRef(false);

  useEffect(() => {
    setHydrated(true);
    const handleScroll = () => {
      const headerHeight = window.innerHeight * 2.5;
      const scrollPercent = window.scrollY / headerHeight;
      if (window.scrollY > 0 && !isSnapped) {
        setIsSnapped(true);
        if (!hasTriggeredShow.current) {
          onNavShouldShow();
          hasTriggeredShow.current = true;
        }
      } else if (window.scrollY === 0 && isSnapped) {
        setIsSnapped(false);
        onNavShouldHide();
        hasTriggeredShow.current = false;
      }
      if (window.scrollY > window.innerHeight * 0.23 + PARAGRAPH_THRESHOLD) {
        setShowParagraph(true);
      } else {
        setShowParagraph(false);
      }
      if (scrollPercent > HIDE_HEADER_THRESHOLD) {
        setHideHeaderContent(true);
      } else {
        setHideHeaderContent(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSnapped, onNavShouldHide, onNavShouldShow]); // Added dependencies

  const logoVariants = {
    initial: { scale: 1, y: '0vh', opacity: 1, transition: { duration: 0.3, ease: 'easeInOut' } },
    snapped: { scale: LOGO_FINAL_WIDTH / LOGO_INITIAL_WIDTH, y: '-20vh', opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  const headlineVariants = {
    initial: { y: '40vh', opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
    snapped: { y: hideHeaderContent ? '-30vh' : '-10vh', opacity: hideHeaderContent ? 0 : 1, transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  const paragraphVariants = {
    hidden: { opacity: 0, y: 40, transition: { duration: 0.3, ease: 'easeInOut' } },
    visible: { opacity: hideHeaderContent ? 0 : 1, y: hideHeaderContent ? -40 : 0, transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  return (
    <section className="relative h-[250vh] w-full overflow-x-hidden select-none">
      {/* Only render complex children after hydration */}
      {hydrated && (
        <>
          {/* Fixed video background for header only */}
          <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/videos/websiteheader.webm" type="video/webm" />
              Your browser does not support the video tag.
            </video>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showParagraph ? 0.66 : 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute inset-0 bg-black z-10"
              style={{ pointerEvents: 'none' }}
            />
          </div>
          {/* Animated wide logo */}
          <motion.div
            variants={logoVariants}
            animate={isSnapped ? 'snapped' : 'initial'}
            className="fixed top-0 left-0 w-full flex justify-center pt-4 z-10 pointer-events-none"
          >
            <Image
              src="/images/logos/SDOutlineShadowLogoWide.svg"
              alt="Sweet Dreams Music - Wide Outline Logo"
              width={LOGO_INITIAL_WIDTH}
              height={LOGO_INITIAL_HEIGHT}
              className="font-logo w-auto h-auto"
              priority
            />
          </motion.div>
          {isSnapped && (
            <motion.div
              variants={headlineVariants}
              animate={isSnapped ? 'snapped' : 'initial'}
              className="fixed top-0 left-0 w-full h-screen flex justify-center items-center z-10 pointer-events-none"
            >
              <h1 className="text-5xl md:text-7xl text-white font-sans font-bold pointer-events-auto">
                More Than Just Music.
              </h1>
            </motion.div>
          )}
          {isSnapped && (
            <motion.div
              variants={paragraphVariants}
              initial="hidden"
              animate={showParagraph ? 'visible' : 'hidden'}
              className="fixed top-0 left-0 w-full h-screen flex flex-col items-center justify-center z-10 pointer-events-none"
              style={{ pointerEvents: 'none' }}
            >
              <p
                className="max-w-2xl md:max-w-3xl text-lg md:text-2xl text-white font-sans font-medium text-center mt-32 md:mt-40 px-4"
                style={{ pointerEvents: 'auto' }}
              >
                Use the navigation at the top to discover our professional studio, videography services, and our innovative AI-powered artist development platform. Dive deeper into what we offer every client and the exclusive features for developing artists. Scroll down to learn about our unique approach and see how we can help you create and grow.
              </p>
              {showParagraph && !hideHeaderContent && (
                <motion.button
                  type="button"
                  className="mt-8 w-14 h-14 flex items-center justify-center rounded-full bg-accent-blue text-white shadow-lg animate-pulse focus:outline-none focus:ring-4 focus:ring-accent-blue/40 pointer-events-auto"
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.97 }}
                  aria-label="Scroll to portfolio"
                  onClick={() => {
                    const el = document.getElementById('portfolio-section');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </motion.button>
              )}
            </motion.div>
          )}
        </>
      )}
      {/* Placeholder for non-hydrated state to maintain layout */}
      {!hydrated && (
        <div style={{ height: '100%', width: '100%' }}></div>
      )}
    </section>
  );
};

export default HeroHeader; 