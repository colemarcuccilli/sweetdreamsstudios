'use client'

// ALL JAVASCRIPT IS INTENTIONALLY COMMENTED OUT FOR THIS TEST
// import { useEffect, useRef } from 'react';
// import { gsap } from 'gsap';
// import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

// Data for the offerings
const offeringsData = [
  {
    id: 1,
    title: "Your Sound, Elevated.",
    description: "Experience state-of-the-art studio production with our experienced team.",
    cta: "Explore Our Studio",
    link: "/studio",
    media: { type: 'video', src: "/videos/studio-preview.mp4" },
    altText: "Studio preview video"
  },
  {
    id: 2,
    title: "See Your Vision Come to Life.",
    description: "From music videos to social media content, we bring your creative vision to life.",
    cta: "Watch Our Portfolio",
    link: "/videography",
    media: { type: 'video', src: "/videos/videography-preview.mp4" },
    altText: "Videography preview video"
  },
  {
    id: 3,
    title: "Learn Up-to-Date Industry Secrets.",
    description: "Leverage modern strategies and AI-driven insights to build a strong brand.",
    cta: "Discover Brand Development",
    link: "/branding",
    media: { type: 'image', src: "/videos/branding-preview.png" },
    altText: "Branding preview image"
  }
];

export default function BrandOfferingsSection() {
  // Refs will be re-added when GSAP is re-introduced
  // const sectionRef = useRef<HTMLDivElement>(null);
  // const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  // const videosRef = useRef<(HTMLVideoElement | null)[]>([]);

  // useEffect for animations will be re-added later

  return (
    <section
      id="brand-offerings-ULTRA-STATIC-TEST"
      style={{
        border: '10px solid #00FFFF', // Bright Cyan Border
        backgroundColor: '#222222', // Dark Grey Background
        padding: '50px 0',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <h2 
          style={{
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            color: '#FFFF00', // Bright Yellow Text
            textAlign: 'center',
            marginBottom: '50px',
            fontFamily: 'Verdana, sans-serif',
            textShadow: '2px 2px 4px #000000'
          }}
        >
          BRAND OFFERINGS - ULTRA STATIC TEST<br/>NO JS ANIMATIONS! IF THIS MOVES, IT'S NOT THIS CODE!
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {offeringsData.map((offering) => (
            <div
              key={offering.id}
              style={{
                backgroundColor: '#333333',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '5px 5px 15px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                border: '2px solid #FF00FF' // Magenta Border on Cards
              }}
            >
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', marginBottom: '15px', backgroundColor: '#000' }}>
                {offering.media.type === 'video' ? (
                  <video
                    src={offering.media.src}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    muted
                    loop
                    playsInline
                    controls
                    aria-label={offering.altText}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={offering.media.src}
                    alt={offering.altText}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>

              <h3 style={{ fontSize: '1.75rem', color: '#FFFFFF', marginBottom: '10px', fontFamily: 'Georgia, serif' }}>
                {offering.title}
              </h3>
              <p style={{ color: '#CCCCCC', marginBottom: '20px', flexGrow: 1, fontFamily: 'Georgia, serif' }}>
                {offering.description}
              </p>
              <Link
                href={offering.link}
                style={{
                  display: 'block',
                  padding: '12px 20px',
                  backgroundColor: '#00FFFF', // Bright Cyan Button
                  color: '#000000', // Black text for button
                  fontWeight: 'bold',
                  textAlign: 'center',
                  borderRadius: '5px',
                  textDecoration: 'none',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#00AAAA')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#00FFFF')}
              >
                {offering.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 