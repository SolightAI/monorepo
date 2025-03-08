import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Home, RefreshCw } from 'lucide-react';

const NotFound = () => {
  const [randomPrompt, setRandomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const funnyPrompts = useMemo(() => [
    "A confused AI trying to find its way home",
    "404 errors having a party without any web pages",
    "A video buffering icon doing a stand-up comedy routine",
    "Pixels playing hide and seek with a 404 sign",
    "A sad computer crying 1s and 0s",
    "Error messages forming a rock band",
    "404 written in the stars of a night sky",
    "A broken link trying to fix itself with duct tape",
  ], []);

  const generateRandomPrompt = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const newPrompt = funnyPrompts[Math.floor(Math.random() * funnyPrompts.length)];
      setRandomPrompt(newPrompt);
      setIsGenerating(false);
    }, 1000); // Simulating generation time
  }, [funnyPrompts]);

  useEffect(() => {
    generateRandomPrompt();
  }, [generateRandomPrompt]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-9xl font-bold text-blue-600 mb-4">404</h1>
      <h2 className="text-4xl font-semibold text-gray-800 mb-6">Oops! Page Not Found</h2>
      <p className="text-xl text-gray-600 mb-8">
        Looks like our AI took a wrong turn while generating this page.
      </p>

      <div className="bg-white p-6 rounded-lg shadow-lg mb-8 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2">AI-Generated 404 Scenario:</h3>
        <p className="text-gray-700 min-h-[3rem]">
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <RefreshCw className="animate-spin mr-2" />
              Generating...
            </span>
          ) : (
            randomPrompt
          )}
        </p>
        <button
          onClick={generateRandomPrompt}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-300 flex items-center justify-center w-full"
          disabled={isGenerating}
        >
          Generate Another
        </button>
      </div>

      <Link
        to="/"
        className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-700 transition duration-300 flex items-center"
      >
        <Home className="mr-2" />
        Back to Home
      </Link>
    </div>
  );
};

export default NotFound;