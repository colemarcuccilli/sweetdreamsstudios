'use client'

import { motion, useTransform, useMotionValue, useAnimation } from 'framer-motion';
import Link from 'next/link';
import { MotionValue } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { useScroll } from 'framer-motion';

interface BrandOfferingsSectionProps {}

const offerings = [
  {
    id: 1,
    title: "Your Sound, Elevated.",
    description: "Experience state-of-the-art studio production with our experienced team. We're committed to capturing your unique sound with precision and passion.",
    cta: "Explore Our Studio",
    link: "/studio",
    color: "bg-green-600"
  },
  {
    id: 2,
    title: "See Your Vision Come to Life.",
    description: "From music videos to social media content, we bring your creative vision to life with cutting-edge videography and visual storytelling.",
    cta: "Watch Our Portfolio",
    link: "/videography",
    color: "bg-red-600"
  },
  {
    id: 3,
    title: "Learn Up-to-Date 2025 Industry Secrets.",
    description: "Leverage modern strategies and AI-driven insights to build a strong, authentic brand that resonates with your audience and stands out in the industry.",
    cta: "Discover Brand Development",
    link: "/branding",
    color: "bg-blue-600"
  }
];

export default function BrandOfferingsSection() {
  // Section scroll progress (0-1)
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });

  // Animation phases
  // 0-0.33: Section slides in, first card comes up
  // 0.33-0.66: First card slides left, second card comes up
  // 0.66-1: First/second slide outward, third card comes up

  // Section X
  const sectionX = useTransform(scrollYProgress, [0, 0.2], ['100vw', '0vw']);

  // Card 1 X (slides left as card 2 comes in)
  const card1XAnim = useTransform(scrollYProgress, [0.33, 0.66], ['0vw', '-18vw']);
  // Card 1 scale (pop in)
  const card1Scale = useTransform(scrollYProgress, [0, 0.2], [0.95, 1]);

  // Card 2 X (slides right as card 3 comes in)
  const card2XAnim = useTransform(scrollYProgress, [0.66, 1], ['0vw', '18vw']);
  // Card 2 scale
  const card2Scale = useTransform(scrollYProgress, [0.33, 0.66], [0.95, 1]);

  // Card 3 Y (up from below)
  const card3YAnim = useTransform(scrollYProgress, [0.66, 1], ['100vh', '0vh']);
  // Card 3 scale
  const card3Scale = useTransform(scrollYProgress, [0.66, 1], [0.95, 1]);

  // Opacity for cinematic fade-in
  const sectionOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  return (
    <motion.section
      ref={sectionRef}
      style={{ x: sectionX, opacity: sectionOpacity, background: 'white' }}
      className="fixed top-0 left-0 w-full h-full flex flex-col items-center justify-center z-40"
    >
      {/* Title */}
      <div className="w-full flex justify-center mb-12 sticky top-0 bg-white z-50">
        <h2 className="text-4xl md:text-6xl font-bold font-logo text-center text-black drop-shadow-lg pt-8 pb-8">
          Unlock Your Creative Potential.
        </h2>
      </div>
      {/* Cards - absolutely positioned, animated into place, then become flex row */}
      <div className="w-full flex flex-row items-center justify-center gap-8" style={{ minHeight: '340px' }}>
        {offerings.map((offering, idx) => (
          <motion.div
            key={offering.id}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 * idx, type: 'spring', stiffness: 120, damping: 18 }}
            className={`max-w-md w-[320px] rounded-2xl p-10 flex flex-col items-center justify-center ${offering.color} transition-colors duration-500`}
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
          >
            <h3 className="text-2xl md:text-4xl font-bold text-white mb-4">{offering.title}</h3>
            <p className="text-base md:text-lg text-white/90 mb-6 text-center">{offering.description}</p>
            <Link
              href={offering.link}
              className="inline-block px-6 py-3 bg-white text-black font-semibold rounded-lg 
                       hover:bg-black hover:text-white transition-colors duration-300 transform hover:scale-105
                       shadow-lg hover:shadow-xl"
            >
              {offering.cta}
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
} 