import React, { useState, useEffect } from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';

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

  // Auto-advance carousel with pause on hover
  useEffect(() => {
    let interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % teamHighlights.length);
    }, 5000); // Changed to 5 seconds for better readability

    return () => clearInterval(interval);
  }, []);

  const achievements = [
    { 
      metric: "800+", 
      description: "GitHub Stars",
      link: "https://github.com/Thytu/Agentarium"
    },
    { 
      metric: "$XXXK", 
      description: "Pre-Seed Funding" 
    },
    { 
      metric: "5+", 
      description: "Research Partnerships" 
    },
    { 
      metric: "10+", 
      description: "Years in AI Research" 
    },
  ];

  const teamHighlights = [
    {
      title: "Elite Research Network",
      description: "Our team collaborates with leading AI researchers from MIT, Stanford, DeepMind, Cambridge, and École normale supérieure Paris, bringing cutting-edge research to practical applications.",
      color: "from-purple-500 to-blue-500"
    },
    {
      title: "Proven Track Record",
      description: "We've successfully scaled AI solutions from concept to enterprise deployment, generating multi-million dollar revenue and delivering measurable business impact for our clients.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Leadership Excellence",
      description: "Our founders combine technical expertise with business acumen, having led high-performance AI teams and delivered enterprise-grade systems that solve real-world challenges.",
      color: "from-cyan-500 to-emerald-500"
    },
    {
      title: "Strategic Partnerships",
      description: "Backed by Entrepreneur First and supported by a growing network of enterprise partners, we're building an ecosystem that accelerates AI adoption across industries.",
      color: "from-emerald-500 to-purple-500"
    }
  ];

  const founders = [
    {
      name: "Antoine Levy",
      title: "CEO & Co-Founder",
      bio: "Antoine brings extensive product leadership experience from the digital media industry, where he built and scaled B2B products generating XX millions in revenue. He also played professional soccer.",
      image: "https://landing.s3.fr-par.scw.cloud/antoine_founder.jpg",
      linkedin: "https://www.linkedin.com/in/antoine-l%C3%A9vy-653106201"
    },
    {
      name: "Valentin De Matos",
      title: "CTO & Co-Founder",
      bio: "Valentin has led AI engineering teams at fast-growing startups and directed R&D initiatives at his university. Before falling in love with Computer Science, he wanted to join the army.",
      image: "https://landing.s3.fr-par.scw.cloud/val_founder.jpg",
      linkedin: "https://www.linkedin.com/in/valentin-de-matos/"
    }
  ];

  return (
    <section id="about" className="relative overflow-hidden h-full min-h-screen flex items-center">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black opacity-70 z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(24,24,27,0.8),rgba(0,0,0,0))] z-10" />
      <AnimatedBackground />

      <div className={`container mx-auto px-4 py-16 relative z-20 transition-all duration-1000 transform ${isIntersecting ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        {/* Section Title */}
        <h2 className="text-5xl font-bold text-center mb-16 bg-gradient-to-r from-white to-laneo-400 text-transparent bg-clip-text">About Laneo</h2>

        {/* Achievement Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {achievements.map((achievement, index) => (
            <div 
              key={index}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-laneo-400/10 to-purple-500/10 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
              <div className="relative p-8 rounded-2xl border border-white/10 group-hover:border-laneo-400/50 transition-all duration-300 h-full flex flex-col bg-black/30 backdrop-blur-sm">
                <div className="text-4xl font-bold bg-gradient-to-r from-white to-laneo-400 text-transparent bg-clip-text mb-2 flex items-center">
                  {achievement.link ? (
                    <a href={achievement.link} target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline">
                      {achievement.metric}
                      <ExternalLink className="ml-2 w-4 h-4" />
                    </a>
                  ) : (
                    achievement.metric
                  )}
                </div>
                <div className="text-gray-300">{achievement.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Founders Section - Moved before mission */}
        <div className="mb-16">
          <div className="relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
            
            <div className="relative z-10 p-8">
              <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-white to-laneo-400 text-transparent bg-clip-text">Meet Our Founders</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {founders.map((founder, index) => (
                  <div key={index} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-laneo-400/10 to-purple-500/10 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                    <div className="relative p-8 rounded-2xl border border-white/10 group-hover:border-laneo-400/50 transition-all duration-300 h-full flex flex-col bg-black/30 backdrop-blur-sm">
                      <div className="w-32 h-32 rounded-full bg-gray-700 mx-auto mb-6 overflow-hidden ring-2 ring-laneo-400/30 group-hover:ring-laneo-400 transition-all duration-300">
                        {founder.image && <img src={founder.image} alt={founder.name} className="w-full h-full object-cover" />}
                      </div>
                      <h3 className="text-2xl font-bold text-center mb-2 text-white">{founder.name}</h3>
                      <p className="text-laneo-400 text-center mb-4">{founder.title}</p>
                      <p className="text-gray-300 text-center mb-4">{founder.bio}</p>
                      {founder.linkedin && (
                        <a 
                          href={founder.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-auto mx-auto flex items-center text-laneo-400 hover:text-white transition-colors duration-300"
                        >
                          Connect on LinkedIn
                          <ExternalLink className="ml-2 w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Our Mission Statement - Now after founders */}
        <div className="mb-16">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-laneo-400/10 to-purple-500/10 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
            <div className="relative p-8 rounded-2xl border border-white/10 group-hover:border-laneo-400/50 transition-all duration-300 bg-black/30 backdrop-blur-sm">
              <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-white to-laneo-400 text-transparent bg-clip-text text-center">Why We Built Laneo</h3>
              <div className="text-gray-300 text-lg space-y-6 text-left">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 