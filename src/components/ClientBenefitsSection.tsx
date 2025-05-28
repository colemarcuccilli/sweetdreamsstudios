'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Placeholder data for client benefits - replace with actual icons and refined text
const benefitsData = [
  {
    id: 'studio',
    icon: 'M8.25 4.5l7.5 7.5-7.5 7.5', // Placeholder Heroicon path (e.g., ChevronRight, will replace)
    // Ideal icon: sound waves or similar for audio quality
    title: 'Access to Professional Studio Environments',
    description: 'Record in spaces designed for pristine audio capture and creative flow.',
  },
  {
    id: 'collaboration',
    icon: 'M8.25 4.5l7.5 7.5-7.5 7.5', // Placeholder
    // Ideal icon: people collaborating or gears turning together
    title: 'Collaboration with Experienced Creatives',
    description: 'Work alongside seasoned producers, engineers, and artists to bring your vision to life.',
  },
  {
    id: 'quality',
    icon: 'M8.25 4.5l7.5 7.5-7.5 7.5', // Placeholder
    // Ideal icon: video camera or film reel, perhaps combined with audio waves
    title: 'High-Quality Audio & Video Results',
    description: 'Receive polished, professional-grade audio and visuals ready for distribution.',
  },
  {
    id: 'management',
    icon: 'M8.25 4.5l7.5 7.5-7.5 7.5', // Placeholder
    // Ideal icon: cloud icon or secure lock/folder
    title: 'Secure File Sharing & Project Management',
    description: 'Effortless and secure access to your project files and clear communication channels.',
  },
  {
    id: 'support',
    icon: 'M8.25 4.5l7.5 7.5-7.5 7.5', // Placeholder
    // Ideal icon: guiding hand, handshake, or support symbol
    title: 'Dedicated Support & Guidance',
    description: 'Continuous support and expert advice throughout your creative journey with us.',
  },
];

// A generic SVG Icon component for now - can be replaced with actual SVG components or an icon library
const BenefitIcon: React.FC<{ path: string; className?: string }> = ({ path, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} // Thin outline style
    stroke="currentColor" 
    className={`w-10 h-10 md:w-12 md:h-12 text-purple-400 ${className}`}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);


const ClientBenefitsSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const benefitsListRef = useRef<HTMLUListElement>(null);
  const benefitItemRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    benefitItemRefs.current = benefitItemRefs.current.slice(0, benefitsData.length);

    const ctx = gsap.context(() => {
      // Section Entry Animation for the title
      if (titleRef.current) {
        gsap.fromTo(titleRef.current, 
          { opacity: 0, y: 50 }, 
          {
            opacity: 1, 
            y: 0, 
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 80%', // Start when 80% of the section is in view
              toggleActions: 'play none none none',
            }
          }
        );
      }

      // Staggered Animation for Benefit Items
      if (benefitItemRefs.current.length > 0) {
        benefitItemRefs.current.forEach((item, index) => {
          if (item) {
            gsap.fromTo(item, 
              { opacity: 0, x: -50 }, // Start from left, invisible
              {
                opacity: 1, 
                x: 0, 
                duration: 0.6,
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: item,
                  start: 'top 90%', // Start when 90% of the item is in view
                  toggleActions: 'play none none none',
                },
                delay: index * 0.15 // Stagger delay
              }
            );
          }
        });
      }
    }, sectionRef); // Scope animations to this section

    return () => ctx.revert(); // Cleanup GSAP animations and ScrollTriggers
  }, []);

  return (
    <section 
      ref={sectionRef} 
      className="w-full bg-neutral-800 py-20 md:py-28 text-white overflow-hidden"
    >
      <div className="container mx-auto px-6 md:px-8 text-center">
        <h2 
          ref={titleRef} 
          className="text-4xl md:text-5xl lg:text-6xl font-bold mb-16 md:mb-20 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 opacity-0"
          // Initial opacity 0 for GSAP animation
        >
          Experience the Sweet Dreams Difference.
        </h2>
        
        <ul ref={benefitsListRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
          {benefitsData.map((benefit, index) => (
            <li 
              key={benefit.id} 
              ref={el => { benefitItemRefs.current[index] = el; }}
              className="benefit-item flex flex-col items-center text-center p-6 bg-neutral-700/30 rounded-xl shadow-lg hover:shadow-purple-500/30 transition-shadow duration-300 ease-in-out opacity-0"
              // Initial opacity 0 for GSAP animation
            >
              <div className="mb-5 p-3 bg-neutral-700 rounded-full">
                <BenefitIcon path={benefit.icon} />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold mb-3 text-purple-300">{benefit.title}</h3>
              <p className="text-neutral-300 text-sm md:text-base leading-relaxed">{benefit.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default ClientBenefitsSection; 