import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

const VerificationBanner = () => {
  const [isVerified, setIsVerified] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendButtonPressed, setResendButtonPressed] = useState(false);

  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/users/me`, { withCredentials: true });
        setIsVerified(response.data.is_confirmed);
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    checkVerificationStatus();
  }, []);

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendMessage('');
    setResendButtonPressed(true);
    try {
      await axios.post(`${API_URL}/auth/confirm/new`, {}, { withCredentials: true });
      setResendMessage('Verification email sent successfully.');
    } catch (error) {
      console.error('Error resending verification email:', error);
      setResendMessage('Failed to resend. Please try again later.');
      setResendButtonPressed(false); // Allow retry if failed
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified || dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 relative">
      <div className="flex items-center">
        <AlertTriangle className="flex-shrink-0 mr-3" />
        <div className="flex-grow">
          <p className="font-bold">Your account is not verified</p>
          <p className="flex items-center flex-wrap">
            Please check your email and click the verification link.
            {!resendButtonPressed && (
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className={`ml-1 text-yellow-800 hover:text-yellow-900 underline focus:outline-none ${
                  isResending ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="inline-block w-3 h-3 mr-1 animate-spin" />
                    Resending...
                  </>
                ) : (
                  "Resend email"
                )}
              </button>
            )}
            {resendMessage && (
              <span className="ml-1 text-yellow-800">{resendMessage}</span>
            )}
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-0 right-0 p-2"
        aria-label="Dismiss"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default VerificationBanner;
