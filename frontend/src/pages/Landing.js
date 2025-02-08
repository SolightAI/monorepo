import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
// import InteractiveDemo from '../components/InteractiveDemo';
import AnimatedBackground from '../components/AnimatedBackground';
import FeatureShowcase from '../components/FeatureShowcase';
import About from '../components/About';
import confetti from 'canvas-confetti';

// Note: The animate-fadeInUp, animate-fadeInDown, animate-fadeInLeft, and animate-fadeInRight classes are assumed 
// to be defined in your CSS or via a library. They add entrance animations with delays.
// You can replace or remove these classes if you're using a different animation approach.

export default function Landing() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fireConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 1000,
    };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white overflow-hidden">
      <main className="h-screen overflow-y-auto snap-y snap-mandatory">
        {/* Hero Section */}
        <section
          id="hero"
          className="h-screen snap-start flex items-center justify-center overflow-hidden relative"
        >
          <AnimatedBackground />

          <div className="container mx-auto px-4 py-20 relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="md:text-7xl font-bold mb-6 bg-gradient-to-r from-white/90 via-white/70 to-white/40 text-transparent bg-clip-text">
                Test Your Growth Funnel in Minutes, Not Weeks
              </h1>
              <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Run Simulations with Thousands of AI Replicas of Your Users to Rapidly Iterate, Validate Growth Strategies, and Optimize Every Stage of the Customer Journey.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => scrollToSection('contact')}
                  className="px-8 py-4 rounded-full bg-laneo-500 hover:bg-laneo-400 transition-colors text-white font-semibold flex items-center justify-center group"
                >
                  Get Started
                  <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                  Know More
                </button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />
        </section>

        {/* Features Section */}
        <section id="features" className="h-screen snap-start py-4 relative flex items-center">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900/50 to-black" />
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black to-transparent pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <FeatureShowcase />
          </div>

        </section>

        {/* About Section */}
        <section id="about" className="h-screen snap-start relative">
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black to-transparent pointer-events-none" />
          <About />
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </section>

        {/* Technology Demo Section */}
        {/* <section id="technology" className="py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-laneo-900/20 to-black" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto mb-16 text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Experience the Power of AI Simulation
              </h2>
              <p className="text-gray-400 text-lg mb-12">
                Watch our AI simulate thousands of user interactions in real-time. Move your cursor to influence user behavior and see how different user segments interact with your interface.
              </p>
              <InteractiveDemo />
            </div>
          </div>
        </section> */}

        {/* Call to Action */}
        <section id="contact" className="h-screen snap-start relative flex flex-col">
          <div className="flex-1 py-20 flex items-center">
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                  Ready to Accelerate Your Growth?
                </h2>
                <p className="text-gray-400 text-lg mb-12">
                  Join forward-thinking growth teams using Laneo to validate strategies and optimize conversion funnels in record time.
                </p>

                <form 
                  className="max-w-md mx-auto space-y-6"
                  action="https://docs.google.com/forms/d/e/1FAIpQLScq0g8iWlWzel10HwjhZeCWnGbl1VrzsHAnW8hj2h0mylQtew/formResponse"
                  method="post"
                  target="_blank"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (isSubmitting) return;

                    setIsSubmitting(true);
                    const formData = new FormData(e.target);
                    const email = formData.get('email');

                    // Submit to Google Form
                    fetch(e.target.action, {
                      method: 'POST',
                      mode: 'no-cors',
                      headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                      },
                      body: new URLSearchParams({
                        'entry.1013663799': email,
                      }).toString(),
                    })
                    .then(() => {
                      fireConfetti();
                      e.target.reset();
                    })
                    .catch((error) => {
                      console.error('Error submitting form:', error);
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                  }}
                >
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    required
                    disabled={isSubmitting}
                    className="w-full px-6 py-4 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-laneo-400 text-white placeholder-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-8 py-4 rounded-lg bg-laneo-500 hover:bg-laneo-400 transition-colors text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Start Your Free Trial'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <footer className="py-8 border-t border-white/10 bg-black">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-400 text-sm">&copy; 2025 Laneo. All rights reserved.</p>
                {/* <a href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </a> */}
              </div>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
