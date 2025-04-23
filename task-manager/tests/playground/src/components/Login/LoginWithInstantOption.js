import React, { useState } from 'react';
import LoginForm from './LoginForm';
import InstantLoginForm from './InstantLoginForm';

const LoginWithInstantOption = ({ onLoginSuccess, onLoginError }) => {
  const [loginMode, setLoginMode] = useState('regular'); // 'regular' or 'instant'

  const handleSwitchToInstant = () => {
    setLoginMode('instant');
  };

  const handleSwitchToRegular = () => {
    setLoginMode('regular');
  };

  return (
    <div>
      {loginMode === 'regular' ? (
        <div>
          <LoginForm
            onLoginSuccess={onLoginSuccess}
            onLoginError={onLoginError}
          />
          <div className="mt-3 text-center">
            <button
              onClick={handleSwitchToInstant}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Use Instant Login Instead
            </button>
          </div>
        </div>
      ) : (
        <InstantLoginForm
          onLoginSuccess={onLoginSuccess}
          onLoginError={onLoginError}
          onSwitchToRegular={handleSwitchToRegular}
        />
      )}
    </div>
  );
};

export default LoginWithInstantOption;
