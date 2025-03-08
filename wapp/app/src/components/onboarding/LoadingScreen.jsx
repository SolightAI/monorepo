import { useState, useEffect } from 'react';

const LoadingScreen = () => {
  const [loadingStatus, setLoadingStatus] = useState('Initializing test environment');
  
  // Array of loading status messages that will rotate
  const statusMessages = [
    'Initializing test environment',
    'Analyzing application structure',
    'Identifying critical test paths',
    'Generating test scenarios',
    'Configuring test parameters',
    'Setting up automated test runners',
    'Preparing test reports',
    'Optimizing test coverage'
  ];
  
  // Change the status message every 5 seconds (slowed down from 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStatus(prevStatus => {
        const currentIndex = statusMessages.indexOf(prevStatus);
        const nextIndex = (currentIndex + 1) % statusMessages.length;
        return statusMessages[nextIndex];
      });
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Generating Tests for Your Application
      </h2>
      
      <div className="relative mb-6">
        {/* Outer static circle */}
        <div className="w-40 h-40 rounded-full border-2 border-gray-200"></div>
        
        {/* Inner rotating circle - infinite animation */}
        <div className="absolute inset-0">
          <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
            <circle 
              className="stroke-blue-500 stroke-[2px] fill-none" 
              cx="50" 
              cy="50" 
              r="48" 
              strokeLinecap="round"
              strokeDasharray="301"
              strokeDashoffset="200"
            />
          </svg>
        </div>
        
        {/* Empty center - no logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Center is now empty */}
        </div>
      </div>
      
      <p className="text-blue-600 font-medium mb-2">
        {loadingStatus}
      </p>
      
      <p className="text-sm text-gray-500 max-w-md text-center">
        This will only take a moment as we prepare your testing environment.
      </p>
    </div>
  );
};

export default LoadingScreen; 