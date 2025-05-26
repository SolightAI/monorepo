import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/Login/LoginForm';
import GoogleOAuth from '../../components/Login/GoogleOAuth';
import StagedLoginForm from '../../components/Login/StagedLoginForm';
import InstantLoginForm from '../../components/Login/InstantLoginForm';
import LoginWithInstantOption from '../../components/Login/LoginWithInstantOption';
import SignUpForm from '../../components/Signup/SignUpForm';
import PrivacyBanner from '../../components/Privacy/PrivacyBanner';
import PrivacyModal from '../../components/Privacy/PrivacyModal';

const SimpleLoginPage = ({
  showEmailPassword = false,
  showGoogleAuth = false,
  showStagedLogin = false,
  showInstantLogin = false,
  showCombinedInstantLogin = false,
  showSignUpForm = false,
  showPrivacyBanner = false,
  showPrivacyModal = false
}) => {
  const navigate = useNavigate();

  // State to manage the current view ('login' or 'signup')
  const [currentView, setCurrentView] = useState('login');

  // Determine initial view based on props
  useEffect(() => {
    if (showSignUpForm) {
      setCurrentView('signup');
    } else if (showEmailPassword || showStagedLogin || showInstantLogin || showCombinedInstantLogin) {
       setCurrentView('login');
    } else {
       // Default or handle error case if neither is specified but component is rendered
       setCurrentView('login'); // Default to login if no specific form is requested initially
    }
  }, [showSignUpForm, showEmailPassword, showStagedLogin, showInstantLogin, showCombinedInstantLogin]);

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

  const handleSignUpSuccess = () => {
    console.log('Sign up successful in SimpleLoginPage');
  };

  // Functions to switch views
  const showLoginView = () => setCurrentView('login');
  const showSignUpView = () => setCurrentView('signup');

  // Determine if navigation between forms is possible
  const canNavigate = (showEmailPassword || showStagedLogin || showInstantLogin || showCombinedInstantLogin) && showSignUpForm;

  return (
    <div className="w-full h-screen flex items-center justify-center bg-white relative">
      <div className="w-full max-w-md p-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {currentView === 'signup' ? 'Sign Up Portal' : 'Login Portal'}
        </h2>

        {currentView === 'login' && (
          <>
            {showEmailPassword && (
              <LoginForm
                onLoginSuccess={handleLoginSuccess}
                onSwitchToSignUp={canNavigate ? showSignUpView : undefined}
              />
            )}
            {showStagedLogin && (
              <StagedLoginForm
                 onLoginSuccess={handleLoginSuccess}
              />
            )}
            {showInstantLogin && (
              <InstantLoginForm
                onLoginSuccess={handleLoginSuccess}
                onSwitchToRegular={handleSwitchToRegular}
              />
            )}
            {showCombinedInstantLogin && (
              <LoginWithInstantOption
                 onLoginSuccess={handleLoginSuccess}
               />
            )}
            {showGoogleAuth && (
                 <div className="mt-4 border-t pt-4">
                    <GoogleOAuth onSuccess={handleLoginSuccess} />
                 </div>
            )}
          </>
        )}

        {currentView === 'signup' && showSignUpForm && (
          <>
             <SignUpForm
               onSwitchToLogin={canNavigate ? showLoginView : undefined}
             />
             {showGoogleAuth && (
                 <div className="mt-4 border-t pt-4">
                    <GoogleOAuth onSuccess={handleLoginSuccess} />
                 </div>
             )}
          </>
        )}

      </div>
      {showPrivacyBanner && <PrivacyBanner />}
      {showPrivacyModal && <PrivacyModal />}
    </div>
  );
};

export default SimpleLoginPage;
