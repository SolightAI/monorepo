import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OnboardingType = () => {
  const [selectedType, setSelectedType] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const navigate = useNavigate();

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
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 relative">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Back"
        >
          ← 
        </button>
        
        <h1 className="text-xl font-bold text-center mb-6">Laneo</h1>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Step 2 of 3</h2>
          <p className="text-gray-600">Select what you want to test</p>
          {savedUrl && (
            <div className="mt-2 p-2 bg-gray-100 rounded-md text-sm">
              <span className="font-medium">URL:</span> {savedUrl}
            </div>
          )}
        </div>

        <div className="space-y-4 mb-6">
          <div 
            className="p-4 border rounded-md cursor-pointer transition-colors border-gray-300 hover:border-blue-500 hover:bg-blue-50"
            onClick={() => handleTypeSelection('user-story')}
          >
            <div className="flex items-center">
              <input 
                type="radio" 
                id="user-story" 
                name="testType" 
                checked={selectedType === 'user-story'} 
                onChange={() => {}} 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="user-story" className="ml-3 block text-md font-medium">
                User Story
              </label>
            </div>
            <p className="mt-1 ml-7 text-sm text-gray-500">
              Test a complete user journey through the application
            </p>
          </div>

          <div 
            className="p-4 border rounded-md cursor-pointer transition-colors border-gray-300 hover:border-blue-500 hover:bg-blue-50"
            onClick={() => handleTypeSelection('specific-section')}
          >
            <div className="flex items-center">
              <input 
                type="radio" 
                id="specific-section" 
                name="testType" 
                checked={selectedType === 'specific-section'} 
                onChange={() => {}} 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="specific-section" className="ml-3 block text-md font-medium">
                Specific Section
              </label>
            </div>
            <p className="mt-1 ml-7 text-sm text-gray-500">
              Test a particular component or section of the page
            </p>
          </div>

          <div 
            className="p-4 border rounded-md cursor-pointer transition-colors border-gray-300 hover:border-blue-500 hover:bg-blue-50"
            onClick={() => handleTypeSelection('whole-website')}
          >
            <div className="flex items-center">
              <input 
                type="radio" 
                id="whole-website" 
                name="testType" 
                checked={selectedType === 'whole-website'} 
                onChange={() => {}} 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="whole-website" className="ml-3 block text-md font-medium">
                Whole Website
              </label>
            </div>
            <p className="mt-1 ml-7 text-sm text-gray-500">
              Comprehensive testing of the entire website
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingType; 