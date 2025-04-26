import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function GoogleCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleGoogleCallback } = useAuth();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refresh_token');
    const expiresIn = searchParams.get('expires_in');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');


    if (token) {
      if (refreshToken) {
        handleGoogleCallback({
          access_token: token,
          refresh_token: refreshToken,
          expires_in: expiresIn ? parseInt(expiresIn) : undefined
        });
      } else {
        handleGoogleCallback(token);
      }

      // Always redirect to the main app
      navigate('/', { replace: true });
    } else {
      // Handle error case
      let errorMessage = 'An error occurred during Google login.';

      // Check for specific error messages
      if (error) {
        errorMessage = errorDescription || error;

        // Specifically handle the invitation code error
        if (errorMessage.includes('Invitation code required')) {
          errorMessage = 'Invitation code required for registration. Please enter a valid invitation code.';
        }
      }

      // Only redirect to login with error message if it's not a successful invitation processing
      if (!errorMessage.includes('Failed to process organization invitation')) {
        navigate('/login', {
          state: {
            message: errorMessage,
            requiresInvitationCode: errorMessage.includes('Invitation code required')
          },
          replace: true
        });
      } else {
        // If it's a successful invitation processing, just redirect to main app
        navigate('/', { replace: true });
      }
    }
  }, [navigate, location, handleGoogleCallback]);

  return <div>Processing Google login...</div>;
}

export default GoogleCallback;
