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
  const [demoStep, setDemoStep] = useState(0);
  const demoSteps = [
    { message: "Scanning website structure and user flows...", type: "blue" },
    { message: "Generating comprehensive test cases for checkout, login, and product browsing flows", type: "blue" },
    { message: "Running 24 automated tests across 3 device types...", type: "blue" },
    { message: "Results: 22 tests passed, 2 issues detected", type: "green" },
    { message: "Critical issue: Form validation error on mobile checkout. Generating fix recommendation...", type: "green" }
  ];

  // Add effect to cycle through demo steps
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDemoStep((prevStep) => (prevStep + 1) % demoSteps.length);
    }, 3000); // Change step every 3 seconds
    
    return () => clearInterval(interval);
  }, []);

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

      <main className="h-screen overflow-y-auto snap-y snap-proximity pt-16">
        {/* Hero Section */}
        <section
          id="hero"
          className="min-h-screen snap-start flex items-center justify-center overflow-hidden relative pb-24"
        >
          <AnimatedBackground />

          <div className="container mx-auto px-4 py-20 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Left side - existing content */}
              <div className="text-left">
                <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white/90 via-white/70 to-white/40 text-transparent bg-clip-text">
                  Elevate Your Product's Quality
                </h1>
                <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-xl">
                  Focus on innovating. Let Laneo's fully automated Quality Assurance agents proactively monitor, audit, and improve your website and app user journeys. 
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
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
              
              {/* Right side - interactive demo */}
              <div className="hidden md:block relative">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-xl">
                  <div className="flex items-center mb-4">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="mx-auto text-xs text-gray-400">Laneo QA Agent</div>
                  </div>
                  
                  <div className="space-y-4 min-h-[200px]">
                    {demoSteps.map((step, index) => (
                      <div 
                        key={index} 
                        className={`flex items-start transition-all duration-500 ${
                          index <= demoStep ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                        }`}
                      >
                        <div className={`bg-${step.type}-500/20 rounded-lg p-3 max-w-xs`}>
                          <p className="text-sm text-white">{step.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                        style={{width: `${(demoStep + 1) * (100 / demoSteps.length)}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="min-h-screen snap-start py-24 relative flex items-center">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900/50 to-black" />
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black to-transparent pointer-events-none" />
          <AnimatedBackground />

          <div className="container mx-auto px-4 relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold text-center mb-12 bg-gradient-to-r from-white/90 via-white/70 to-white/40 text-transparent bg-clip-text">
              A Better Way to QA
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 md:mt-16">
              {/* Benefit cards with reduced padding on mobile */}
              {/* Benefit 1 */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 md:p-8 border border-white/10 shadow-2xl transform transition-all duration-300 hover:scale-105 hover:bg-white/10 group">
                <div className="flex items-center justify-center h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 mb-4 md:mb-8 mx-auto group-hover:from-blue-500/50 group-hover:to-purple-500/50 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10 text-blue-400 group-hover:text-blue-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-center mb-2 md:mb-4 text-white group-hover:text-blue-300 transition-colors">Minimal Costs</h3>
                <p className="text-gray-400 text-center text-sm md:text-base leading-relaxed">
                  Augment your QA capabilities cost-effectively. Expand your test coverage and enhance your QA teams without increasing your budget or team size.
                </p>
              </div>
              
              {/* Benefit 2 */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 md:p-8 border border-white/10 shadow-2xl transform transition-all duration-300 hover:scale-105 hover:bg-white/10 group">
                <div className="flex items-center justify-center h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 mb-4 md:mb-8 mx-auto group-hover:from-blue-500/50 group-hover:to-purple-500/50 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10 text-blue-400 group-hover:text-blue-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-center mb-2 md:mb-4 text-white group-hover:text-blue-300 transition-colors">Delighted Users</h3>
                <p className="text-gray-400 text-center text-sm md:text-base leading-relaxed">
                  Eliminate escaped defects and ensure your users experience a seamless, frustration-free journey through your product.
                </p>
              </div>
              
              {/* Benefit 3 */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 md:p-8 border border-white/10 shadow-2xl transform transition-all duration-300 hover:scale-105 hover:bg-white/10 group">
                <div className="flex items-center justify-center h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 mb-4 md:mb-8 mx-auto group-hover:from-blue-500/50 group-hover:to-purple-500/50 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10 text-blue-400 group-hover:text-blue-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-center mb-2 md:mb-4 text-white group-hover:text-blue-300 transition-colors">Increased Productivity</h3>
                <p className="text-gray-400 text-center text-sm md:text-base leading-relaxed">
                  Allow Product and Engineering teams to focus on high value activities, accelerating development and increasing employee satisfaction.
                </p>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />
        </section>

        {/* Features Section */}
        <section id="features" className="min-h-screen snap-start py-24 relative flex items-center">
          {/* Background Elements - updated to match other sections */}
          <div className="absolute inset-0 bg-black overflow-hidden">
            <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-900/10 blur-[120px]"></div>
            <div className="absolute -bottom-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-900/10 blur-[120px]"></div>
            <div className="absolute top-[20%] right-[5%] w-[40%] h-[40%] rounded-full bg-blue-900/5 blur-[80px]"></div>
          </div>
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black to-transparent pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 bg-gradient-to-r from-white/90 via-white/70 to-white/40 text-transparent bg-clip-text sticky top-24">
              {/* Title can be empty as FeatureShowcase has its own title */}
            </h2>
            <div className="overflow-hidden">
              <FeatureShowcase hideTitle={true} />
            </div>
          </div>
          
          {/* Add bottom gradient for transition */}
          <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />
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
        <section id="contact" className="min-h-screen snap-start py-24 relative flex flex-col">
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
