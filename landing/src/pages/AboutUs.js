import React from 'react';
import About from '../components/About';
import AnimatedBackground from '../components/AnimatedBackground';
import Header from '../components/Header';

export default function AboutUs() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white overflow-hidden">
      <Header />

      <main className="flex-1">
        <div className="relative min-h-screen">
          <AnimatedBackground />
          
          {/* This div ensures the About component has a proper container */}
          <div className="relative z-10">
            <div id="about" className="min-h-screen">
              <About />
            </div>
            
            {/* The Founders section has been moved to the About component */}
          </div>
        </div>
      </main>

      <footer className="py-8 border-t border-white/10 bg-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">&copy; 2025 Laneo. All rights reserved.</p>
            <div className="text-gray-400 text-sm">
              <p>Contact us: <a href="mailto:contact@laneo.io" className="text-blue-400 hover:text-white transition-colors">contact@laneo.io</a></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
