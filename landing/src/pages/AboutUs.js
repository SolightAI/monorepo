import React from 'react';
import About from '../components/About';
import AnimatedBackground from '../components/AnimatedBackground';
import Header from '../components/Header';
import Footer from '../components/Footer';

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

      <Footer />
    </div>
  );
}
