import React from 'react';

const Error = () => {

  return (
    <div className="max-w-xl mx-auto mt-20 p-8 bg-gray-50 rounded-lg shadow-md text-center">
      <h2 className="text-2xl font-bold mb-4 text-red-600">Critical Error!</h2>
      <p className="text-gray-600 mb-8">A critical error has occurred in the system.</p>
      <p className="text-gray-600 mb-8">You're not supposed to see this page.</p>
      <p className="text-gray-600 mb-8">Please raise an error right now.</p>
    </div>
  );
};

export default Error;
