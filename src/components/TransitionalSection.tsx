'use client'

import { useEffect, useRef } from 'react';
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
      className="relative w-full min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden 
                 bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900"
      // Replace with your abstract visual: e.g., style={{ backgroundImage: "url('/path/to/your/abstract-visual.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/30"></div> {/* Optional overlay for text readability */}
      <h2
        ref={textRef}
        className="relative z-10 text-4xl md:text-6xl lg:text-7xl font-semibold font-inter text-white text-center 
                   leading-tight drop-shadow-2xl px-4"
      >
        Everything You Need to Create.<br />Everything You Need to Grow.
      </h2>
    </section>
  );
} 