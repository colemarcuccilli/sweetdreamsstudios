'use client'

import { useEffect, useRef } from 'react';
// import { gsap } from 'gsap'; // Temporarily remove GSAP
// import { ScrollTrigger } from 'gsap/ScrollTrigger'; // Temporarily remove ScrollTrigger
import Image from 'next/image';
import Link from 'next/link';

// if (typeof window !== 'undefined') { // Temporarily remove GSAP plugin registration
//   gsap.registerPlugin(ScrollTrigger);
// }

const offerings = [
  {
    id: 1,
    title: "Your Sound, Elevated.",
    description: "Experience state-of-the-art studio production with our experienced team. We're committed to capturing your unique sound with precision and passion.",
    cta: "Explore Our Studio",
    link: "/studio",
    media: {
      type: 'video',
      src: "/videos/studio-preview.mp4"
    },
    color: "from-green-600/20 to-green-900/20"
  },
  {
    id: 2,
    title: "See Your Vision Come to Life.",
    description: "From music videos to social media content, we bring your creative vision to life with cutting-edge videography and visual storytelling.",
    cta: "Watch Our Portfolio",
    link: "/videography",
    media: {
      type: 'video',
      src: "/videos/videography-preview.mp4"
    },
    color: "from-red-600/20 to-red-900/20"
  },
  {
    id: 3,
    title: "Learn Up-to-Date 2025 Industry Secrets.",
    description: "Leverage modern strategies and AI-driven insights to build a strong, authentic brand that resonates with your audience and stands out in the industry.",
    cta: "Discover Brand Development",
    link: "/branding",
    media: {
      type: 'image',
      src: "/videos/branding-preview.png"
    },
    color: "from-blue-600/20 to-blue-900/20"
  }
];

export default function BrandOfferingsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videosRef = useRef<(HTMLVideoElement | null)[]>([]);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]); // Keep refs for structure, but animations removed

  // Temporarily removed all GSAP animations and ScrollTriggers
  // useEffect(() => {
  //   if (!sectionRef.current) return;

  //   cardsRef.current.forEach((card, index) => {
  //     if (!card) return;
  //     gsap.fromTo(card,
  //       { opacity: 0, y: 50 },
  //       {
  //         opacity: 1,
  //         y: 0,
  //         duration: 0.8,
  //         ease: "power3.out",
  //         scrollTrigger: {
  //           trigger: card,
  //           start: "top bottom-=100",
  //           end: "top center",
  //           toggleActions: "play none none reverse"
  //         }
  //       }
  //     );
  //   });

  //   videosRef.current.forEach((video, index) => {
  //     if (!video) return;
  //     ScrollTrigger.create({
  //       trigger: video,
  //       start: "top bottom",
  //       end: "bottom top",
  //       onEnter: () => { video.play().catch(() => {}); },
  //       onLeave: () => { video.pause(); },
  //       onEnterBack: () => { video.play().catch(() => {}); },
  //       onLeaveBack: () => { video.pause(); }
  //     });
  //   });

  //   return () => {
  //     ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  //   };
  // }, []);

  // Basic video play/pause based on visibility (IntersectionObserver) - if needed without GSAP
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const videoElement = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          videoElement.play().catch(() => {});
        } else {
          videoElement.pause();
        }
      });
    }, { threshold: 0.5 }); // Adjust threshold as needed

    videosRef.current.forEach(video => {
      if (video) observer.observe(video);
    });

    return () => {
      videosRef.current.forEach(video => {
        if (video) observer.unobserve(video);
      });
    };
  }, []);


  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-background py-24"
    >
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-6xl font-bold font-inter text-center mb-16 text-white">
          Our Brand Offerings
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {offerings.map((offering, index) => (
            <div
              key={offering.id}
              ref={(el) => {
                cardsRef.current[index] = el;
              }}
              className="relative group overflow-hidden rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300"
            >
              <div className="relative aspect-video overflow-hidden">
                {offering.media.type === 'video' ? (
                  <video
                    ref={(el) => { videosRef.current[index] = el; }}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    muted
                    loop
                    playsInline // Ensure playsInline is present
                  >
                    <source src={offering.media.src} type="video/mp4" />
                  </video>
                ) : (
                  <div className="relative w-full h-full">
                    <Image
                      src={offering.media.src}
                      alt={offering.title}
                      fill
                      className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-b ${offering.color} opacity-80 group-hover:opacity-60 transition-opacity duration-300`} />
              </div>

              <div className="p-6">
                <h3 className="text-2xl font-bold text-white mb-3">
                  {offering.title}
                </h3>
                <p className="text-white/80 mb-6">
                  {offering.description}
                </p>
                <Link
                  href={offering.link}
                  className="inline-block px-6 py-3 bg-white/10 text-white font-semibold rounded-lg 
                           hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105
                           shadow-lg hover:shadow-xl border border-white/20 backdrop-blur-sm"
                >
                  {offering.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 