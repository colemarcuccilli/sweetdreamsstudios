'use client'

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';

interface PortfolioThumbnailProps {
  project: {
    id: number;
    thumbnail: string;
    alt: string;
    title: string;
  };
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function PortfolioThumbnail({
  project,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave
}: PortfolioThumbnailProps) {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!thumbnailRef.current) return;

    const tl = gsap.timeline({ paused: true });
    
    tl.to(thumbnailRef.current, {
      height: 320,
      duration: 0.3,
      ease: "power2.out"
    })
    .to(imageRef.current, {
      height: 320,
      duration: 0.3,
      ease: "power2.out"
    }, 0)
    .fromTo(overlayRef.current, 
      { opacity: 0 },
      { opacity: 1, duration: 0.2 },
      0
    );

    if (isHovered) {
      tl.play();
    } else {
      tl.reverse();
    }

    return () => {
      tl.kill();
    };
  }, [isHovered]);

  return (
    <div
      ref={thumbnailRef}
      className="relative rounded-xl overflow-hidden shadow-lg bg-black/40 cursor-pointer w-full"
      style={{ height: isHovered ? 320 : 80 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Image
        ref={imageRef}
        src={project.thumbnail}
        alt={project.alt}
        width={600}
        height={400}
        style={{ 
          width: '100%', 
          height: isHovered ? 320 : 80, 
          objectFit: 'cover'
        }}
        draggable={false}
      />
      <div
        ref={overlayRef}
        className="absolute inset-0 flex items-center justify-center bg-black/40"
        style={{ opacity: isHovered ? 1 : 0 }}
      >
        <Image
          src={project.title.replace('.svg', '.png')}
          alt="Project Title"
          width={120}
          height={40}
        />
      </div>
    </div>
  );
} 