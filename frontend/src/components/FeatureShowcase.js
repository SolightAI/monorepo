import React, { useState, useEffect, useRef } from 'react';
import { Brain, Zap, Target, Users } from 'lucide-react';

const FeatureShowcase = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const featureListRef = useRef(null);

  const features = [
    {
      icon: Zap,
      title: "Fully Automated QA",
      description: "Test all possible scenarios from your user's perspective and identify issues before your users do",
      detailedDescription: [
        "Automatically creates tests based on your URL",
        "Run those tests at the selected frequency",
        "Detailed report on errors and suggested fixes"
      ],
      imageUrl: "path/to/image1.jpg"
    },
    {
      icon: Users,
      title: "User Experience Analysis",
      description: "Get recommendations on how to improve your user flows, copywriting and general UX/UI design",
      detailedDescription: [
        "Automatically scans your website for improvements",
        "Find points of frictions and drop offs in your user flows",
        "Get recommendations on how to improve your user experience"
      ],
      imageUrl: "path/to/image2.jpg"
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
      imageUrl: "path/to/image3.jpg"
    },
    {
      icon: Brain,
      title: "Content Optimization",
      description: "Optimize your Organic Content to increase engagement and conversions based on AI user replicas",
      detailedDescription: [
        "Improve your content strategy and increase engagement and virality",
        "Expose your content to AI replicas of your users and see how they react",
        "Focus on the content that matters most to your users"
      ],
      imageUrl: "path/to/image4.jpg"
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

  useEffect(() => {
    if (activeFeature === 0 || activeFeature === 1) {
      const animationInterval = setInterval(() => {
        setAnimationStep((prev) => (prev + 1) % 4);
      }, 1000);
      return () => clearInterval(animationInterval);
    }
  }, [activeFeature]);

  const renderFeatureVisual = (feature) => {
    if (feature.title === "Fully Automated QA") {
      return (
        <div className="flex items-center justify-center w-64 h-64">
          <svg viewBox="0 0 24 24" width="220" height="120">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="url(#gradient)"
              strokeWidth="2"
              fill="none"
              style={{
                strokeDasharray: animationStep === 0 ? '0, 100' : animationStep === 1 ? '50, 50' : '100, 0',
                transition: 'stroke-dasharray 0.5s ease-in-out',
              }}
            />
            <path
              d="M8 12l2 2 4-4"
              stroke="#3b82f6"
              strokeWidth="2"
              fill="none"
              style={{
                strokeDasharray: animationStep === 2 ? '100, 0' : '0, 100',
                transition: 'stroke-dasharray 0.5s ease-in-out',
              }}
            />
          </svg>
        </div>
      );
    } else if (feature.title === "User Experience Analysis") {
      const pages = [
        { id: 'home', x: 15, y: 30, label: 'Home' },
        { id: 'products', x: 65, y: 60, label: 'Products' },
        { id: 'cart', x: 95, y: 50, label: 'Cart' },
        { id: 'checkout', x: 135, y: 40, label: 'Checkout' },
        { id: 'review', x: 175, y: 70, label: 'Review' },
        { id: 'confirmation', x: 215, y: 20, label: 'Confirmation' }
      ];

      const paths = [
        { from: 'home', to: 'products' },
        { from: 'products', to: 'cart' },
        { from: 'cart', to: 'checkout' },
        { from: 'checkout', to: 'review' },
        { from: 'review', to: 'confirmation' }
      ];

      return (
        <div className="flex items-center justify-center w-64 h-64">
          <svg viewBox="0 0 250 100" width="820" height="120">
            <defs>
              <linearGradient id="dotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            {paths.map((path, index) => {
              const from = pages.find(p => p.id === path.from);
              const to = pages.find(p => p.id === path.to);
              const pathKey = `${path.from}-${path.to}`;
              
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2 - 10;

              return (
                <g key={pathKey} opacity={animationStep >= Math.floor(index/2) + 1 ? "1" : "0.1"}>
                  <path
                    d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    className="transition-opacity duration-500"
                  />
                </g>
              );
            })}

            {pages.map((page, index) => (
              <g key={page.id} opacity={animationStep >= Math.floor(index/2) ? "1" : "0.1"}>
                <circle
                  cx={page.x}
                  cy={page.y}
                  r="6"
                  fill="url(#dotGradient)"
                  className="transition-opacity duration-500"
                />
                {index === pages.length - 1 && (
                  animationStep % 2 === 0 ? (
                    <text
                      x={page.x}
                      y={page.y + 15}
                      style={{ fill: 'red', fontSize: '12px', fontWeight: 'bold' }}
                      textAnchor="middle"
                      className="transition-opacity duration-500"
                    >
                      ✖
                    </text>
                  ) : (
                    <text
                      x={page.x}
                      y={page.y + 15}
                      style={{ fill: 'green', fontSize: '12px', fontWeight: 'bold' }}
                      textAnchor="middle"
                      className="transition-opacity duration-500"
                    >
                      ✔
                    </text>
                  )
                )}
              </g>
            ))}
          </svg>
        </div>
      );
    } else if (feature.title === "Ad Impact Testing" || feature.title === "Content Optimization") {
      return (
        <div className="flex items-center justify-center w-64 h-64">
          <p className="text-gray-500 text-lg">Coming Soon</p>
        </div>
      );
    }
    return <img src={feature.imageUrl} alt={feature.title} className="w-64 h-64 object-cover rounded-md" />;
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      <div className="space-y-6" ref={featureListRef}>
        {features.map((feature, index) => (
          <div
            key={index}
            className={`p-8 rounded-xl transition-all duration-300 cursor-pointer flex justify-between items-center
              ${activeFeature === index ? 'transform scale-105' : ''}`}
            onMouseEnter={() => {
              setActiveFeature(index);
              setIsHovering(true);
            }}
            onMouseLeave={() => setIsHovering(false)}
          >
            {index % 2 === 0 ? (
              <>
                <div className="flex-1 flex flex-col justify-between max-w-md">
                  <div className="flex items-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-500 mr-2" />
                    <h3 className="text-2xl font-semibold bg-gradient-to-r from-gray-300 to-blue-500 bg-clip-text text-transparent">
                      {feature.title}
                    </h3>
                  </div>
                  <div className="mb-4">
                    <p className="text-gray-400 text-lg">{feature.description}</p>
                  </div>
                </div>
                <div className="ml-6">{renderFeatureVisual(feature)}</div>
              </>
            ) : (
              <>
                <div className="mr-6">{renderFeatureVisual(feature)}</div>
                <div className="flex-1 flex flex-col justify-between max-w-md">
                  <div className="flex items-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-500 mr-2" />
                    <h3 className="text-2xl font-semibold bg-gradient-to-r from-gray-300 to-blue-500 bg-clip-text text-transparent">
                      {feature.title}
                    </h3>
                  </div>
                  <div className="mb-4">
                    <p className="text-gray-400 text-lg">{feature.description}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureShowcase;