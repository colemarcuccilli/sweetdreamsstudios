'use client'

// import { useEffect, useRef } from 'react'; // Remove JS
// import { gsap } from 'gsap'; // Remove JS
// import Image from 'next/image'; // Temporarily replace next/image

interface PortfolioThumbnailProps {
  project: {
    id: number;
    thumbnail: string;
    alt: string;
    title: string;
  };
  isHovered: boolean; // Will be used for conditional styling if needed, or can be removed if hover is CSS only
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function PortfolioThumbnail({
  project,
  isHovered, // Keep for potential CSS-driven hover, or remove
  onClick,
  onMouseEnter,
  onMouseLeave
}: PortfolioThumbnailProps) {
  // const thumbnailRef = useRef<HTMLDivElement>(null); // Remove JS
  // const imageRef = useRef<HTMLImageElement>(null); // Remove JS
  // const overlayRef = useRef<HTMLDivElement>(null); // Remove JS

  // useEffect(() => { // Remove JS
  //   if (!thumbnailRef.current) return;
  //   const tl = gsap.timeline({ paused: true });
  //   tl.to(thumbnailRef.current, { height: 320, duration: 0.3, ease: "power2.out" })
  //   .to(imageRef.current, { height: 320, duration: 0.3, ease: "power2.out" }, 0)
  //   .fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0);
  //   if (isHovered) { tl.play(); } else { tl.reverse(); }
  //   return () => { tl.kill(); };
  // }, [isHovered]);

  const titleImagePath = project.title.endsWith('.svg') 
    ? project.title.replace('.svg', '.png') 
    : project.title;

  return (
    <div
      // ref={thumbnailRef} // Remove JS
      className="group relative rounded-xl overflow-hidden shadow-lg bg-black/40 cursor-pointer w-full h-[80px] hover:h-[320px] transition-all duration-300 ease-power2-out"
      // style={{ height: isHovered ? 320 : 80 }} // Replaced with Tailwind hover for simplicity
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // ref={imageRef} // Remove JS
        src={project.thumbnail}
        alt={project.alt}
        className="object-cover w-full h-full transition-all duration-300 ease-power2-out"
        draggable={false}
        style={{ objectFit: 'cover' }} // Ensure object-fit is applied
      />
      <div
        // ref={overlayRef} // Remove JS
        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        // style={{ opacity: isHovered ? 1 : 0 }} // Replaced with Tailwind group-hover
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={titleImagePath} // Direct path for public assets
          alt="Project Title"
          style={{ width: 'auto', height: 'auto', maxWidth: '120px', maxHeight: '40px' }} 
        />
      </div>
    </div>
  );
} 