import React, { useState } from 'react';

const DesignSystem: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <div className="design-system-container p-8 bg-black text-white min-h-screen">
      <h1 className="text-4xl font-bold mb-8">Design System</h1>

      <section className="typography-section mb-8">
        <h2 className="text-2xl font-semibold mb-4">Typography</h2>
        {/* Example Typography - Adjust class names/styles based on actual implementation (Tailwind) */}
        <div className="mb-4">
          <h1 className="font-display text-5xl font-bold">Heading 1 - Bold Display</h1>
          <h2 className="font-display text-4xl font-bold">Heading 2 - Bold Display</h2>
          <h3 className="font-display text-3xl font-bold">Heading 3 - Bold Display</h3>
          <h4 className="font-display text-2xl font-bold">Heading 4 - Bold Display</h4>
          <h5 className="font-display text-xl font-bold">Heading 5 - Bold Display</h5>
          <h6 className="font-display text-lg font-bold">Heading 6 - Bold Display</h6>
        </div>
        <div className="mb-4">
          <p className="font-body text-base">Body text - Neutral Sans-serif. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
          <p className="font-body text-lg">Body text Large - Neutral Sans-serif.</p>
          <p className="font-body text-sm">Body text Small - Neutral Sans-serif.</p>
        </div>
      </section>

      <section className="color-section mb-8">
        <h2 className="text-2xl font-semibold mb-4">Colors</h2>
        <div className="flex flex-wrap gap-4">
          <div className="w-32 h-32 bg-black text-white flex items-center justify-center border border-white">Black</div>
          <div className="w-32 h-32 bg-white text-black flex items-center justify-center border border-black">White</div>
          <div className="w-32 h-32 bg-[#49c5b6] text-white flex items-center justify-center">Accent Teal (#49c5b6)</div>
          <div className="w-32 h-32 bg-gray-800 text-white flex items-center justify-center">Dark Gray (Example)</div>
        </div>
      </section>

      <section className="button-section mb-8">
        <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
        <div className="flex flex-wrap items-center gap-4">
          {/* Primary Button */}
          <button className="bg-[#49c5b6] text-white px-6 py-3 rounded-md font-semibold hover:opacity-90 transition-opacity">Primary Button</button>
          {/* Small Button */}
          <button className="bg-[#49c5b6] text-white px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity">Small Button</button>
          {/* Large Button */}
          <button className="bg-[#49c5b6] text-white px-8 py-4 rounded-md text-lg font-semibold hover:opacity-90 transition-opacity">Large Button</button>
          {/* Secondary Button (Example: Outlined) */}
          <button className="border border-[#49c5b6] text-[#49c5b6] px-6 py-3 rounded-md font-semibold hover:bg-[#49c5b6] hover:text-black transition-colors">Secondary Button</button>
          {/* Disabled Button */}
          <button className="bg-gray-600 text-gray-400 px-6 py-3 rounded-md font-semibold cursor-not-allowed" disabled>Disabled Button</button>
        </div>
      </section>

      <section className="animation-section mb-8">
        <h2 className="text-2xl font-semibold mb-4">Animations</h2>
        <p className="mb-4">This section will showcase different types of animations used throughout the platform, including:</p>
        <ul className="list-disc list-inside mb-4">
          <li>3D Transitions (potentially using Three.js, WebGL, GSAP)</li>
          <li>Micro-animations (like Lottie files for subtle interactions)</li>
          <li>CSS Transitions and Keyframe Animations</li>
        </ul>
        <div className="flex flex-wrap items-center gap-4">
          {/* Simple CSS Transition Example */}
          <div className="w-24 h-24 bg-[#49c5b6] transition-all duration-300 ease-in-out hover:rotate-45 hover:scale-110 flex items-center justify-center text-black font-semibold">
            Hover Me
          </div>
          {/* Placeholder for a Lottie Animation Component */}
          <div className="w-32 h-32 border border-gray-600 flex items-center justify-center">
            Lottie Animation Placeholder
          </div>
          {/* Placeholder for a 3D Animation Component */}
          <div className="w-40 h-32 border border-gray-600 flex items-center justify-center">
            3D Animation Placeholder
          </div>
        </div>
      </section>

      <section className="input-section mb-8">
        <h2 className="text-2xl font-semibold mb-4">Input Fields</h2>
        <div className="flex flex-col gap-4 w-full max-w-md">
          {/* Default Input */}
          <div>
            <label htmlFor="default-input" className="block text-sm font-medium text-gray-300 mb-1">Default Input</label>
            <input
              type="text"
              id="default-input"
              placeholder="Enter text here"
              className="w-full px-4 py-2 border border-gray-700 rounded-md bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:border-[#49c5b6] focus:ring-1 focus:ring-[#49c5b6]"
            />
          </div>

          {/* Focused Input */}
          <div>
            <label htmlFor="focused-input" className="block text-sm font-medium text-gray-300 mb-1">Focused Input</label>
            <input
              type="text"
              id="focused-input"
              placeholder="This is focused..."
              className="w-full px-4 py-2 border border-[#49c5b6] rounded-md bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:border-[#49c5b6] focus:ring-1 focus:ring-[#49c5b6]"
              value="Example focused text"
              readOnly // To visually show focused state without manual focus
            />
          </div>

          {/* Disabled Input */}
          <div>
            <label htmlFor="disabled-input" className="block text-sm font-medium text-gray-500 mb-1">Disabled Input</label>
            <input
              type="text"
              id="disabled-input"
              placeholder="This is disabled..."
              className="w-full px-4 py-2 border border-gray-800 rounded-md bg-gray-800 text-gray-500 placeholder-gray-600 cursor-not-allowed"
              disabled
            />
          </div>

          {/* Input with Label and Helper Text (Example Structure) */}
           <div>
            <label htmlFor="helper-text-input" className="block text-sm font-medium text-gray-300 mb-1">Input with Helper Text</label>
            <input
              type="text"
              id="helper-text-input"
              placeholder="Enter something..."
              className="w-full px-4 py-2 border border-gray-700 rounded-md bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:border-[#49c5b6] focus:ring-1 focus:ring-[#49c5b6]"
            />
            <p className="mt-1 text-sm text-gray-500">Helper text goes here.</p>
          </div>

           {/* Example of different input types */}
            <div>
            <label htmlFor="email-input" className="block text-sm font-medium text-gray-300 mb-1">Email Input</label>
            <input
              type="email"
              id="email-input"
              placeholder="Enter email..."
              className="w-full px-4 py-2 border border-gray-700 rounded-md bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:border-[#49c5b6] focus:ring-1 focus:ring-[#49c5b6]"
            />
          </div>

           <div>
            <label htmlFor="password-input" className="block text-sm font-medium text-gray-300 mb-1">Password Input</label>
            <input
              type="password"
              id="password-input"
              placeholder="Enter password..."
              className="w-full px-4 py-2 border border-gray-700 rounded-md bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:border-[#49c5b6] focus:ring-1 focus:ring-[#49c5b6]"            />
          </div>

        </div>
      </section>

      <section className="card-section mb-8">
        <h2 className="text-2xl font-semibold mb-4">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Card Example */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-2">Basic Card</h3>
            <p className="text-gray-400 text-sm">This is a basic card structure with a title and some descriptive text.</p>
          </div>

          {/* Card with Image Placeholder */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <div className="w-full h-40 bg-gray-700 flex items-center justify-center text-gray-400">Image Placeholder</div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">Card with Image</h3>
              <p className="text-gray-400 text-sm">A card featuring a placeholder for an image above the content area.</p>
            </div>
          </div>

          {/* Card with Button */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">Card with Button</h3>
              <p className="text-gray-400 text-sm mb-4">This card includes a button for user interaction.</p>
            </div>
            <button className="self-start bg-[#49c5b6] text-black px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity">Action</button>
          </div>
        </div>
      </section>

      <section className="form-section mb-8">
        <h2 className="text-2xl font-semibold mb-4">Forms</h2>
        <div className="flex flex-col gap-6 w-full max-w-md">
          {/* Text Input Example */}
          <div>
            <label htmlFor="form-text-input" className="block text-sm font-medium text-gray-300 mb-1">Text Input</label>
            <input type="text" id="form-text-input" placeholder="Enter text" className="w-full px-4 py-2 border border-gray-700 rounded-md bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:border-[#49c5b6] focus:ring-1 focus:ring-[#49c5b6]" />
          </div>

          {/* Textarea Example */}
          <div>
            <label htmlFor="form-textarea" className="block text-sm font-medium text-gray-300 mb-1">Textarea</label>
            <textarea id="form-textarea" rows={4} placeholder="Enter longer text" className="w-full px-4 py-2 border border-gray-700 rounded-md bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:border-[#49c5b6] focus:ring-1 focus:ring-[#49c5b6]}"></textarea>
          </div>

          {/* Checkbox Example */}
          <div className="flex items-center">
            <input type="checkbox" id="form-checkbox" className="h-4 w-4 text-[#49c5b6] border-gray-700 rounded focus:ring-[#49c5b6] bg-gray-900" />
            <label htmlFor="form-checkbox" className="ml-2 block text-sm text-gray-300">Check me out</label>
          </div>

          {/* Radio Button Example */}
          <div className="flex flex-col">
            <span className="block text-sm font-medium text-gray-300 mb-2">Radio Options</span>
            <div className="flex items-center">
              <input type="radio" id="radio-one" name="radio-group" className="h-4 w-4 text-[#49c5b6] border-gray-700 focus:ring-[#49c5b6] bg-gray-900" />
              <label htmlFor="radio-one" className="ml-2 block text-sm text-gray-300">Option 1</label>
            </div>
            <div className="flex items-center mt-2">
              <input type="radio" id="radio-two" name="radio-group" className="h-4 w-4 text-[#49c5b6] border-gray-700 focus:ring-[#49c5b6] bg-gray-900" />
              <label htmlFor="radio-two" className="ml-2 block text-sm text-gray-300">Option 2</label>
            </div>
          </div>

           {/* Select Dropdown Example */}
          <div>
            <label htmlFor="form-select" className="block text-sm font-medium text-gray-300 mb-1">Select Option</label>
            <select id="form-select" className="w-full px-4 py-2 border border-gray-700 rounded-md bg-gray-900 text-white focus:outline-none focus:border-[#49c5b6] focus:ring-1 focus:ring-[#49c5b6]}">
              <option>Option A</option>
              <option>Option B</option>
              <option>Option C</option>
            </select>
          </div>

        </div>
      </section>

      <section className="navigation-section mb-8">
        <h2 className="text-2xl font-semibold mb-4">Navigation</h2>
        <div>
          <h3 className="text-xl font-semibold mb-2">Links</h3>
          <div className="flex flex-wrap items-center gap-4">
            {/* Default Link */}
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Default Link</a>
            {/* Accent Link */}
            <a href="#" className="text-[#49c5b6] hover:text-teal-400 transition-colors">Accent Link</a>
            {/* Active Link (Example) */}
            <a href="#" className="text-white border-b border-white">Active Link</a>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-2">Navigation Bar (Example)</h3>
          <nav className="bg-gray-900 p-4 rounded-md">
            <ul className="flex space-x-6">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Home</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Services</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </nav>
        </div>
      </section>

      <section className="modal-section mb-8">
        <h2 className="text-2xl font-semibold mb-4">Modals</h2>
        <button
          onClick={toggleModal}
          className="bg-[#49c5b6] text-black px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Open Modal
        </button>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-sm relative border border-gray-700">
              <button
                onClick={toggleModal}
                className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl"
              >
                &times;
              </button>
              <h3 className="text-xl font-semibold mb-4">Modal Title</h3>
              <p className="text-gray-400 text-sm">This is a basic modal example. Click the X or outside to close.</p>
            </div>
          </div>
        )}
      </section>

      <section className="alert-section mb-8">
        <h2 className="text-2xl font-semibold mb-4">Alerts</h2>
        <div className="flex flex-col gap-4 w-full max-w-md">
          {/* Success Alert */}
          <div className="bg-green-900 text-green-200 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Success!</strong>
            <span className="block sm:inline"> Your operation was successful.</span>
          </div>
          {/* Error Alert */}
          <div className="bg-red-900 text-red-200 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> Something went wrong.</span>
          </div>
          {/* Info Alert */}
          <div className="bg-blue-900 text-blue-200 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Info!</strong>
            <span className="block sm:inline"> This is an informational message.</span>
          </div>
        </div>
      </section>

      <section className="loader-section mb-8">
        <h2 className="text-2xl font-semibold mb-4">Loaders</h2>
        <div className="flex items-center gap-6">
          {/* Spinner Loader */}
          <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-12 w-12"></div>
          {/* Basic Progress Bar (Static Example) */}
          <div className="w-32 bg-gray-700 rounded-full h-4 overflow-hidden">
            <div className="bg-[#49c5b6] h-4 rounded-full" style={{ width: '45%' }}></div>
          </div>
        </div>
         {/* Note: Spinner requires CSS animation definition */}
          <p className="text-sm text-gray-500 mt-2">Note: The spinner requires CSS animation definition (e.g., in your global CSS or a style block).</p>
      </section>

    </div>
  );
};

export default DesignSystem;
