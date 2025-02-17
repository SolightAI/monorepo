import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

export default function About() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0.2 }
    );

    const section = document.getElementById('about');
    if (section) observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const achievements = [
    { metric: "800+", description: "GitHub Stars" },
    { metric: "$XXXk", description: "Raised from VC" },
    { metric: "5+", description: "Top AI Institutions" },
    { metric: "10+", description: "Years Experience in AI" },
  ];

  const teamHighlights = [
    {
      title: "Elite Research Network",
      description: "Collaborating with leading researchers from MIT, Stanford, DeepMind, Cambridge, and École normale supérieure Paris.",
      color: "from-purple-500 to-blue-500"
    },
    {
      title: "Proven Track Record",
      description: "Successfully scaled an AI company from inception to multi-million dollar revenue, demonstrating our ability to deliver real-world AI solutions.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Leadership Excellence",
      description: "Our founders bring hands-on experience in leading high-performance AI teams and delivering enterprise-grade AI systems.",
      color: "from-cyan-500 to-emerald-500"
    },
    {
      title: "Backed by the Best",
      description: "Supported by Entrepreneur First, with significant traction in the open-source community and a growing network of enterprise partners.",
      color: "from-emerald-500 to-purple-500"
    }
  ];

  return (
    <section id="about" className="relative overflow-hidden h-full min-h-screen flex items-center">

      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(24,24,27,0.8),rgba(0,0,0,0))]" />

      <div className={`container mx-auto px-4 py-16 relative z-10 transition-all duration-1000 transform ${isIntersecting ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>

        {/* Achievement Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {achievements.map((achievement, index) => (
            <div 
              key={index}
              className="relative group flex flex-col justify-between"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-laneo-400/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-75" />
              <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-laneo-400/50 transition-all duration-300 flex flex-col justify-between h-full">
                <div className="text-4xl font-bold bg-gradient-to-r from-white to-laneo-400 text-transparent bg-clip-text mb-2">
                  {achievement.metric}
                </div>
                <div className="text-gray-400">{achievement.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Team Highlights */}
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Interactive Card */}
          <div className="relative min-h-[500px] order-2 md:order-1">
            <div className="absolute inset-0 bg-gradient-to-r from-laneo-400/30 to-purple-500/30 rounded-3xl blur-2xl" />
            <div className="relative h-full rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 p-12 overflow-hidden min-h-[500px]">
              {teamHighlights.map((highlight, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 p-12 transition-all duration-500 transform ${
                    index === activeIndex 
                      ? 'translate-x-0 opacity-100' 
                      : index < activeIndex
                        ? '-translate-x-full opacity-0'
                        : 'translate-x-full opacity-0'
                  }`}
                >
                  <h3 className="text-4xl font-bold mb-6 text-white">{highlight.title}</h3>
                  <p className="text-gray-300 text-xl leading-relaxed max-w-lg">{highlight.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-8 order-1 md:order-2">
            <h3 className="text-3xl md:text-4xl font-bold">
              Building the Future of AI, Today
            </h3>
            <p className="text-gray-400 text-lg">
              We're not just another AI startup - we're a team of proven entrepreneurs and researchers who've already scaled successful AI ventures. Our deep technical expertise is matched by our ability to deliver real-world impact.
            </p>
            <div className="space-y-4">
              {teamHighlights.map((highlight, index) => (
                <button
                  key={index}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                    activeIndex === index 
                      ? 'bg-white/10 border-l-4 border-laneo-400' 
                      : 'hover:bg-white/5'
                  }`}
                  onClick={() => setActiveIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{highlight.title}</span>
                    <ChevronRight className={`w-5 h-5 transition-transform ${
                      activeIndex === index ? 'rotate-90' : ''
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 