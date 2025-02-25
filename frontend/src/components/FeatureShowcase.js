import React, { useState, useEffect, useRef } from 'react';
import { Brain, Zap, Target, Users } from 'lucide-react';

const FeatureShowcase = ({ title = "Fully Automated QA" }) => {
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
      description: "Comprehensive analysis of your entire website to identify issues and opportunities for improvement",
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
      description: "Validate that your user stories are implemented correctly and working as expected",
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
      description: "Go beyond traditional QA to improve overall user experience and product quality",
      detailedDescription: [
        "Analyzes user flows for friction points and drop-offs",
        "Provides recommendations for UX/UI improvements",
        "Identifies opportunities for performance optimization"
      ],
      imageUrl: "path/to/image4.jpg"
    }
  ];

  useEffect(() => {
    if (autoScrolling && featureListRef.current) {
      const scrollToNextFeature = () => {
        const nextFeature = (activeFeature + 1) % features.length;
        setActiveFeature(nextFeature);
        
        const featureElements = featureListRef.current.querySelectorAll('.feature-item');
        if (featureElements[nextFeature]) {
          featureElements[nextFeature].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // If this is the last feature, prevent scrolling beyond it
          if (nextFeature === features.length - 1) {
            setTimeout(() => {
              window.scrollTo({
                top: window.scrollY - 100, // Scroll back up slightly to ensure it stays in view
                behavior: 'smooth'
              });
            }, 100);
          }
        }
      };
      
      autoScrollTimerRef.current = setTimeout(scrollToNextFeature, 5000);
      return () => clearTimeout(autoScrollTimerRef.current);
    }
  }, [activeFeature, features.length, autoScrolling]);

  useEffect(() => {
    if (activeFeature === 0 || activeFeature === 1 || activeFeature === 2) {
      const animationInterval = setInterval(() => {
        setAnimationStep((prev) => (prev + 1) % 4);
      }, activeFeature === 2 ? 2000 : 1000);
      return () => clearInterval(animationInterval);
    }
  }, [activeFeature]);

  // Modify the scroll event listener to better detect when we're in the feature section
  useEffect(() => {
    const handleScroll = () => {
      if (featureListRef.current && componentRef.current) {
        const currentScrollY = window.scrollY;
        setScrollPosition(currentScrollY);
        
        // Get the component's position relative to the viewport
        const componentRect = componentRef.current.getBoundingClientRect();
        
        // Only show dots if we're actually within the feature showcase section
        const isInFeatureSection = 
          componentRect.top < 0 && // Component has started to scroll up
          componentRect.bottom > window.innerHeight; // Component hasn't completely scrolled out of view
        
        setShowDots(isInFeatureSection);
        
        // Temporarily pause auto-scrolling when user manually scrolls
        if (isInFeatureSection) {
          setAutoScrolling(false);
          
          // Calculate which feature should be active based on scroll position
          const featureElements = featureListRef.current.querySelectorAll('.feature-item');
          featureElements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            // Make a feature active when it's in the middle of the viewport
            if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
              setActiveFeature(index);
            }
          });
          
          // Resume auto-scrolling after a period of inactivity
          if (autoScrollTimerRef.current) {
            clearTimeout(autoScrollTimerRef.current);
          }
          
          autoScrollTimerRef.current = setTimeout(() => {
            setAutoScrolling(true);
          }, 10000); // Resume after 10 seconds of inactivity
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Trigger once on mount to set initial state
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Pause auto-scrolling when user interacts
  const handleUserInteraction = (index) => {
    // Clear any existing auto-scroll timer
    if (autoScrollTimerRef.current) {
      clearTimeout(autoScrollTimerRef.current);
    }
    
    // Set the active feature
    setActiveFeature(index);
    setIsHovering(true);
    setAutoScrolling(false);
    
    // Resume auto-scrolling after a period of inactivity
    const resumeAutoScroll = setTimeout(() => {
      setIsHovering(false);
      setAutoScrolling(true);
    }, 10000); // Resume after 10 seconds of inactivity
    
    return () => clearTimeout(resumeAutoScroll);
  };

  const renderFeatureVisual = (feature) => {
    if (feature.title === "Full Website Review") {
      return (
        <div className="flex items-center justify-center w-full h-64 md:w-64 md:h-64">
          <svg viewBox="0 0 240 160" className="w-full h-full max-w-[240px]">
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
      );
    } else if (feature.title === "Fully Automated QA") {
      return (
        <div className="flex items-center justify-center w-full h-64 md:w-64 md:h-64">
          <svg viewBox="0 0 24 24" className="w-full h-full max-w-[220px] max-h-[120px]">
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
        <div className="flex items-center justify-center w-full h-64 md:w-64 md:h-64">
          <div className="w-full max-w-[240px] bg-gray-800/80 rounded-lg p-3 border border-gray-700 shadow-lg">
            {/* User Story Title */}
            <div className="mb-2 pb-1 border-b border-gray-700">
              <div className="text-xs text-blue-400 mb-0.5">USER STORY</div>
              <div className="text-white text-sm font-medium">Complete Purchase Flow</div>
            </div>
            
            {/* Acceptance Criteria */}
            <div className="mb-3">
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
        <div className="flex items-center justify-center w-full h-64 md:w-64 md:h-64">
          <div className="relative w-full max-w-[240px] h-[200px] flex items-center justify-center">
            {/* Bug/Issue Discovery */}
            <div 
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full transition-all duration-500 ease-in-out ${
                animationStep > 0 ? 'opacity-0 scale-90' : 'opacity-100'
              }`}
            >
              <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700 shadow-lg">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center mr-2">
                    <span className="text-white text-xs">!</span>
                  </div>
                  <span className="text-white text-sm font-medium">Bug Detected</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">Payment processing fails when user has special characters in name</div>
                <div className="flex items-center text-xs text-red-300">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                  High Priority
                </div>
              </div>
            </div>
            
            {/* Ticket Creation */}
            <div 
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full transition-all duration-500 ease-in-out ${
                animationStep === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
            >
              <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-800/50 shadow-lg">
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
                <div className="flex justify-between items-center text-xs mb-2">
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
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full transition-all duration-500 ease-in-out ${
                animationStep === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
            >
              <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-800/50 shadow-lg">
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
                <div className="flex justify-between items-center text-xs mb-2">
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
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full transition-all duration-500 ease-in-out ${
                animationStep >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
            >
              <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-800/50 shadow-lg">
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
                <div className="flex justify-between items-center text-xs mb-2">
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
        <div className="flex items-center justify-center w-full h-64 md:w-64 md:h-64">
          <div className="relative w-full max-w-[240px] h-auto bg-gray-900/50 rounded-lg p-3 border border-gray-800">
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
            <div className={`mb-5 transition-opacity duration-500 ${animationStep >= 3 ? 'opacity-30' : 'opacity-100'}`}>
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
            <div className={`transition-all duration-1000 ${animationStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>
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
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <div className="text-[10px] font-medium text-red-400 bg-red-500/10 py-1 px-2 rounded mx-3">
                  Friction points detected
                </div>
              </div>
            )}
            
            {/* Recommendations */}
            {animationStep === 2 && (
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <div className="text-[10px] font-medium text-green-400 bg-green-500/10 py-1 px-2 rounded mx-3">
                  Optimization recommendations generated
                </div>
              </div>
            )}
            
            {/* Results */}
            {animationStep >= 3 && (
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <div className="text-[10px] font-medium text-green-400 bg-green-500/10 py-1 px-2 rounded mx-3">
                  Conversion improved by 35%
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-full h-64 md:w-64 md:h-64">
        <img src={feature.imageUrl} alt={feature.title} className="w-full h-full max-w-[240px] object-cover rounded-md" />
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6" ref={componentRef}>
      {/* Title section - always visible but without the box */}
      <div className="text-center mb-8 sticky top-0 pt-8 pb-4 z-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white/90 via-white/70 to-white/40 text-transparent bg-clip-text">{title}</h1>
        <p className="text-lg text-gray-500 mt-4">Your Entire Customer Experience is Safe</p>
      </div>
      
      {/* Features with reduced spacing between them (space-y-20 instead of space-y-32) */}
      <div className="space-y-20" ref={featureListRef}>
        {features.map((feature, index) => (
          <div
            key={index}
            className={`feature-item p-4 md:p-8 rounded-xl transition-all duration-500 
              ${activeFeature === index ? 'opacity-100' : 'opacity-50'}
              ${index === features.length - 1 ? 'mb-[100vh]' : ''}`}
            onMouseEnter={() => handleUserInteraction(index)}
            onMouseLeave={() => {
              setIsHovering(false);
              setAutoScrolling(true);
            }}
          >
            <div className="sticky top-24 bg-gray-900/80 backdrop-blur-sm rounded-xl p-6">
              {index % 2 === 0 ? (
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex-1 flex flex-col justify-center max-w-md order-2 md:order-1">
                    <div className="flex items-center mb-4">
                      <feature.icon className="w-6 h-6 text-blue-500 mr-2" />
                      <h3 className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-gray-300 to-blue-500 bg-clip-text text-transparent">
                        {feature.title}
                      </h3>
                    </div>
                    <div className="mb-4">
                      <p className="text-gray-400 text-base md:text-lg">{feature.description}</p>
                    </div>
                  </div>
                  <div className="order-1 md:order-2 md:ml-6 flex items-center justify-center">{renderFeatureVisual(feature)}</div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="order-1 md:mr-6 flex items-center justify-center">{renderFeatureVisual(feature)}</div>
                  <div className="flex-1 flex flex-col justify-center max-w-md order-2">
                    <div className="flex items-center mb-4">
                      <feature.icon className="w-6 h-6 text-blue-500 mr-2" />
                      <h3 className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-gray-300 to-blue-500 bg-clip-text text-transparent">
                        {feature.title}
                      </h3>
                    </div>
                    <div className="mb-4">
                      <p className="text-gray-400 text-base md:text-lg">{feature.description}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Feature navigation dots with conditional visibility */}
      <div className={`fixed right-8 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2 transition-opacity duration-300 ${
        showDots ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {features.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              activeFeature === index ? 'bg-blue-500 scale-125' : 'bg-gray-600'
            }`}
            onClick={() => {
              const featureElements = featureListRef.current.querySelectorAll('.feature-item');
              if (featureElements[index]) {
                featureElements[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                handleUserInteraction(index);
              }
            }}
            aria-label={`Go to feature ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default FeatureShowcase;