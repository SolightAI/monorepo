import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import logo from '../components/images/laneo_logo.jpg'; // Import the logo

const OnboardingType = () => {
  const [selectedType, setSelectedType] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const navigate = useNavigate();
  
  // Add state for floating elements
  const [floatingElements, setFloatingElements] = useState([
    { id: 1, type: 'tickbox', position: { top: '15%', left: '15%' }, visible: true },
    { id: 2, type: 'error', position: { top: '25%', right: '20%' }, visible: true },
    { id: 3, type: 'tickbox', position: { bottom: '20%', right: '25%' }, visible: true },
    { id: 4, type: 'error', position: { bottom: '30%', left: '20%' }, visible: true },
    { id: 5, type: 'tickbox', position: { top: '40%', left: '10%' }, visible: true },
    { id: 6, type: 'error', position: { bottom: '15%', right: '15%' }, visible: true },
    { id: 7, type: 'tickbox', position: { top: '10%', right: '30%' }, visible: true },
    { id: 8, type: 'error', position: { bottom: '40%', left: '30%' }, visible: true },
  ]);

  useEffect(() => {
    // Get the URL from session storage
    const url = sessionStorage.getItem('testUrl');
    if (!url) {
      // Redirect back to the first step if URL is not available
      navigate('/');
    } else {
      setSavedUrl(url);
    }
  }, [navigate]);

  const handleTypeSelection = (type) => {
    // Store selected type in session storage
    sessionStorage.setItem('testType', type);
    setSelectedType(type);
    
    // Navigate to the appropriate screen based on selection
    if (type === 'user-story') {
      navigate('/user-story-details');
    } else if (type === 'specific-section') {
      navigate('/section-details');
    } else {
      // For whole website, go directly to results
      navigate('/results');
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
      <AnimatedBackground theme="dark" />
      
      {/* Floating elements */}
      {floatingElements.map((element) => (
        <div
          key={element.id}
          className={`absolute z-5 opacity-30 hover:opacity-60 transition-opacity duration-300 ${
            element.visible ? 'animate-float' : 'hidden'
          }`}
          style={{
            ...element.position,
            animation: `float ${3 + element.id % 2}s ease-in-out infinite`,
          }}
        >
          {element.type === 'tickbox' ? (
            <div className="bg-green-500/20 p-3 rounded-lg backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="bg-red-500/20 p-3 rounded-lg backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
      ))}
      
      <div className="relative z-10 w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Back"
        >
          ← 
        </button>
        
        <div className="flex items-center justify-center mb-6">
          <img 
            src={logo} 
            alt="Laneo Logo" 
            className="h-8 mr-2 filter brightness-0 invert" 
          />
          <h1 className="text-xl font-bold text-white">Laneo</h1>
        </div>
        <div className="mb-8">
          <p className='text-gray-100 text-lg font-semibold'>Select the scope of the test</p>
          {savedUrl && (
            <div className="mt-2 p-2 bg-gray-700 rounded-md text-sm text-gray-300">
              <span className="font-medium text-gray-200">URL:</span> {savedUrl}
            </div>
          )}
        </div>

        <div className="space-y-4 mb-6">
          <div 
            className={`p-4 border rounded-md cursor-pointer transition-colors border-gray-600 hover:border-blue-500 ${selectedType === 'user-story' ? 'bg-gray-700 border-blue-500' : 'hover:bg-gray-700'}`}
            onClick={() => handleTypeSelection('user-story')}
          >
            <div className="flex items-center">
              <input 
                type="radio" 
                id="user-story" 
                name="testType" 
                checked={selectedType === 'user-story'} 
                onChange={() => {}} 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-500"
              />
              <label htmlFor="user-story" className="ml-3 block text-md font-medium text-white">
                User Story
              </label>
            </div>
            <p className="mt-1 ml-7 text-sm text-gray-400">
              Test a complete user journey through the application
            </p>
          </div>

          <div 
            className={`p-4 border rounded-md cursor-pointer transition-colors border-gray-600 hover:border-blue-500 ${selectedType === 'specific-section' ? 'bg-gray-700 border-blue-500' : 'hover:bg-gray-700'}`}
            onClick={() => handleTypeSelection('specific-section')}
          >
            <div className="flex items-center">
              <input 
                type="radio" 
                id="specific-section" 
                name="testType" 
                checked={selectedType === 'specific-section'} 
                onChange={() => {}} 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-500"
              />
              <label htmlFor="specific-section" className="ml-3 block text-md font-medium text-white">
                Specific Section
              </label>
            </div>
            <p className="mt-1 ml-7 text-sm text-gray-400">
              Test a particular component or section of the page
            </p>
          </div>

          <div 
            className={`p-4 border rounded-md cursor-pointer transition-colors border-gray-600 hover:border-blue-500 ${selectedType === 'whole-website' ? 'bg-gray-700 border-blue-500' : 'hover:bg-gray-700'}`}
            onClick={() => handleTypeSelection('whole-website')}
          >
            <div className="flex items-center">
              <input 
                type="radio" 
                id="whole-website" 
                name="testType" 
                checked={selectedType === 'whole-website'} 
                onChange={() => {}} 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-500"
              />
              <label htmlFor="whole-website" className="ml-3 block text-md font-medium text-white">
                Whole Website
              </label>
            </div>
            <p className="mt-1 ml-7 text-sm text-gray-400">
              Comprehensive testing of the entire website
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <p className='text-gray-100 text-lg font-semibold'>Step 2 of 3</p>
        </div>
      </div>
      
      {/* Add CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default OnboardingType; 