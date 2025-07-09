'use client'

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap'; 
// import { ScrollTrigger } from 'gsap/ScrollTrigger'; // Not strictly needed for this design yet
// import PortfolioThumbnail from './portfolio/PortfolioThumbnail'; // No longer needed
import ProjectModal from './portfolio/ProjectModal'; // Import the new modal

const projects = [
  { id: 1, displayText: 'Verified by JayValLeo', thumbnail: '/images/thumbnails/proj1.png', alt: 'Verified by JayValLeo', video: '/videos/proj1.mp4', details: 'Project 1 details' },
  { id: 2, displayText: 'Project Alpha', thumbnail: '/images/thumbnails/proj2.png', alt: 'Project Alpha', video: '/videos/proj2.mp4', details: 'Project 2 details' },
  { id: 3, displayText: 'Project Beta', thumbnail: '/images/thumbnails/proj3.png', alt: 'Project Beta', video: '/videos/proj3.mp4', details: 'Project 3 details' },
  { id: 4, displayText: 'Project Gamma', thumbnail: '/images/thumbnails/proj4.png', alt: 'Project Gamma', video: '/videos/proj4.mp4', details: 'Project 4 details' },
  { id: 5, displayText: 'Project Delta', thumbnail: '/images/thumbnails/proj5.png', alt: 'Project Delta', video: '/videos/proj5.mp4', details: 'Project 5 details' },
  { id: 6, displayText: 'Project Epsilon', thumbnail: '/images/thumbnails/proj6.png', alt: 'Project Epsilon', video: '/videos/proj6.mp4', details: 'Project 6 details' },
  { id: 7, displayText: 'Project Zeta', thumbnail: '/images/thumbnails/proj7.png', alt: 'Project Zeta', video: '/videos/proj7.mp4', details: 'Project 7 details' },
  { id: 8, displayText: 'Project Eta', thumbnail: '/images/thumbnails/proj8.png', alt: 'Project Eta', video: '/videos/proj8.mp4', details: 'Project 8 details' },
  { id: 9, displayText: 'Project Theta', thumbnail: '/images/thumbnails/proj9.png', alt: 'Project Theta', video: '/videos/proj9.mp4', details: 'Project 9 details' },
  { id: 10, displayText: 'Project Iota', thumbnail: '/images/thumbnails/proj10.png', alt: 'Project Iota', video: '/videos/proj10.mp4', details: 'Project 10 details' },
  { id: 11, displayText: 'Project Kappa', thumbnail: '/images/thumbnails/proj11.png', alt: 'Project Kappa', video: '/videos/proj11.mp4', details: 'Project 11 details' },
  { id: 12, displayText: 'Project Lambda', thumbnail: '/images/thumbnails/proj12.png', alt: 'Project Lambda', video: '/videos/proj12.mp4', details: 'Project 12 details' },
  { id: 13, displayText: 'Project Mu', thumbnail: '/images/thumbnails/proj13.png', alt: 'Project Mu', video: '/videos/proj13.mp4', details: 'Project 13 details' },
  { id: 14, displayText: 'Project Nu', thumbnail: '/images/thumbnails/proj14.png', alt: 'Project Nu', video: '/videos/proj14.mp4', details: 'Project 14 details' },
  { id: 15, displayText: 'Project Xi', thumbnail: '/images/thumbnails/proj15.png', alt: 'Project Xi', video: '/videos/proj15.mp4', details: 'Project 15 details' },
  { id: 16, displayText: 'Project Omicron', thumbnail: '/images/thumbnails/proj16.png', alt: 'Project Omicron', video: '/videos/proj16.mp4', details: 'Project 16 details' },
  { id: 17, displayText: 'Project Pi', thumbnail: '/images/thumbnails/proj17.png', alt: 'Project Pi', video: '/videos/proj17.mp4', details: 'Project 17 details' },
  { id: 18, displayText: 'Project Rho', thumbnail: '/images/thumbnails/proj18.png', alt: 'Project Rho', video: '/videos/proj18.mp4', details: 'Project 18 details' },
];

export default function PortfolioSection() { 
  const sectionRef = useRef<HTMLDivElement>(null);
  const sectionTitleRef = useRef<HTMLHeadingElement>(null); // Main section title "Witness the Vision."
  const backgroundRefs = useRef<(HTMLImageElement | null)[]>([]);

  const [activeProject, setActiveProject] = useState(projects[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectForModal, setProjectForModal] = useState<typeof projects[0] | null>(null);

  useEffect(() => {
    backgroundRefs.current = backgroundRefs.current.slice(0, projects.length);
    // Initialize: set first project's background to visible, others to invisible
    const initialActiveIndex = projects.findIndex(p => p.id === activeProject.id);
    backgroundRefs.current.forEach((img, idx) => {
      if (img) {
        gsap.set(img, { opacity: idx === initialActiveIndex ? 1 : 0 });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    // Handle background transition when activeProject changes
    const activeIndex = projects.findIndex(p => p.id === activeProject.id);
    backgroundRefs.current.forEach((img, idx) => {
      if (img) {
        gsap.to(img, { 
          opacity: idx === activeIndex ? 1 : 0, 
          duration: 0.7, 
          ease: 'power2.inOut' 
        });
      }
    });
  }, [activeProject]);

  const handleTitleListItemHover = (project: typeof projects[0]) => {
    setActiveProject(project);
  };

  const handleTitleListItemClick = (project: typeof projects[0]) => {
    setProjectForModal(project);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setProjectForModal(null);
  };

  return (
    <section
      id="portfolio-section"
      ref={sectionRef}
      className="relative w-full bg-black py-16 md:py-24 flex flex-col items-center justify-center z-10"
      style={{ minHeight: '100vh' }} // Ensure section has height for layout
    >
      {/* Background Images Container */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        {projects.map((project, idx) => (
          <img
                  key={project.id}
            ref={el => { backgroundRefs.current[idx] = el; }}
                    src={project.thumbnail}
                    alt={project.alt}
            className="absolute inset-0 w-full h-full object-cover opacity-0" // Initial opacity 0, GSAP handles it
          />
        ))}
      </div>

      {/* Overlay Content: Section Title and Project List */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center px-4">
        <h2
          ref={sectionTitleRef}
          className="text-5xl md:text-7xl font-bold font-inter mb-12 md:mb-16 text-white"
          style={{ textShadow: '0px 2px 10px rgba(0,0,0,0.7)' }}
        >
          Witness the Vision.
        </h2>

        {/* Project Titles List - styled to be large and on the left-ish side */}
        {/* For a more left-aligned list, adjust container and ul classes */}
        <div className="w-full max-w-md md:max-w-lg lg:max-w-xl">
          <ul className="space-y-3 md:space-y-4">
            {projects.map((project) => (
              <li
                key={project.id}
                className={`text-2xl md:text-3xl lg:text-4xl font-semibold cursor-pointer transition-all duration-300 ease-in-out 
                            ${activeProject?.id === project.id 
                              ? 'text-purple-400 scale-110' 
                              : 'text-gray-400 hover:text-white hover:scale-105'}`}
                style={{ textShadow: '0px 1px 5px rgba(0,0,0,0.8)' }}
                onMouseEnter={() => handleTitleListItemHover(project)}
                onClick={() => handleTitleListItemClick(project)}
              >
                {project.displayText}
              </li>
            ))}
          </ul>
        </div>
            </div>

      {/* Use the new ProjectModal component */}
      <ProjectModal project={projectForModal} onClose={closeModal} />
    </section>
  );
} 