import React, { useState } from 'react';

// Set specific credentials for testing the AI agent
const VALID_USERNAME = "testuser";
const VALID_PASSWORD = "password123";

const LoginForm = ({ onLoginSuccess, onLoginError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();

    // Simple validation
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
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

  return (
    <form onSubmit={handleLogin}>
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
        />
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
        />
      </div>
      <button
        type="submit"
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Login
      </button>
    </form>
  );
};

export default LoginForm;
