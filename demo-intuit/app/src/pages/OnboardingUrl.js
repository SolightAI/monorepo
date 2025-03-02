import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const OnboardingUrl = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic URL validation
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    try {
      new URL(url);
      // Store URL in sessionStorage for later use
      sessionStorage.setItem('testUrl', url);
      navigate('/select-type');
    } catch (err) {
      setError('Please enter a valid URL');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-xl font-bold text-center mb-6">Laneo</h1>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Step 1 of 3</h2>
          <p className="text-gray-600">Enter the URL of the website you want to test</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="text"
              id="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Next
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingUrl; 