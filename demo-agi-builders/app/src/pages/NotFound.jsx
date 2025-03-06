import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">
            404 Error
          </p>
          <h1 className="text-3xl font-semibold text-gray-900">
            Page not found
          </h1>
          <p className="text-gray-500">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center justify-center px-5 py-3 text-sm 
                     font-medium text-gray-700 hover:text-gray-900 
                     transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
