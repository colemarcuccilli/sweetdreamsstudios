'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const opportunitiesData = [
  {
    id: 'audio',
    mediaSrc: '/videos/studio-preview.mp4',
    mediaType: 'video',
    headline: 'Audio Production',
    description: 'Crafting immersive soundscapes and crystal-clear audio for your projects.',
    ctaText: 'Explore Audio',
  },
  {
    id: 'video',
    mediaSrc: '/videos/videography-preview.mp4',
    mediaType: 'video',
    headline: 'Videography',
    description: 'Bringing your vision to life with stunning visuals and compelling storytelling.',
    ctaText: 'Discover Video',
  },
  {
    id: 'ai-brand',
    mediaSrc: '/videos/branding-preview.png',
    mediaType: 'image',
    headline: 'AI-Powered Brand Development',
    description: 'Leveraging artificial intelligence to build and enhance your unique brand identity.',
    ctaText: 'Innovate with AI',
  },
];

const BrandOfferingsSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLVideoElement | HTMLImageElement | null)[]>([]);
  const textContentRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    layerRefs.current = layerRefs.current.slice(0, opportunitiesData.length);
    mediaRefs.current = mediaRefs.current.slice(0, opportunitiesData.length);
    textContentRefs.current = textContentRefs.current.slice(0, opportunitiesData.length);

    const layers = layerRefs.current.filter(el => el !== null) as HTMLDivElement[];
    const textContents = textContentRefs.current.filter(el => el !== null) as HTMLDivElement[];

    if (!layers.length || !sectionRef.current || layers.length !== opportunitiesData.length) return;
    if (textContents.length !== opportunitiesData.length) return;

    const timerId = setTimeout(() => {
      const ctx = gsap.context(() => {
        // Only show markers in development
        const showMarkers = process.env.NODE_ENV === 'development';

        layers.forEach((layer) => {
          gsap.set(layer, { opacity: 0, visibility: 'hidden', yPercent: 50 });
        });
        
        const sectionPinPixelDuration = 6000;

        const pinDurationMultiplier = 3.5;

        const animateSlide = (
          index: number,
          _sectionPinTrigger: HTMLDivElement | null,
          layerElement: HTMLDivElement | null,
          mediaElement: HTMLVideoElement | HTMLImageElement | null,
          textContentElement: HTMLDivElement | null,
          isLastSlide: boolean
        ) => {
          const tl = gsap.timeline();
          if (!layerElement || !textContentElement) return tl;

          const q = gsap.utils.selector(textContentElement);
          const currentOpp = opportunitiesData[index];

          tl.to(layerElement, {
            opacity: 1,
            yPercent: 0,
            visibility: 'visible',
            duration: 0.6,
            ease: 'power2.inOut',
            onStart: () => {
              if (currentOpp.mediaType === 'video' && mediaElement instanceof HTMLVideoElement) {
                mediaElement.currentTime = 0;
                mediaElement.play().catch(e => console.warn(`Video play error for slide ${index}:`, e));
              }
            }
          })
          .fromTo(q('h2'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, "-=0.3")
          .fromTo(q('p'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, "-=0.3")
          .fromTo(q('button.cta'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, "-=0.3");

          if (!isLastSlide) {
            const fadeOutDelayBase = pinDurationMultiplier - 0.5;
            const fadeOutStartTimeInSlideTimeline = Math.max(1.5, fadeOutDelayBase);

            tl.to(layerElement, {
              opacity: 0,
              duration: 0.6,
              ease: 'power2.inOut',
              onStart: () => { 
                if (currentOpp.mediaType === 'video' && mediaElement instanceof HTMLVideoElement && !mediaElement.paused) {
                  mediaElement.pause();
                }
              },
            }, `${fadeOutStartTimeInSlideTimeline}`);
          }
          return tl;
        };

        const masterTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: `+=${sectionPinPixelDuration}`,
            pin: true,
            pinSpacing: true,
            scrub: 1,
            markers: showMarkers,
            id: 'master-control-st'
          }
        });

        opportunitiesData.forEach((opportunity, i) => {
          const isLastSlide = i === opportunitiesData.length - 1;
          const startTime = i * pinDurationMultiplier;
          masterTimeline.add(animateSlide(i, sectionRef.current, layerRefs.current[i], mediaRefs.current[i], textContentRefs.current[i], isLastSlide), startTime);
        });

        ScrollTrigger.refresh();
      }, sectionRef);
      return () => {
        ctx.revert();
        // As a fallback, try to disable markers on all ScrollTriggers
        // This is a bit of a sledgehammer but can help if markers are persisting
        if (process.env.NODE_ENV === 'development') {
          ScrollTrigger.getAll().forEach(st => st.vars.markers = false);
          ScrollTrigger.refresh(); // Refresh to apply marker changes
        }
      };
    }, 500);

    return () => clearTimeout(timerId);
  }, []);

  return (
    <section 
      id="opportunities-section" 
      ref={sectionRef}
      className={`relative w-full bg-gray-800 z-20 flex items-center justify-center`}
      style={{ minHeight: '100vh'}} 
    >
      {opportunitiesData.map((opp, index) => (
        <div
          key={opp.id}
          ref={el => { layerRefs.current[index] = el; }}
          className="opportunity-layer absolute inset-0 w-full h-full p-8 sm:p-12 md:p-16 flex items-center justify-center opacity-0"
          style={{visibility: 'hidden'}}
        >
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-5xl mx-auto">
            <div className="media-preview-container w-full md:w-1/2 h-64 md:h-auto md:max-h-[70vh] bg-gray-700 rounded-lg overflow-hidden shadow-xl">
              {opp.mediaType === 'image' ? (
                <img 
                  ref={el => { mediaRefs.current[index] = el; }} 
                  src={opp.mediaSrc} 
                  alt={opp.headline} 
                  className="w-full h-full object-cover" />
              ) : (
                <video
                  ref={el => { mediaRefs.current[index] = el as HTMLVideoElement; }} 
                  className="w-full h-full object-cover"
                  src={opp.mediaSrc}
                  muted
                  loop
                  playsInline
                  preload="auto"
                ></video>
              )}
      </div>
            <div 
              ref={el => { textContentRefs.current[index] = el; }}
              className="text-content md:w-1/2 text-white text-center md:text-left"
              style={{ textShadow: '0px 0px 8px rgba(0,0,0,0.7)' }} 
          >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">{opp.headline}</h2>
              <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8">{opp.description}</p>
              <button className="cta bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg text-lg sm:text-xl transition-colors duration-300 shadow-md hover:shadow-lg">
                {opp.ctaText}
              </button>
            </div>
      </div>
        </div>
      ))}
    </section>
  );
};

export default BrandOfferingsSection; 