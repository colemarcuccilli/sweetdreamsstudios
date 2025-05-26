'use client'

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';

interface ProjectModalProps {
  project: {
    id: number;
    video: string;
    alt: string;
    details: string;
  };
  onClose: () => void;
}

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modalRef.current) return;

    const tl = gsap.timeline();
    
    tl.fromTo(modalRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: "power2.out" }
    )
    .fromTo(videoRef.current,
      { x: -100, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
      "-=0.1"
    )
    .fromTo(contentRef.current,
      { x: 100, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
      "-=0.3"
    );

    return () => {
      tl.kill();
    };
  }, []);

  const handleClose = () => {
    if (!modalRef.current) return;

    const tl = gsap.timeline({
      onComplete: onClose
    });

    tl.to([videoRef.current, contentRef.current], {
      opacity: 0,
      x: (i) => i === 0 ? -100 : 100,
      duration: 0.3,
      ease: "power2.in"
    })
    .to(modalRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in"
    }, "-=0.1");
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 flex items-center justify-center bg-black/80 z-50"
      onClick={handleClose}
    >
      <div className="flex w-full max-w-6xl mx-auto p-4" onClick={(e) => e.stopPropagation()}>
        <div ref={videoRef} className="w-1/2 pr-4">
          <video
            src={project.video}
            controls
            className="w-full rounded-lg"
          />
        </div>
        <div ref={contentRef} className="w-1/2 pl-4 text-white">
          <h3 className="text-2xl font-bold mb-4">{project.alt}</h3>
          <p>{project.details}</p>
        </div>
      </div>
    </div>
  );
} 