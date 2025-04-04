import React, { useState } from 'react';
import LoginForm from './LoginForm';
import GoogleOAuth from './GoogleOAuth';

const AuthDemo = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [userData, setUserData] = useState(null);
  const [authMethod, setAuthMethod] = useState(localStorage.getItem('authProvider') || 'standard');

  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true);
    if (userData) {
      setUserData(userData);
    }
  };

  const handleLoginError = (error) => {
    console.error('Login error:', error);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('authProvider');
    setIsLoggedIn(false);
    setUserData(null);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Auth Demo</h1>

      {isLoggedIn ? (
        <div className="text-center">
          <div className="mb-4 p-4 bg-green-50 text-green-800 rounded-md">
            <p className="font-medium">Successfully logged in!</p>
            <p>Username: {localStorage.getItem('username')}</p>
            <p>Auth Method: {authMethod}</p>
            {userData && userData.user && (
              <div className="mt-2">
                <p>Email: {userData.user.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Logout
          </button>
        </div>
      ) : (
        <div>
          <LoginForm
            onLoginSuccess={() => {
              setAuthMethod('standard');
              handleLoginSuccess();
            }}
            onLoginError={handleLoginError}
          />

          <div className="my-4 flex items-center">
            <div className="flex-1 h-px bg-gray-300"></div>
            <p className="mx-4 text-gray-500">or</p>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <GoogleOAuth
            onSuccess={(data) => {
              setAuthMethod('google');
              handleLoginSuccess(data);
            }}
            onFailure={handleLoginError}
          />
        </div>
      )}
    </div>
  );
};

export default AuthDemo;
