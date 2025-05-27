import React, { useState } from 'react';

// Set specific credentials for testing the AI agent
const VALID_USERNAME = "testuser";
const VALID_PASSWORD = "password123";

const StagedLoginForm = ({ onLoginSuccess, onLoginError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [stage, setStage] = useState('username'); // 'username' or 'password'

  const handleUsernameSubmit = (e) => {
    e.preventDefault();

    // Simple validation
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    // Move to password stage
    setError('');
    setStage('password');
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    // Simple validation
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    // Check if the credentials match the expected values
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      // Successful login
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', username);

      // Call the success callback
      onLoginSuccess();
    } else {
      // Invalid credentials
      setError('Invalid username or password');
      onLoginError && onLoginError('Invalid username or password');
    }
  };

  const handleBack = () => {
    setStage('username');
    setError('');
  };

  return (
    <div>
      {stage === 'username' ? (
        <form onSubmit={handleUsernameSubmit}>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-md">{error}</div>}
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Next
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit}>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-md">{error}</div>}
          <div className="mb-1">
            <p className="text-sm font-medium text-gray-600">Logged in as: <span className="font-bold">{username}</span></p>
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Login
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default StagedLoginForm;
