import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
// import InteractiveDemo from '../components/InteractiveDemo';
import AnimatedBackground from '../components/AnimatedBackground';
import FeatureShowcase from '../components/FeatureShowcase';
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
      <header className="fixed top-0 left-0 right-0 bg-black/50 backdrop-blur-sm z-20">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src={require('../components/images/laneo_logo.jpg')} 
              alt="Laneo Logo" 
              className="h-8 w-auto mr-2 filter invert brightness-100" 
            />
            <div className="text-white font-bold text-lg">Laneo</div>
          </div>
          <nav className="flex space-x-4 md:space-x-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-white hover:text-laneo-400 transition-colors"
            >
              Features
            </button>
            <a
              href="/about"
              className="text-white hover:text-laneo-400 transition-colors"
            >
              About Us
            </a>
          </nav>
        </div>
      </header>

      <main className="h-screen overflow-y-auto snap-y snap-mandatory pt-16">
        {/* Hero Section */}
        <section
          id="hero"
          className="h-screen snap-start flex items-center justify-center overflow-hidden relative"
        >
          <AnimatedBackground />

          <div className="container mx-auto px-4 py-20 relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white/90 via-white/70 to-white/40 text-transparent bg-clip-text">
                Elevate Your Product's Quality
              </h1>
              <p className="text-lg md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto">
                Fully automated Quality Assurance that goes far beyond just checking for errors. Uncover areas of improvements in your Customer's Experience and improve your product at unprecedented speed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => scrollToSection('contact')}
                  className="px-8 py-4 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors font-semibold flex items-center justify-center group"
                >
                  <span>
                    Get Started
                  </span>
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
        <section id="features" className="min-h-screen snap-start py-16 relative flex items-center">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900/50 to-black" />
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black to-transparent pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 bg-gradient-to-r from-gray-300 to-blue-500 bg-clip-text text-transparent sticky top-24">
            </h2>
            <div className="overflow-hidden">
              <FeatureShowcase hideTitle={true} />
            </div>
          </div>
        </section>

        {/* Why We Built This Section */}
        <section id="mission" className="min-h-screen snap-start py-16 relative flex items-center">
          
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-gray-300 to-blue-500 bg-clip-text text-transparent mb-16 py-1">
                Why We Built Laneo
              </h2>
              <div className="text-gray-300 text-lg space-y-6 text-left mb-16">
                <p>
                  Customer Experience is how businesses win. As technical moats shrink and customer expectations rise, companies' success depends more than ever on the experience they offer. Yet today, Quality Assurance is slow, manual, and reactive, forcing PMs and engineers to fire-fight instead of innovate.
                </p>
                <p>
                  We're eliminating the Experience Tax, the hidden cost businesses pay for subpar digital experiences. Laneo's Agentic AI is the ultimate weapon against digital disorder, ensuring websites and apps deliver seamless, optimized experiences that drive satisfaction and exponential growth.
                </p>
                <p>
                  Our founders, Antoine (ex PM) and Valentin (ex Engineer), left their previous roles after seeing firsthand how much time was spent on QA instead of building.
                </p>
                <p>
                  We are building Laneo, so you can focus on what matters; innovation.
                </p>
                <div className="mt-16 flex justify-center">
                  <a
                    href="/about"
                    className="px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors font-semibold flex items-center justify-center group text-sm mt-8"
                  >
                    <span>
                      Learn More About Us
                    </span>
                    <ChevronRight className="ml-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          {/* Scroll indicator pointing to the contact section */}
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center animate-bounce cursor-pointer" onClick={() => scrollToSection('contact')}>
            <p className="text-gray-400 mb-2">Continue to see how we can help</p>
            <ChevronRight className="transform rotate-90 text-gray-400" size={24} />
          </div>
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
        <section id="contact" className="min-h-screen snap-start py-16 relative flex flex-col">
        <AnimatedBackground />
          <div className="flex-1 py-20 flex items-center">
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white/90 via-white/70 to-white/40 text-transparent bg-clip-text">
                  Ready to Automate Your QA?
                </h2>
                <p className="text-gray-400 text-lg mb-12">
                  Leave bugs to us and focus on delighting your users. With Laneo, you can automate your QA and improve your product with UX recommendations
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
                <div className="text-gray-400 text-sm">
                  <p>Contact us: <a href="mailto:contact@laneo.io" className="text-blue-400 hover:text-white transition-colors">contact@laneo.io</a></p>
                </div>
              </div>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
