'use client'

import { useEffect, useRef, useState } from 'react';
// import { gsap } from 'gsap'; // Temporarily remove GSAP
// import { ScrollTrigger } from 'gsap/ScrollTrigger'; // Temporarily remove ScrollTrigger
import PortfolioThumbnail from './portfolio/PortfolioThumbnail';
// import ProjectModal from './portfolio/ProjectModal'; // Temporarily remove ProjectModal

// if (typeof window !== 'undefined') { // Temporarily remove GSAP plugin registration
//   gsap.registerPlugin(ScrollTrigger);
// }

// Removed onEndInView from props as it's no longer used
// interface PortfolioSectionProps {
//   onEndInView?: () => void;
// }

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

// Removed onEndInView from function signature
export default function PortfolioSection() { 
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [selectedProject, setSelectedProject] = useState<typeof projects[0] | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [numCols, setNumCols] = useState(3);
  // const endRef = useRef<HTMLDivElement>(null); // No longer needed for this specific ScrollTrigger

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const handleResize = () => {
      if (window.innerWidth < 768) setNumCols(1);
      else if (window.innerWidth < 1024) setNumCols(2);
      else setNumCols(3);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Temporarily removed all GSAP animations and ScrollTriggers
  // useEffect(() => {
  //   if (!titleRef.current) return;
  //   const titleAnimation = gsap.fromTo(titleRef.current,
  //     { opacity: 0, y: 40 },
  //     {
  //       opacity: 1,
  //       y: 0,
  //       duration: 0.7,
  //       ease: "power2.out",
  //       scrollTrigger: {
  //         trigger: titleRef.current,
  //         start: "top bottom-=100",
  //         end: "top center",
  //         toggleActions: "play none none reverse"
  //       }
  //     }
  //   );
  //   return () => {
  //     if (titleAnimation.scrollTrigger) {
  //       titleAnimation.scrollTrigger.kill();
  //     }
  //   };
  // }, []);

  // Helper to split projects into columns
  function splitIntoColumns<T>(arr: T[], numCols: number): T[][] {
    const cols: T[][] = Array.from({ length: numCols }, () => []);
    arr.forEach((item, idx) => {
      cols[idx % numCols].push(item);
    });
    return cols;
  }

  const columns: Array<typeof projects[number]>[] = splitIntoColumns(projects, numCols);

  const handleThumbnailClick = (project: typeof projects[0]) => {
    // setSelectedProject(project); // Modal removed, so no need to set it
    console.log("Thumbnail clicked, project:", project); // Keep for testing click
  };

  return (
    <section
      id="portfolio-section"
      ref={sectionRef}
      className="relative w-full bg-background py-24 flex flex-col items-center z-10"
    >
      <h2
        ref={titleRef}
        className="text-4xl md:text-6xl font-bold font-inter text-center mb-16 text-white drop-shadow-lg"
      >
        Witness the Vision.
      </h2>

      <div className="w-full px-4 flex flex-row gap-4 justify-center">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-4 flex-1 min-w-0">
            {col.map((project, idx) => {
              const globalIdx = colIdx + idx * numCols;
              return (
                <PortfolioThumbnail
                  key={project.id}
                  project={project}
                  isHovered={hoveredIndex === globalIdx}
                  onClick={() => handleThumbnailClick(project)}
                  onMouseEnter={() => setHoveredIndex(globalIdx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* <div ref={endRef} className="w-full h-1" /> */}{/* No longer needed */}
    </section>
  );
} 