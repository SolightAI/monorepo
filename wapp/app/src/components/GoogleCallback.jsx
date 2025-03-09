import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function GoogleCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (token) {
      // Set the token in a cookie (this is just for consistency, as the backend already sets the cookie)
      document.cookie = `access_token=Bearer ${token}; path=/; secure; samesite=lax`;

      // Set isAuthenticated in localStorage
      localStorage.setItem('isAuthenticated', 'true');

      // Redirect to the home page or dashboard
      navigate('/');
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

      // Redirect to login page with error message
      navigate('/login', {
        state: {
          message: errorMessage,
          requiresInvitationCode: errorMessage.includes('Invitation code required')
        }
      });
    }
  }, [navigate, location]);

  return <div>Processing Google login...</div>;
}

export default GoogleCallback;