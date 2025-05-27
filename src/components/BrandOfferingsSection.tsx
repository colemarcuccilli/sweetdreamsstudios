'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const opportunitiesData = [
  {
    id: 'audio',
    videoSrc: '/videos/placeholder1.mp4', 
    headline: 'Audio Production',
    description: 'Crafting immersive soundscapes and crystal-clear audio for your projects.',
    ctaText: 'Explore Audio',
  },
  {
    id: 'video',
    videoSrc: '/videos/placeholder2.mp4',
    headline: 'Videography',
    description: 'Bringing your vision to life with stunning visuals and compelling storytelling.',
    ctaText: 'Discover Video',
  },
  {
    id: 'ai-brand',
    videoSrc: '/videos/placeholder3.mp4',
    headline: 'AI-Powered Brand Development',
    description: 'Leveraging artificial intelligence to build and enhance your unique brand identity.',
    ctaText: 'Innovate with AI',
  },
];

const BrandOfferingsSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, opportunitiesData.length);
    const slides = slideRefs.current.filter(el => el !== null) as HTMLDivElement[];
    
    if (!slides.length || !sectionRef.current || slides.length <= 1) return;

    const ctx = gsap.context(() => {
      slides.forEach((slide, index) => {
        const video = slide.querySelector('video');
        // const contentContainer = slide.querySelector('.content') as HTMLElement; // Simplified
        // const q = gsap.utils.selector(contentContainer); // Simplified

        // // Content animation timeline for each slide (Simplified - temporarily removed)
        // const contentTl = gsap.timeline({ paused: true });
        // contentTl
        //   .fromTo(q('h2'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
        //   .fromTo(q('p'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, "-=0.3")
        //   .fromTo(q('button.cta'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, "-=0.3");

        ScrollTrigger.create({
          trigger: slide,
          start: 'top top',
          end: () => "+=" + slide.offsetHeight, 
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          snap: {
            snapTo: 1 / (slides.length -1),
            duration: { min: 0.4, max: 0.8 },
            delay: 0.1,
            ease: 'power1.inOut'
          },
          onEnter: () => {
            video?.play().catch(e => console.error(`Video play failed for ${opportunitiesData[index].id}:`, e));
            // contentTl.play(); // Simplified
          },
          onLeave: () => {
            video?.pause();
            // contentTl.reverse(0); // Simplified
          },
          onEnterBack: () => {
            video?.play().catch(e => console.error(`Video play failed (back) for ${opportunitiesData[index].id}:`, e));
            // contentTl.play(); // Simplified
          },
          onLeaveBack: () => {
            video?.pause();
            // contentTl.reverse(0); // Simplified
          },
          id: `slide-pin-${index}`,
          // onRefresh: () => { // Simplified
          //   // contentTl.progress(0).pause(); // Simplified
          // },
        });

        // // Simplified - temporarily removed secondary ScrollTrigger for video control
        // if (contentContainer && video) { 
        //   ScrollTrigger.create({
        //     trigger: contentContainer,
        //     start: 'top center+=100',
        //     end: 'bottom center-=100',
        //     id: `content-video-ctrl-${index}`,
        //     onEnter: () => {
        //       console.log(`Content focus: ${opportunitiesData[index].headline} - Pausing video`);
        //       video.pause();
        //     },
        //     onLeave: () => {
        //       console.log(`Content unfocus: ${opportunitiesData[index].headline} - Playing video`);
        //       video.play().catch(e => console.error(`Video play (content leave) failed for ${opportunitiesData[index].id}:`, e));
        //     },
        //     onEnterBack: () => {
        //       console.log(`Content focus (back): ${opportunitiesData[index].headline} - Pausing video`);
        //       video.pause();
        //     },
        //     onLeaveBack: () => {
        //       console.log(`Content unfocus (back): ${opportunitiesData[index].headline} - Playing video`);
        //       video.play().catch(e => console.error(`Video play (content leave back) failed for ${opportunitiesData[index].id}:`, e));
        //     },
        //   });
        // }
      });
      ScrollTrigger.refresh();
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      id="opportunities-section" 
      ref={sectionRef} 
      className="relative w-full bg-black z-20"
      style={{ transform: 'translateZ(0)' }}
    >
      {opportunitiesData.map((opp, index) => (
        <div
          key={opp.id}
          ref={el => { slideRefs.current[index] = el; }}
          className="opportunity-slide relative w-full h-screen overflow-hidden flex items-center justify-center"
        >
          <div className="video-container absolute inset-0 z-0">
            <video
              className="w-full h-full object-cover"
              src={opp.videoSrc} // MAKE SURE THIS PATH IS CORRECT (e.g., /videos/yourvideo.mp4)
              muted
              loop
              playsInline
              preload="auto"
            ></video>
          </div>
          <div className="content relative z-10 p-6 sm:p-8 md:p-12 lg:p-16 max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto text-center text-white bg-black bg-opacity-60 rounded-xl shadow-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6">{opp.headline}</h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 md:mb-8">{opp.description}</p>
            <button className="cta bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 sm:py-3 px-6 sm:px-8 rounded-lg text-base sm:text-lg transition-colors duration-300 shadow-md hover:shadow-lg">
              {opp.ctaText}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
};

export default BrandOfferingsSection; 