import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/LoginForm';
import GoogleOAuth from '../../components/GoogleOAuth';
import StagedLoginForm from '../../components/StagedLoginForm';
import InstantLoginForm from '../../components/InstantLoginForm';
import LoginWithInstantOption from '../../components/LoginWithInstantOption';

const SimpleLoginPage = ({
  showEmailPassword = false,
  showGoogleAuth = false,
  showStagedLogin = false,
  showInstantLogin = false,
  showCombinedInstantLogin = false
}) => {
  const navigate = useNavigate();

  // Check if user is already logged in
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
      navigate('/success');
    }
  }, [navigate]);

  const handleLoginSuccess = () => {
    navigate('/success');
  };

  const handleSwitchToRegular = () => {
    navigate('/error');
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Login Portal
        </h2>

        {showEmailPassword && !showStagedLogin && !showInstantLogin && !showCombinedInstantLogin && (
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        )}

        {showStagedLogin && !showInstantLogin && !showCombinedInstantLogin && (
          <StagedLoginForm onLoginSuccess={handleLoginSuccess} />
        )}

        {showInstantLogin && !showCombinedInstantLogin && (
          <InstantLoginForm
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegular={handleSwitchToRegular}
          />
        )}

        {showCombinedInstantLogin && (
          <LoginWithInstantOption onLoginSuccess={handleLoginSuccess} />
        )}

        {showGoogleAuth && (
          <GoogleOAuth onSuccess={handleLoginSuccess} />
        )}
      </div>
    </div>
  );
};

export default SimpleLoginPage;
