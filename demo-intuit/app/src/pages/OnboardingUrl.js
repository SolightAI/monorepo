import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import logo from '../components/images/laneo_logo.jpg'; // Import the logo

const OnboardingUrl = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Add state for floating elements with more items
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
        <div className="flex items-center justify-center mb-6">
          <img 
            src={logo} 
            alt="Laneo Logo" 
            className="h-8 mr-2 filter brightness-0 invert" 
          />
          <h1 className="text-xl font-bold text-white">Laneo</h1>
        </div>
        <div className="mb-8">
          <p className="text-gray-100 text-lg font-semibold">Enter the URL of the website you want to test</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-1">
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
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex justify-between items-center">
            <p className='text-gray-100 text-lg font-semibold'>Step 1 of 3</p>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Next
            </button>
          </div>
        </form>
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

export default OnboardingUrl; 