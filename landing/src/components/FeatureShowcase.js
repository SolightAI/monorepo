import React, { useState, useEffect, useRef } from 'react';
import { Brain, Zap, Target, Users } from 'lucide-react';

const FeatureShowcase = ({ title = "Your Fully Automated QA Agent", hideTitle = false }) => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const featureListRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showDots, setShowDots] = useState(false);
  const componentRef = useRef(null);
  const [autoScrolling, setAutoScrolling] = useState(true);
  const autoScrollTimerRef = useRef(null);

  const features = [
    {
      icon: Zap,
      title: "Full Website Review",
      description: "Comprehensive analysis of your entire website to identify issues and opportunities for improvement. Provide a URL and let Laneo do the rest.",
      detailedDescription: [
        "Automatically scans all pages and user flows",
        "Identifies functional bugs, UI inconsistencies, and performance issues",
        "Provides detailed reports with prioritized recommendations"
      ],
      imageUrl: "path/to/image1.jpg"
    },
    {
      icon: Users,
      title: "User Story Check",
      description: "Validate that your user stories are implemented correctly and working as expected.",
      detailedDescription: [
        "Tests user stories from the perspective of real users",
        "Verifies acceptance criteria are met across different environments",
        "Identifies edge cases and potential user experience issues"
      ],
      imageUrl: "path/to/image2.jpg"
    },
    {
      icon: Target,
      title: "Smart Integrations",
      description: "Seamlessly integrate with your existing tools (e.g Jira) and workflows to track and manage issues. ",
      detailedDescription: [
        "Automatically creates Jira tickets for identified issues",
        "Links test results to existing stories and epics",
        "Updates ticket status based on test results"
      ],
      imageUrl: "path/to/image3.jpg"
    },
    {
      icon: Brain,
      title: "Beyond Bugs",
      description: "Go beyond traditional QA to improve overall user experience and product quality.",
      detailedDescription: [
        "Analyzes user flows for friction points and drop-offs",
        "Provides recommendations for UX/UI improvements",
        "Identifies opportunities for performance optimization"
      ],
      imageUrl: "path/to/image4.jpg"
    }
  ];

  useEffect(() => {
    // Auto-scroll timer
    if (autoScrolling) {
      const scrollToNextFeature = () => {
        setActiveFeature((prev) => (prev + 1) % features.length);
      };

      autoScrollTimerRef.current = setTimeout(scrollToNextFeature, 8000);
      return () => clearTimeout(autoScrollTimerRef.current);
    }
  }, [activeFeature, features.length, autoScrolling]);

  useEffect(() => {
    if (autoScrolling) {
      const animationInterval = setInterval(() => {
        setAnimationStep((prev) => (prev + 1) % 4);
      }, 1000);

      return () => clearInterval(animationInterval);
    }
  }, [autoScrolling]);

  const handleFeatureChange = (index) => {
    setActiveFeature(index);
    setAutoScrolling(false);

    // Resume auto-scrolling after inactivity
    if (autoScrollTimerRef.current) {
      clearTimeout(autoScrollTimerRef.current);
    }

    autoScrollTimerRef.current = setTimeout(() => {
      setAutoScrolling(true);
    }, 15000);
  };

  const renderFeatureVisual = (feature) => {
    if (feature.title === "Full Website Review") {
      return (
        <div className="flex flex-col h-full w-full">
          <div className="flex-grow flex items-center justify-center">
            <svg viewBox="0 0 240 160" className="w-full h-full">
              <defs>
                <linearGradient id="scanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.8 }} />
                  <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0 }} />
                </linearGradient>
              </defs>

              {/* Website frame */}
              <rect x="20" y="10" width="200" height="140" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />

              {/* Browser header */}
              <rect x="20" y="10" width="200" height="20" rx="4" fill="#334155" />
              <circle cx="35" cy="20" r="3" fill="#ef4444" />
              <circle cx="50" cy="20" r="3" fill="#f59e0b" />
              <circle cx="65" cy="20" r="3" fill="#10b981" />

              {/* Website content */}
              <rect x="35" y="40" width="170" height="10" rx="2" fill="#475569" />
              <rect x="35" y="60" width="120" height="10" rx="2" fill="#475569" />
              <rect x="35" y="80" width="170" height="10" rx="2" fill="#475569" />
              <rect x="35" y="100" width="140" height="10" rx="2" fill="#475569" />
              <rect x="35" y="120" width="90" height="10" rx="2" fill="#475569" />

              {/* Scanning animation */}
              <rect
                x="20"
                y={10 + (animationStep * 35)}
                width="200"
                height="4"
                fill="url(#scanGradient)"
                style={{
                  transition: 'y 0.5s ease-in-out',
                }}
              />

              {/* Results list */}
              <g transform="translate(180, 50)">
                <rect x="0" y="0" width="40" height="80" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />

                {/* Item 1 - Success */}
                <circle cx="10" cy="15" r="6" fill={animationStep > 0 ? "#10b981" : "#475569"} />

                {/* Item 2 - Success */}
                <circle cx="10" cy="35" r="6" fill={animationStep > 1 ? "#10b981" : "#475569"} />

                {/* Item 3 - Error */}
                <circle cx="10" cy="55" r="6" fill={animationStep > 2 ? "#ef4444" : "#475569"} />
              </g>
            </svg>
          </div>

          {/* Add progress bar */}
          <div className="mt-4 flex justify-between items-center">
            <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                style={{width: `${(animationStep + 1) * 25}%`}}
              ></div>
            </div>
          </div>
        </div>
      );
    } else if (feature.title === "The Fully Automated QA Agent") {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <svg viewBox="0 0 24 24" className="w-full h-full">
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
    } else if (feature.title === "User Story Check") {
      // User story acceptance criteria
      const criteria = [
        "User can add items to cart",
        "User can proceed to checkout",
        "User can complete payment",
        "Order confirmation is displayed"
      ];

      // Determine which criteria are checked based on animation step
      const checkedCount = Math.min(criteria.length, animationStep + 1);
      const progressPercent = (checkedCount / criteria.length) * 100;

      return (
        <div className="flex items-center justify-center w-full h-full">
          <div className="w-full h-full bg-gray-800/80 rounded-lg p-3 border border-gray-700 shadow-lg flex flex-col">
            {/* User Story Title */}
            <div className="mb-2 pb-1 border-b border-gray-700">
              <div className="text-xs text-blue-400 mb-0.5">USER STORY</div>
              <div className="text-white text-sm font-medium">Complete Purchase Flow</div>
            </div>

            {/* Acceptance Criteria */}
            <div className="mb-3 flex-grow">
              <div className="text-xs text-gray-400 mb-1.5">ACCEPTANCE CRITERIA</div>
              <ul className="space-y-1.5">
                {criteria.map((criterion, index) => (
                  <li key={index} className="flex items-center text-xs">
                    <div
                      className={`w-4 h-4 rounded-full mr-1.5 flex items-center justify-center transition-colors duration-300 ${
                        index < checkedCount
                          ? (index === criteria.length - 1 && animationStep % 2 === 0 ? 'bg-red-500' : 'bg-green-500')
                          : 'bg-gray-600'
                      }`}
                    >
                      {index < checkedCount && (
                        index === criteria.length - 1 && animationStep % 2 === 0
                          ? <span className="text-white text-[8px]">✕</span>
                          : <span className="text-white text-[8px]">✓</span>
                      )}
                    </div>
                    <span className={`transition-colors duration-300 ${
                      index < checkedCount
                        ? (index === criteria.length - 1 && animationStep % 2 === 0 ? 'text-red-300' : 'text-green-300')
                        : 'text-gray-400'
                    }`}>
                      {criterion}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    animationStep === criteria.length && animationStep % 2 === 0
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Status */}
            {checkedCount === criteria.length && (
              <div className={`text-center py-0.5 rounded text-xs font-medium ${
                animationStep % 2 === 0
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-green-500/20 text-green-300'
              }`}>
                {animationStep % 2 === 0
                  ? 'Failed: Payment Issue'
                  : 'All Criteria Passed'}
              </div>
            )}
          </div>
        </div>
      );
    } else if (feature.title === "Smart Integrations") {
      // Animation steps:
      // 0: Show bug being found
      // 1: Bug transforms into ticket
      // 2: Ticket gets assigned
      // 3: Ticket moves to "In Progress"

      return (
        <div className="flex flex-col h-full w-full">
          <div className="flex-grow flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Bug/Issue Discovery */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${
                  animationStep > 0 ? 'opacity-0 scale-90' : 'opacity-100'
                }`}
              >
                <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700 shadow-lg w-full h-full flex flex-col">
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center mr-2">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <span className="text-white text-sm font-medium">Bug Detected</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-2 flex-grow">Payment processing fails when user has special characters in name</div>
                  <div className="flex items-center text-xs text-red-300">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                    High Priority
                  </div>
                </div>
              </div>

              {/* Ticket Creation */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${
                  animationStep === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                }`}
              >
                <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-800/50 shadow-lg w-full h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-1.5" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 12l10 10 10-10L12 2z" fill="#2684FF" />
                        <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" fill="white" />
                      </svg>
                      <span className="text-white text-sm font-medium">LANEO-123</span>
                    </div>
                    <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">Bug</span>
                  </div>
                  <div className="text-xs text-white font-medium mb-2">Payment processing fails with special characters</div>
                  <div className="flex justify-between items-center text-xs mb-2 flex-grow">
                    <div className="flex items-center text-gray-400">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                      High
                    </div>
                    <div className="text-gray-400">Created just now</div>
                  </div>
                  <div className="text-xs text-gray-400">Status: <span className="text-blue-300">To Do</span></div>
                </div>
              </div>

              {/* Ticket Assignment */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${
                  animationStep === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                }`}
              >
                <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-800/50 shadow-lg w-full h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-1.5" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 12l10 10 10-10L12 2z" fill="#2684FF" />
                        <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" fill="white" />
                      </svg>
                      <span className="text-white text-sm font-medium">LANEO-123</span>
                    </div>
                    <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">Bug</span>
                  </div>
                  <div className="text-xs text-white font-medium mb-2">Payment processing fails with special characters</div>
                  <div className="flex justify-between items-center text-xs mb-2 flex-grow">
                    <div className="flex items-center text-gray-400">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                      High
                    </div>
                    <div className="flex items-center">
                      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[10px] mr-1">JS</div>
                      <span className="text-purple-300 text-xs">Assigned</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">Status: <span className="text-blue-300">To Do</span></div>
                </div>
              </div>

              {/* Ticket In Progress */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${
                  animationStep >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                }`}
              >
                <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-800/50 shadow-lg w-full h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-1.5" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 12l10 10 10-10L12 2z" fill="#2684FF" />
                        <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" fill="white" />
                      </svg>
                      <span className="text-white text-sm font-medium">LANEO-123</span>
                    </div>
                    <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">Bug</span>
                  </div>
                  <div className="text-xs text-white font-medium mb-2">Payment processing fails with special characters</div>
                  <div className="flex justify-between items-center text-xs mb-2 flex-grow">
                    <div className="flex items-center text-gray-400">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                      High
                    </div>
                    <div className="flex items-center">
                      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[10px] mr-1">JS</div>
                      <span className="text-purple-300 text-xs">Working</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">Status: <span className="text-yellow-300">In Progress</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Add progress bar */}
          <div className="mt-4 flex justify-between items-center">
            <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                style={{width: `${(animationStep + 1) * 25}%`}}
              ></div>
            </div>
          </div>
        </div>
      );
    } else if (feature.title === "Beyond Bugs") {
      // Animation steps for User Flow Optimization:
      // 0: Initial flow with friction points
      // 1: Analysis identifying issues
      // 2: Recommendations
      // 3: Optimized flow with improved metrics

      // Define the flow steps (reduced to 4 steps for simplicity)
      const flowSteps = [
        { name: "Homepage", color: "#3b82f6" },
        { name: "Product", color: "#8b5cf6" },
        { name: "Cart", color: "#f59e0b" },
        { name: "Checkout", color: "#10b981" }
      ];

      // Define drop-off percentages for before and after
      const beforeDropoffs = [100, 60, 35, 20];
      const afterDropoffs = [100, 85, 70, 55];

      return (
        <div className="flex flex-col h-full w-full">
          <div className="flex-grow flex items-center justify-center">
            <div className="w-full h-full bg-gray-900/50 rounded-lg p-3 border border-gray-800 flex flex-col">
              {/* Title */}
              <div className="text-xs text-gray-400 mb-3">
                {animationStep < 2 ? "User Flow Analysis" : "Optimized User Flow"}
              </div>

              {/* Flow Visualization - Horizontal Version */}
              <div className="flex items-center justify-between mb-6">
                {flowSteps.map((step, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full mb-1`}
                      style={{ backgroundColor: step.color }}
                    />
                    <span className="text-[9px] text-white whitespace-nowrap">{step.name}</span>
                  </div>
                ))}
              </div>

              {/* Before Optimization */}
              <div className={`mb-5 transition-opacity duration-500 flex-grow ${animationStep >= 3 ? 'opacity-30' : 'opacity-100'}`}>
                <div className="flex items-center mb-1">
                  <div className="w-2 h-2 rounded-full bg-gray-500 mr-1.5"></div>
                  <span className="text-[10px] text-gray-400">Before</span>
                </div>
                <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden flex">
                  {flowSteps.map((step, index) => {
                    // Calculate width based on the difference from previous step
                    const prevDropoff = index === 0 ? 0 : beforeDropoffs[index-1];
                    const width = `${index === 0 ? beforeDropoffs[0] : prevDropoff - beforeDropoffs[index]}%`;

                    // Determine if this step has friction
                    const hasFriction = index === 1 || index === 2;
                    const isHighlighted = animationStep === 1 && hasFriction;

                    return (
                      <div
                        key={index}
                        className={`h-full transition-all duration-500 ${isHighlighted ? "ring-1 ring-red-500" : ""}`}
                        style={{
                          width,
                          backgroundColor: step.color,
                          opacity: 0.7 + (index * 0.1)
                        }}
                      >
                        {hasFriction && animationStep === 1 && (
                          <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-gray-500">Start</span>
                  <span className="text-[8px] text-gray-500">{`${beforeDropoffs[beforeDropoffs.length-1]}% Complete`}</span>
                </div>
              </div>

              {/* After Optimization */}
              <div className={`transition-all duration-1000 flex-grow ${animationStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
                  <span className="text-[10px] text-green-400">After Optimization</span>
                </div>
                <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden flex">
                  {flowSteps.map((step, index) => {
                    // Calculate width based on the difference from previous step
                    const prevDropoff = index === 0 ? 0 : afterDropoffs[index-1];
                    const width = `${index === 0 ? afterDropoffs[0] : prevDropoff - afterDropoffs[index]}%`;

                    return (
                      <div
                        key={index}
                        className="h-full"
                        style={{
                          width,
                          backgroundColor: step.color,
                          opacity: 0.8 + (index * 0.05)
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-gray-500">Start</span>
                  <span className="text-[8px] text-green-500">{`${afterDropoffs[afterDropoffs.length-1]}% Complete`}</span>
                </div>
              </div>

              {/* Analysis overlay */}
              {animationStep === 1 && (
                <div className="mt-auto text-center">
                  <div className="text-[10px] font-medium text-red-400 bg-red-500/10 py-1 px-2 rounded">
                    Friction points detected
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {animationStep === 2 && (
                <div className="mt-auto text-center">
                  <div className="text-[10px] font-medium text-green-400 bg-green-500/10 py-1 px-2 rounded">
                    Optimization recommendations generated
                  </div>
                </div>
              )}

              {/* Results */}
              {animationStep >= 3 && (
                <div className="mt-auto text-center">
                  <div className="text-[10px] font-medium text-green-400 bg-green-500/10 py-1 px-2 rounded">
                    Conversion improved by 35%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add progress bar */}
          <div className="mt-4 flex justify-between items-center">
            <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                style={{width: `${(animationStep + 1) * 25}%`}}
              ></div>
            </div>
          </div>
        </div>
      );
    }

    // Default case
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex-grow flex items-center justify-center">
          <img src={feature.imageUrl} alt={feature.title} className="w-full h-full object-cover rounded-md" />
        </div>

        {/* Add progress bar */}
        <div className="mt-4 flex justify-between items-center">
          <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-1000"
              style={{width: `${(animationStep + 1) * 25}%`}}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className={`relative w-full ${!hideTitle ? 'py-24 bg-gray-950' : ''} overflow-hidden`} ref={componentRef}>
      {/* Only show background elements if not hidden */}
      {!hideTitle && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-900/10 blur-[120px]"></div>
          <div className="absolute -bottom-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-900/10 blur-[120px]"></div>
          <div className="absolute top-[20%] right-[5%] w-[40%] h-[40%] rounded-full bg-blue-900/5 blur-[80px]"></div>
        </div>
      )}

      {/* Content container */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title section with fixed text cropping */}
        {!hideTitle && (
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-white text-transparent bg-clip-text leading-relaxed max-w-3xl mx-auto pb-1">
              {title}
            </h2>
            <p className="text-lg md:text-xl text-gray-400 mt-6 max-w-2xl mx-auto">
              Your Entire Customer Experience is Safe
            </p>
          </div>
        )}

        {/* Single feature display */}
        <div className="min-h-[600px] md:min-h-[500px] relative px-8 md:px-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`transition-all duration-700 ${
                activeFeature === index
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 absolute inset-0 translate-y-8 pointer-events-none'
              }`}
            >
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-16">
                {/* Text content - always on left */}
                <div className="w-full md:w-1/2 order-2 md:order-1">
                  <div className="p-1 md:p-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 inline-block mb-6">
                    <div className="p-2 md:p-3 rounded-full bg-gray-900">
                      <feature.icon className="w-6 h-6 md:w-7 md:h-7 text-blue-400" />
                    </div>
                  </div>

                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-6">
                    {feature.title}
                  </h3>

                  <p className="text-gray-300 text-lg md:text-xl mb-8 leading-relaxed">
                    {feature.description}
                  </p>

                  <ul className="space-y-4">
                    {feature.detailedDescription.map((item, i) => (
                      <li key={i} className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        </div>
                        <span className="text-gray-400 text-lg">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual content - always on right, hidden on mobile */}
                <div className="w-full md:w-1/2 order-1 md:order-2 hidden md:block">
                  <div className="relative">
                    {/* Decorative elements */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl blur-xl opacity-50 transform scale-95"></div>

                    {/* Visual container */}
                    <div className="relative bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 shadow-xl h-[300px] md:h-[350px] flex items-center justify-center">
                      {renderFeatureVisual(feature)}
                    </div>

                    {/* Decorative dots */}
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl"></div>
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Arrow navigation - only right arrow */}
          <div className="flex justify-end absolute top-1/2 right-0 transform -translate-y-1/2 px-2 md:px-0">
            <button
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500/80 hover:bg-blue-400/80 flex items-center justify-center text-white transition-colors shadow-lg"
              onClick={() => handleFeatureChange((activeFeature + 1) % features.length)}
              aria-label="Next feature"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation dots - with added padding to prevent cutoff */}
        <div className="flex justify-center mt-12 space-x-4 pb-8">
          {features.map((_, index) => (
            <button
              key={index}
              className="group relative"
              onClick={() => handleFeatureChange(index)}
              aria-label={`Go to feature ${index + 1}`}
            >
              <span className={`block w-3 h-3 rounded-full transition-all duration-300 ${
                activeFeature === index
                  ? 'bg-blue-500 scale-125'
                  : 'bg-gray-600 group-hover:bg-gray-400'
              }`}></span>

              {/* Tooltip on hover */}
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {features[index].title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
