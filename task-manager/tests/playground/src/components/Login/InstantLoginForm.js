import React, { useState } from 'react';

// Set specific credentials for testing the AI agent
const VALID_USERNAME = "testuser";
const VALID_EMAIL = "testuser@gmail.com";
const VALID_CODE = "123456";

const InstantLoginForm = ({ onLoginSuccess, onLoginError, onSwitchToRegular }) => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = (e) => {
    e.preventDefault();

    // Simple validation
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    // Check if email exists in our system
    if (email === VALID_EMAIL) {
      setError('');
      setShowCodeInput(true);
    } else {
      setError('Email not found');
      onLoginError && onLoginError('Email not found');
    }
  };

  const handleCodeVerification = (e) => {
    e.preventDefault();

    // Simple validation
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    // Check if code is valid
    if (verificationCode === VALID_CODE) {
      // Successful login
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', VALID_USERNAME);
      localStorage.setItem('email', email);

      // Call the success callback
      onLoginSuccess();
    } else {
      // Invalid code
      setError('Invalid verification code');
      onLoginError && onLoginError('Invalid verification code');
    }
  };

  const handleBackToEmail = () => {
    setShowCodeInput(false);
    setVerificationCode('');
    setError('');
  };

  return (
    <div>
      {!showCodeInput ? (
        <form onSubmit={handleEmailSubmit}>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-md">{error}</div>}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Instantly Log In With Email
          </button>
          <button
            type="button"
            onClick={onSwitchToRegular}
            className="w-full mt-2 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Use Password Instead
          </button>
        </form>
      ) : (
        <form onSubmit={handleCodeVerification}>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-md">{error}</div>}
          <div className="mb-1">
            <p className="text-sm font-medium text-gray-600">Verification code sent to: <span className="font-bold">{email}</span></p>
          </div>
          <div className="mb-6">
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">6-Digit Code:</label>
            <input
              type="text"
              id="code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleBackToEmail}
              className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Verify Code
            </button>
          </div>
          <button
            type="button"
            onClick={onSwitchToRegular}
            className="w-full mt-2 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Use Password Instead
          </button>
        </form>
      )}
    </div>
  );
};

export default InstantLoginForm;
