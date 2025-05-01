import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function GoogleCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleOAuthCallback } = useAuth();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const expiresIn = searchParams.get('expires_in');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (token || error) {
      handleOAuthCallback(searchParams);

      navigate('/', { replace: true });
    } else {
      console.warn('Google callback received without token or error.');
      navigate('/login', {
        state: {
          message: 'An unexpected issue occurred during Google login.'
        },
        replace: true
      });
    }
  }, [navigate, location, handleOAuthCallback]);

  return <div>Processing Google login...</div>;
}

export default GoogleCallback;
