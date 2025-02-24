import React, { useState, useEffect } from 'react';
import { Brain, Zap, Target, Users } from 'lucide-react';

const FeatureShowcase = ({ feature }) => {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationStep((prevStep) => (prevStep + 1) % 3);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
    <div className="feature-showcase">
      <h2 className="text-2xl font-bold mb-4">{feature.title}</h2>
      {renderFeatureVisual(feature)}
      <p className="mt-4 text-gray-600">{feature.description}</p>
    </div>
  );
};

export default FeatureShowcase; 