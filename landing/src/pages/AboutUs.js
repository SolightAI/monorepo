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

      <footer className="py-8 border-t border-white/10 bg-black relative z-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">&copy; 2025 Laneo. All rights reserved.</p>
            
            {/* Sign Up button in center */}
            <div className="my-4 md:my-0 relative z-10">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLScq0g8iWlWzel10HwjhZeCWnGbl1VrzsHAnW8hj2h0mylQtew/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 rounded-full bg-green-500 hover:bg-green-400 transition-colors text-white text-sm font-medium pointer-events-auto"
              >
                Sign Up
              </a>
            </div>
            
            <div className="text-gray-400 text-sm">
              <p>Contact us: <a href="mailto:contact@laneo.io" className="text-blue-400 hover:text-white transition-colors">contact@laneo.io</a></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
