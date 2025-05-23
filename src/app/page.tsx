'use client'
import { motion } from 'framer-motion'
import AccentText from '@/components/AccentText'

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* Initial Header: The Immersive Trailer */}
      <section className="relative h-screen w-full overflow-hidden flex flex-col items-center justify-center">
        {/* Overlay Content */}
        <div className="z-10 flex flex-col items-center justify-center h-full w-full">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="font-sans font-extrabold text-4xl md:text-6xl text-center mb-4"
          >
            More Than Just{' '}
            <AccentText color="blue">Music.</AccentText>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            className="max-w-xl text-center text-lg md:text-xl text-foreground mb-8"
          >
            Sweet Dreams Music is your premier destination for professional audio recording, cutting-edge videography, and impactful branding solutions. We bring your creative visions to life.
          </motion.p>
          <div className="flex gap-4">
            <button className="rounded-lg px-6 py-3 font-semibold bg-accent-red text-white hover:bg-accent-blue transition-colors">
              Explore Services
            </button>
            <button className="rounded-lg px-6 py-3 font-semibold border border-foreground text-foreground hover:bg-accent-blue hover:text-white transition-colors">
              Our Portfolio
            </button>
          </div>
        </div>
      </section>
    </main>
  )
} 