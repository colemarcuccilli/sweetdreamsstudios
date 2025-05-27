'use client'

import { useRef } from 'react'; // Keep useRef if refs are on elements, even if JS doesn't use them for GSAP
// import { useEffect } from 'react';
// import { gsap } from 'gsap'; // Temporarily remove GSAP
// import { ScrollTrigger } from 'gsap/ScrollTrigger'; // Temporarily remove ScrollTrigger

// if (typeof window !== 'undefined') { // Temporarily remove GSAP plugin registration
//   gsap.registerPlugin(ScrollTrigger);
// }

export default function TransitionalSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  // Temporarily removed GSAP animation
  // useEffect(() => {
  //   if (!sectionRef.current || !textRef.current) return;
  //   gsap.fromTo(textRef.current,
  //     { opacity: 0, y: 50 },
  //     {
  //       opacity: 1,
  //       y: 0,
  //       duration: 1.2,
  //       ease: "power3.out",
  //       scrollTrigger: {
  //         trigger: sectionRef.current,
  //         start: "top center+=100",
  //         end: "bottom center",
  //         toggleActions: "play none none reverse"
  //       }
  //     }
  //   );
  // }, []);

  return (
    <section
      ref={sectionRef}
      id="transitional-section-debug" // Added ID for easy browser inspection
      // Make it extremely obvious and ensure it takes up space
      className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-lime-500 selection:bg-purple-500 selection:text-white"
    >
      {/* Removed overlay for max visibility of bg */}
      <h2
        ref={textRef}
        className="relative z-10 text-5xl md:text-7xl lg:text-8xl font-black font-inter text-black text-center 
                   leading-tight drop-shadow-2xl px-4"
      >
        TRANSITIONAL SECTION - CAN YOU SEE ME?
      </h2>
    </section>
  );
} 