'use client'

import { motion } from 'framer-motion';

// Example data structure for projects
const projects = [
  {
    id: 1,
    thumbnail: '/portfolio/thumb1.jpg',
    video: '/portfolio/video1.mp4',
    labelPng: '/portfolio/label1.png',
    alt: 'Project 1',
  },
  {
    id: 2,
    thumbnail: '/portfolio/thumb2.jpg',
    video: '/portfolio/video2.mp4',
    labelPng: '/portfolio/label2.png',
    alt: 'Project 2',
  },
  // ...more projects
];

export default function PortfolioSection() {
  return (
    <section className="relative w-full min-h-screen bg-background py-24 px-4 flex flex-col items-center">
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
      {/* Responsive dynamic grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {projects.map((project) => (
          <div
            key={project.id}
            className="relative group aspect-[4/3] rounded-xl overflow-hidden shadow-lg bg-black/40"
          >
            {/* Thumbnail image (will be replaced with video on hover) */}
            <img
              src={project.thumbnail}
              alt={project.alt}
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Dark overlay (default, fades on hover) */}
            <div className="absolute inset-0 bg-black/70 group-hover:bg-black/20 transition-colors duration-300" />
            {/* TODO: On hover, show PNG label following mouse and play video */}
            {/* Placeholder for now */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <span className="text-white text-xl font-bold">Project Label</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
} 