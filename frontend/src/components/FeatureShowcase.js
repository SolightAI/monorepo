import React, { useState, useEffect, useRef } from 'react';
import { Brain, Zap, Target, Users } from 'lucide-react';

const FeatureShowcase = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const featureListRef = useRef(null);

  const features = [
    {
      icon: Zap,
      title: "Fully Automated QA",
      description: "Test all aspects of your product from a user's perspective and receive notifications when there is an issue.",
      detailedDescription: [
        "Automatically creates tests based on your URL",
        "Run those tests at the selected frequency",
        "Detailed report on errors and suggested fixes"
      ],
    },
    {
      icon: Users,
      title: "User Experience Analysis",
      description: "Quality Assurance is much more that checking for bugs. Find areas of improvements in your user flows and messageing",
      detailedDescription: [
        "Automatically scans your website for improvements",
        "Find points of frictions and drop offs in your user flows",
        "Get recommendations on how to improve your user experience"
      ],
    },
    {
      icon: Target,
      title: "Ad Impact Testing",
      description: "Test your ads on specific user segments with AI replicas of your users",
      detailedDescription: [
        "Extend beyond your website and test your advertising assets",
        "Run simulations of your ads on AI replicas of your users and see how they perform",
        "Stop wasting money and time on traditionalA/B tests"
      ],
    },
    {
      icon: Brain,
      title: "Content Optimization",
      description: "Optimize your Organic Content to increase engagement and conversions based on AI user replicas.=",
      detailedDescription: [
        "Improve your content strategy and increase engagement and virality",
        "Expose your content to AI replicas of your users and see how they react",
        "Focus on the content that matters most to your users"
      ],
    }
  ];

  useEffect(() => {
    if (!isHovering) {
      const interval = setInterval(() => {
        setActiveFeature((prev) => (prev + 1) % features.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isHovering, features.length]);

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      <div className="space-y-4" ref={featureListRef}>
        {features.map((feature, index) => (
          <div
            key={index}
            className={`p-6 rounded-xl transition-all duration-300 cursor-pointer
              ${activeFeature === index 
                ? 'bg-white/10 backdrop-blur-lg transform scale-105' 
                : 'bg-white/5 hover:bg-white/10'}`}
            onMouseEnter={() => {
              setActiveFeature(index);
              setIsHovering(true);
            }}
            onMouseLeave={() => setIsHovering(false)}
          >
            <div className="flex items-start space-x-4">
              <feature.icon className={`w-6 h-6 ${activeFeature === index ? 'text-laneo-400' : 'text-gray-400'}`} />
              <div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
                <ul className="text-gray-500 mt-2 list-disc pl-5">
                  {feature.detailedDescription.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureShowcase; 