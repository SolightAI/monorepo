import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Success = () => {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Verify user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') {
      // Redirect to login if not logged in
      return;
    }

    // Get the username from localStorage
    const storedUsername = localStorage.getItem('username');
    setUsername(storedUsername || 'User');
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
  };

  return (
    <div className="max-w-xl mx-auto mt-20 p-8 bg-gray-50 rounded-lg shadow-md text-center">
      <h2 className="text-2xl font-bold mb-4 text-green-600">Login Successful!</h2>
      <p className="text-lg mb-2">Welcome, <span className="font-semibold">{username}</span>!</p>
      <p className="text-gray-600 mb-8">You have successfully logged in to the system.</p>
      <button
        onClick={handleLogout}
        className="py-2 px-6 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Logout
      </button>
    </div>
  );
};

export default Success;
