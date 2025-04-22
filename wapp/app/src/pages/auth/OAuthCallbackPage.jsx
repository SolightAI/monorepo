import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner'; // Assuming you have a loading spinner

export default function OAuthCallbackPage() {
  const { handleOAuthCallback, isAuthenticated, error: authError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      console.log('OAuthCallbackPage: Processing callback...');
      const searchParams = new URLSearchParams(location.search);
      try {
        await handleOAuthCallback(searchParams);
        // The handleOAuthCallback should update isAuthenticated and authError in context
        setProcessing(false);
        console.log('OAuthCallbackPage: Callback processed.');
      } catch (err) {
        // This catch might not be necessary if handleOAuthCallback handles its own errors
        console.error("OAuthCallbackPage: Error during handleOAuthCallback:", err);
        setError('An unexpected error occurred during authentication.');
        setProcessing(false);
      }
    };

    processCallback();
  }, [handleOAuthCallback, location.search]);

  useEffect(() => {
    // This effect runs after processing is done or auth state changes
    if (!processing) {
      if (isAuthenticated) {
        console.log('OAuthCallbackPage: Authentication successful, navigating to /');
        // Check for stored redirect path after successful auth
        const redirectPath = sessionStorage.getItem('joinOrgRedirect');
        if (redirectPath) {
          console.log('OAuthCallbackPage: Found redirect path:', redirectPath);
          sessionStorage.removeItem('joinOrgRedirect');
          navigate(redirectPath, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        // If not authenticated after processing, there must have been an error
        console.log('OAuthCallbackPage: Authentication failed, navigating to /login with error.');
        // Use the error from AuthContext if available, otherwise use local error
        const finalError = authError || error || 'Authentication failed. Please try again.';
        navigate('/login', { replace: true, state: { message: finalError } });
      }
    }
  }, [processing, isAuthenticated, authError, error, navigate]);

  // Display loading or error state
  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Processing authentication...</p>
      </div>
    );
  }

  // Although navigation happens in useEffect, render null or minimal content briefly
  return null;
}
