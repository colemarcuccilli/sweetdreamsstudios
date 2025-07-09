'use client';

import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image'; // Using next/image for potential optimization

// Define the available sticker images
const stickerImageSources = [
  '/images/logos/SDOutlineShadowLogoWide.svg',
  '/images/logos/SDMOvalOutlineLogo.svg',
  '/images/logos/SDMOvalLogo.svg',
];

// Data for a sticker that has been placed on the canvas
interface PlacedStickerData {
  id: string;
  x: number; // Relative to the stickerAreaRef
  y: number; // Relative to the stickerAreaRef
  imageSrc: string;
  rotation: number;
  scale: number;
  width: number;
  height: number;
}

// Props for the PlacedSticker component
const PlacedSticker: React.FC<PlacedStickerData> = ({ id, x, y, imageSrc, rotation, scale, width, height }) => {
  const stickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stickerRef.current) {
      gsap.fromTo(
        stickerRef.current,
        { opacity: 0, scale: 0, rotation: rotation - 30, y: y + 30 },
        {
          opacity: 1,
          scale: scale,
          rotation: rotation,
          y: y,
          duration: 0.7,
          ease: 'back.out(1.7)',
        }
      );
    }
  }, [id]); // Animate once per sticker ID

  return (
    <div
      ref={stickerRef}
      className="absolute"
      style={{
        left: `${x}px`,
        top: `0px`, // GSAP handles y animation; initial top is offset by GSAP's `from` y value
        transform: `translate(-50%, -50%) translateZ(0px)`,
      }}
    >
      <Image
        src={imageSrc}
        alt="Placed Sticker"
        width={width}
        height={height}
        className="object-contain shadow-lg"
        priority={false}
      />
    </div>
  );
};

// State for the sticker that follows the cursor
interface CursorStickerState {
  visible: boolean;
  x: number; // Viewport X
  y: number; // Viewport Y
  imageSrc: string;
  width: number;
  height: number;
}

const StickerSection: React.FC = () => {
  const [placedStickers, setPlacedStickers] = useState<PlacedStickerData[]>([]);
  const [currentStickerIndex, setCurrentStickerIndex] = useState(0);
  const stickerAreaRef = useRef<HTMLDivElement>(null);

  const initialCursorStickerWidth = 70;
  const initialCursorStickerHeight = stickerImageSources[0].includes('Wide') 
    ? initialCursorStickerWidth * 0.4 
    : initialCursorStickerWidth;

  const [cursorSticker, setCursorSticker] = useState<CursorStickerState>({
    visible: false,
    x: 0,
    y: 0,
    imageSrc: stickerImageSources[0],
    width: initialCursorStickerWidth,
    height: initialCursorStickerHeight,
  });

  const getRandomTransformValue = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  // Update cursor sticker image and dimensions when currentStickerIndex changes
  useEffect(() => {
    const newImageSrc = stickerImageSources[currentStickerIndex];
    const newWidth = 70; // Standard size for cursor preview
    const newHeight = newImageSrc.includes('Wide') ? newWidth * 0.4 : newWidth;
    setCursorSticker(prev => ({
      ...prev,
      imageSrc: newImageSrc,
      width: newWidth,
      height: newHeight,
    }));
  }, [currentStickerIndex]);

  const handleAreaMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    setCursorSticker(prev => ({
      ...prev,
      visible: true,
      x: event.clientX,
      y: event.clientY,
    }));
  };

  const handleAreaMouseLeave = () => {
    setCursorSticker(prev => ({ ...prev, visible: false }));
  };
  
  const handleAreaMouseEnter = () => {
    // Ensure imageSrc is up-to-date when mouse enters
    const currentImage = stickerImageSources[currentStickerIndex];
    const newWidth = 70;
    const newHeight = currentImage.includes('Wide') ? newWidth * 0.4 : newWidth;
    setCursorSticker(prev => ({
      ...prev,
      visible: true,
      imageSrc: currentImage,
      width: newWidth,
      height: newHeight,
    }));
  };

  const handleAreaClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!stickerAreaRef.current) return;

    const rect = stickerAreaRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left; // x relative to stickerAreaRef
    const y = event.clientY - rect.top;  // y relative to stickerAreaRef

    const baseSize = 90;
    const sizeVariation = Math.random() * 0.5 + 0.75;
    const stickerWidth = baseSize * sizeVariation;
    const stickerHeight = stickerWidth * (stickerImageSources[currentStickerIndex].includes('Wide') ? 0.4 : 1);

    const newPlacedSticker: PlacedStickerData = {
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      imageSrc: stickerImageSources[currentStickerIndex], // Use current sticker before incrementing
      rotation: getRandomTransformValue(-30, 30),
      scale: getRandomTransformValue(0.9, 1.4),
      width: Math.round(stickerWidth),
      height: Math.round(stickerHeight),
    };

    setPlacedStickers((prevStickers) => [...prevStickers, newPlacedSticker]);
    setCurrentStickerIndex((prevIndex) => (prevIndex + 1) % stickerImageSources.length);
    // The useEffect listening to currentStickerIndex will update the cursorSticker's image
  };

  return (
    <>
      <section 
        ref={stickerAreaRef} 
        onClick={handleAreaClick}
        onMouseMove={handleAreaMouseMove}
        onMouseLeave={handleAreaMouseLeave}
        onMouseEnter={handleAreaMouseEnter}
        className="relative w-full min-h-[80vh] md:min-h-[700px] bg-neutral-900 flex flex-col items-center justify-start py-16 px-4 overflow-hidden select-none cursor-auto"
        // Removed cursor-crosshair, using cursor-auto or let it be default.
        // For true "hide system cursor", would use style={{ cursor: 'none' }} when cursorSticker.visible is true.
      >
        <div className="text-center mb-10 z-10 relative">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            Creative Canvas
          </h2>
          <p className="text-lg md:text-xl text-neutral-300/90 max-w-2xl" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            Click anywhere on the canvas below to add a sticker.
          </p>
        </div>
        
        {placedStickers.map((sticker) => (
          <PlacedSticker key={sticker.id} {...sticker} />
        ))}
      </section>

      {/* Sticker that follows the cursor */}
      {cursorSticker.visible && (
        <div style={{
          position: 'fixed',
          left: `${cursorSticker.x}px`,
          top: `${cursorSticker.y}px`,
          transform: 'translate(-50%, -50%)', // Center on cursor tip
          zIndex: 10000, // Ensure it's on top
          pointerEvents: 'none', // Allow clicks to pass through
          opacity: 0.85, // Slightly transparent
        }}>
          <Image
            src={cursorSticker.imageSrc}
            alt="Sticker in hand"
            width={cursorSticker.width}
            height={cursorSticker.height}
            className="object-contain drop-shadow-lg"
            priority // It's a high-interaction element, consider priority
          />
        </div>
      )}
    </>
  );
};

export default StickerSection; 