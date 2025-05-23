'use client'

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface HeroHeaderProps {
  onNavShouldShow: () => void;
  onNavShouldHide: () => void;
}

const LOGO_FINAL_WIDTH = 120; // Slightly smaller for a perfect fit
const LOGO_FINAL_HEIGHT = 40;
const LOGO_INITIAL_WIDTH = 900;
const LOGO_INITIAL_HEIGHT = 150;
const PARAGRAPH_THRESHOLD = 120; // px below snapped point

const HeroHeader = ({ onNavShouldShow, onNavShouldHide }: HeroHeaderProps) => {
  const [isSnapped, setIsSnapped] = useState(false);
  const [showParagraph, setShowParagraph] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const hasTriggeredShow = useRef(false);

  useEffect(() => {
    // Only run on client
    setHydrated(true);
    // Set initial snapped state based on scroll position
    if (window.scrollY > 0) {
      setIsSnapped(true);
      onNavShouldShow();
      hasTriggeredShow.current = true;
    }
    const handleScroll = () => {
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
      // Paragraph appears after scrolling a bit more past snap
      if (window.scrollY > window.innerHeight * 0.23 + PARAGRAPH_THRESHOLD) {
        setShowParagraph(true);
      } else {
        setShowParagraph(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
    // eslint-disable-next-line
  }, []); // Only run once on mount

  // Framer Motion variants for snap states
  const logoVariants = {
    initial: {
      scale: 1,
      y: '0vh',
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
    snapped: {
      scale: LOGO_FINAL_WIDTH / LOGO_INITIAL_WIDTH,
      y: '-6vh',
      opacity: 0,
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
  };
  const ovalVariants = {
    initial: {
      opacity: 0,
      y: '-6vh',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
    snapped: {
      opacity: 1,
      y: '-6vh',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
  };
  const headlineVariants = {
    initial: {
      y: '40vh',
      opacity: 0,
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
    snapped: {
      y: '-10vh',
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
  };
  const paragraphVariants = {
    hidden: {
      opacity: 0,
      y: 40,
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
  };

  if (!hydrated) return null;

  return (
    <section className="relative h-[250vh] w-full overflow-x-hidden select-none">
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
        {/* Animated overlay for paragraph visibility */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showParagraph ? 0.66 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute inset-0 bg-black z-10"
          style={{ pointerEvents: 'none' }}
        />
      </div>
      {/* Animated wide logo - shrinks and fades out instantly on snap */}
      <motion.div
        variants={logoVariants}
        animate={isSnapped ? 'snapped' : 'initial'}
        className="fixed top-0 left-0 w-full flex justify-center pt-4 z-10 pointer-events-none"
      >
        <Image
          src="/images/logos/SDWhiteOutlineLogoWide.svg"
          alt="Sweet Dreams Music - Wide Outline Logo"
          width={LOGO_INITIAL_WIDTH}
          height={LOGO_INITIAL_HEIGHT}
          className="font-logo"
          priority
        />
      </motion.div>
      {/* SDMOvalLogo fades in at the same spot instantly on snap */}
      {hydrated && isSnapped && (
        <motion.div
          variants={ovalVariants}
          animate={isSnapped ? 'snapped' : 'initial'}
          className="fixed top-0 left-0 w-full flex justify-center pt-4 z-10 pointer-events-none"
        >
          <Image
            src="/images/logos/SDMOvalLogo.svg"
            alt="Sweet Dreams Music - Oval Logo"
            width={LOGO_FINAL_WIDTH}
            height={LOGO_FINAL_HEIGHT}
            className="font-logo"
            priority
          />
        </motion.div>
      )}
      {/* Animated headline - snaps up instantly */}
      {hydrated && isSnapped && (
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
      {/* Animated paragraph - appears below headline on second scroll */}
      {hydrated && isSnapped && (
        <motion.div
          variants={paragraphVariants}
          initial="hidden"
          animate={showParagraph ? 'visible' : 'hidden'}
          className="fixed top-0 left-0 w-full h-screen flex justify-center items-center z-10 pointer-events-none"
          style={{ pointerEvents: 'none' }}
        >
          <p
            className="max-w-2xl md:max-w-3xl text-lg md:text-2xl text-white font-sans font-medium text-center mt-32 md:mt-40 px-4"
            style={{ pointerEvents: 'auto' }}
          >
            Use the navigation at the top to discover our professional studio, videography services, and our innovative AI-powered artist development platform. Dive deeper into what we offer every client and the exclusive features for developing artists. Scroll down to learn about our unique approach and see how we can help you create and grow.
          </p>
        </motion.div>
      )}
    </section>
  );
};

export default HeroHeader; 