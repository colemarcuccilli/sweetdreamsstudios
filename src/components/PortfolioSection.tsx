'use client'

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface PortfolioSectionProps {
  onEndInView?: () => void;
}

// Manually list all your PNGs in the thumbnails folder
const projects = [
  { id: 1, thumbnail: '/images/thumbnails/proj1.png', alt: 'Project 1', video: '/videos/proj1.mp4', details: 'Project 1 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 2, thumbnail: '/images/thumbnails/proj2.png', alt: 'Project 2', video: '/videos/proj2.mp4', details: 'Project 2 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 3, thumbnail: '/images/thumbnails/proj3.png', alt: 'Project 3', video: '/videos/proj3.mp4', details: 'Project 3 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 4, thumbnail: '/images/thumbnails/proj4.png', alt: 'Project 4', video: '/videos/proj4.mp4', details: 'Project 4 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 5, thumbnail: '/images/thumbnails/proj5.png', alt: 'Project 5', video: '/videos/proj5.mp4', details: 'Project 5 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 6, thumbnail: '/images/thumbnails/proj6.png', alt: 'Project 6', video: '/videos/proj6.mp4', details: 'Project 6 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 7, thumbnail: '/images/thumbnails/proj7.png', alt: 'Project 7', video: '/videos/proj7.mp4', details: 'Project 7 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 8, thumbnail: '/images/thumbnails/proj8.png', alt: 'Project 8', video: '/videos/proj8.mp4', details: 'Project 8 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 9, thumbnail: '/images/thumbnails/proj9.png', alt: 'Project 9', video: '/videos/proj9.mp4', details: 'Project 9 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 10, thumbnail: '/images/thumbnails/proj10.png', alt: 'Project 10', video: '/videos/proj10.mp4', details: 'Project 10 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 11, thumbnail: '/images/thumbnails/proj11.png', alt: 'Project 11', video: '/videos/proj11.mp4', details: 'Project 11 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 12, thumbnail: '/images/thumbnails/proj12.png', alt: 'Project 12', video: '/videos/proj12.mp4', details: 'Project 12 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 13, thumbnail: '/images/thumbnails/proj13.png', alt: 'Project 13', video: '/videos/proj13.mp4', details: 'Project 13 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 14, thumbnail: '/images/thumbnails/proj14.png', alt: 'Project 14', video: '/videos/proj14.mp4', details: 'Project 14 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 15, thumbnail: '/images/thumbnails/proj15.png', alt: 'Project 15', video: '/videos/proj15.mp4', details: 'Project 15 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 16, thumbnail: '/images/thumbnails/proj16.png', alt: 'Project 16', video: '/videos/proj16.mp4', details: 'Project 16 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 17, thumbnail: '/images/thumbnails/proj17.png', alt: 'Project 17', video: '/videos/proj17.mp4', details: 'Project 17 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  { id: 18, thumbnail: '/images/thumbnails/proj18.png', alt: 'Project 18', video: '/videos/proj18.mp4', details: 'Project 18 details', title: '/images/projtitles/VerifiedbyJayValLeo.svg' },
  // ...add more as needed
];

export default function PortfolioSection({ onEndInView }: PortfolioSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [selectedProject, setSelectedProject] = useState<typeof projects[0] | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredProject, setHoveredProject] = useState<typeof projects[0] | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const endRef = useRef<HTMLDivElement>(null);

  // Helper to split projects into columns
  function splitIntoColumns<T>(arr: T[], numCols: number): T[][] {
    const cols: T[][] = Array.from({ length: numCols }, () => []);
    arr.forEach((item, idx) => {
      cols[idx % numCols].push(item);
    });
    return cols;
  }

  // Responsive column count
  let numCols = 3;
  if (typeof window !== 'undefined') {
    if (window.innerWidth < 768) numCols = 1;
    else if (window.innerWidth < 1024) numCols = 2;
  }
  const columns: Array<typeof projects[number]>[] = splitIntoColumns(projects, numCols);

  const handleThumbnailClick = (project: typeof projects[0]) => {
    setSelectedProject(project);
    sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Observe when the end of the section is in view
  useEffect(() => {
    if (!onEndInView) return;
    const endEl = endRef.current;
    if (!endEl) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onEndInView();
      },
      { threshold: 0.5 }
    );
    observer.observe(endEl);
    return () => observer.disconnect();
  }, [onEndInView]);

  return (
    <section
      id="portfolio-section"
      ref={sectionRef}
      className="sticky top-0 w-full min-h-screen bg-background py-24 flex flex-col items-center z-30"
      style={{ height: '100vh' }}
    >
      {/* Animated phrase */}
      <motion.h2
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        viewport={{ once: true }}
        className="text-4xl md:text-6xl font-bold font-logo text-center mb-16 text-white drop-shadow-lg"
      >
        Witness the Vision.
      </motion.h2>
      {/* Folded Thumbnails Masonry Columns */}
      <div className="w-full max-w-6xl flex flex-row gap-4 justify-center">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-4 flex-1 min-w-0">
            {col.map((project, idx) => {
              // Find the global index for hover state
              const globalIdx = colIdx + idx * numCols;
              return (
                <motion.div
                  key={project.id}
                  className="relative rounded-xl overflow-hidden shadow-lg bg-black/40 cursor-pointer w-full"
                  animate={{
                    height: hoveredIndex === globalIdx ? '320px' : '80px',
                    zIndex: hoveredIndex === globalIdx ? 10 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  onClick={() => handleThumbnailClick(project)}
                  onMouseEnter={() => { setHoveredIndex(globalIdx); setHoveredProject(project); }}
                  onMouseLeave={() => { setHoveredIndex(null); setHoveredProject(null); }}
                  style={{ height: hoveredIndex === globalIdx ? 320 : 80 }}
                >
                  <Image
                    src={project.thumbnail}
                    alt={project.alt}
                    width={600}
                    height={400}
                    style={{ width: '100%', height: hoveredIndex === globalIdx ? '320px' : '80px', objectFit: 'cover', transition: 'height 0.3s' }}
                    draggable={false}
                  />
                  {/* Overlay for hover title */}
                  <AnimatePresence>
                    {hoveredIndex === globalIdx && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40"
                      >
                        <Image
                          src={project.title.replace('.svg', '.png')}
                          alt="Project Title"
                          width={120}
                          height={40}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
      {/* Project details and video */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 flex items-center justify-center bg-black/80 z-50"
            onClick={() => setSelectedProject(null)}
          >
            <div className="flex w-full max-w-6xl mx-auto p-4" onClick={(e) => e.stopPropagation()}>
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-1/2 pr-4"
              >
                <video
                  src={selectedProject.video}
                  controls
                  className="w-full rounded-lg"
                />
              </motion.div>
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="w-1/2 pl-4 text-white"
              >
                <h3 className="text-2xl font-bold mb-4">{selectedProject.alt}</h3>
                <p>{selectedProject.details}</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hover title PNG follows mouse (optional, can be re-enabled if desired) */}
      {/*
      <AnimatePresence>
        {hoveredProject && (
          <motion.div
            style={{
              position: 'fixed',
              left: mouse.x,
              top: mouse.y,
              pointerEvents: 'none',
              zIndex: 100,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Image
              src="/images/projtitles/VerifiedbyJayValLeo.png"
              alt="Project Title"
              width={50}
              height={25}
              style={{ width: 'auto', height: 'auto' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      */}
      <div ref={endRef} className="w-full h-1" />
    </section>
  );
} 