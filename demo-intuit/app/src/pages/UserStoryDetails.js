import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserStoryDetails = () => {
  const [userStory, setUserStory] = useState('');
  const [error, setError] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Get the URL and test type from session storage
    const url = sessionStorage.getItem('testUrl');
    const testType = sessionStorage.getItem('testType');
    
    if (!url || testType !== 'user-story') {
      // Redirect back if required data is missing or incorrect
      navigate('/select-type');
      return;
    }
    
    setSavedUrl(url);
    
    // Check if there's existing user story details
    const savedDetails = sessionStorage.getItem('typeDetails');
    if (savedDetails) {
      setUserStory(savedDetails);
    }
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!userStory.trim()) {
      setError('Please describe the user story to test');
      return;
    }

    // Store user story details in session storage
    sessionStorage.setItem('typeDetails', userStory);
    navigate('/results');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 relative">
        <button
          type="button"
          onClick={() => navigate('/select-type')}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Back"
        >
          ← 
        </button>
      
        <h1 className="text-xl font-bold text-center mb-6">Laneo</h1>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Step 3 of 3</h2>
          <p className="text-gray-600">Describe the user story to test</p>
          {savedUrl && (
            <div className="mt-2 p-2 bg-gray-100 rounded-md text-sm">
              <span className="font-medium">URL:</span> {savedUrl}
            </div>
          )}
          <div className="mt-2 p-2 bg-gray-100 rounded-md text-sm">
            <span className="font-medium">Test Type:</span> User Story
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="user-story" className="block text-sm font-medium text-gray-700 mb-2">
              User Story Details:
            </label>
            <textarea
              id="user-story"
              value={userStory}
              onChange={(e) => {
                setUserStory(e.target.value);
                setError('');
              }}
              placeholder="E.g., A user logs in, adds items to cart, and completes checkout"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Generate Tests
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserStoryDetails; 