'use client'

import React from 'react';

interface Project {
  id: number;
  displayText: string;
  thumbnail: string;
  alt: string;
  video?: string; // Video is optional
  details: string;
}

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  if (!project) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4 md:p-8 transition-opacity duration-300 ease-in-out" 
      onClick={onClose} // Close modal on backdrop click
    >
      <div 
        className="bg-neutral-900 text-white w-full max-w-7xl h-auto max-h-[95vh] flex flex-col overflow-hidden shadow-2xl rounded-lg" 
        onClick={e => e.stopPropagation()} // Prevent modal close when clicking inside modal content
      >
        {/* Modal Header (Optional, e.g., for project title and close button) */}
        <div className="p-5 md:p-6 flex justify-between items-center border-b border-neutral-700">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-purple-400">{project.displayText}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body - Side by Side Layout */}
        <div className="p-5 md:p-6 flex-grow overflow-y-auto flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Video Player (Left or Right) */}
          {project.video && (
            <div className="w-full md:w-3/5 flex-shrink-0">
              <div className="aspect-video bg-black rounded-md overflow-hidden shadow-lg">
                <video 
                  src={project.video} 
                  controls 
                  className="w-full h-full object-contain"
                  autoPlay={false} // Consider autoPlay, but usually better with controls
                />
              </div>
            </div>
          )}

          {/* Text Details (Right or Left) */}
          <div className={`w-full ${project.video ? 'md:w-2/5' : 'md:w-full'} space-y-4 prose prose-invert prose-lg max-w-none`}>
            <p className="text-gray-300 leading-relaxed">
              {project.details}
            </p>
            {/* Add more structured details here if needed, e.g., client, year, technologies */}
          </div>
        </div>

        {/* Modal Footer (Optional, e.g., for additional CTAs) */}
        {/* <div className="p-4 border-t border-gray-700 text-right">
          <button 
            onClick={onClose} 
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Done
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default ProjectModal; 