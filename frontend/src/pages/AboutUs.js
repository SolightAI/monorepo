import React from 'react';
import About from '../components/About';
import AnimatedBackground from '../components/AnimatedBackground';

export default function AboutUs() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white overflow-hidden">
      <header className="fixed top-0 left-0 right-0 bg-black/50 backdrop-blur-sm z-20">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <a href="/" className="text-white font-bold text-lg">Laneo</a>
          <nav className="flex space-x-4 md:space-x-8">
            <a href="/" className="text-white hover:text-laneo-400 transition-colors">
              Home
            </a>
            <a href="/#features" className="text-white hover:text-laneo-400 transition-colors">
              Features
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="relative min-h-screen">
          <AnimatedBackground />
          
          {/* This div ensures the About component has a proper container */}
          <div className="relative z-10">
            <div id="about" className="min-h-screen">
              <About />
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 border-t border-white/10 bg-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">&copy; 2025 Laneo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
