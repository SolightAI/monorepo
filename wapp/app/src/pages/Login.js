import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../utils/auth';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [googleAuthUrl, setGoogleAuthUrl] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [highlightInvitationCode, setHighlightInvitationCode] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const fetchGoogleAuthUrl = useCallback(async (codeOverride = null) => {
    console.log(`Fetching Google auth URL from ${API_URL}/auth/login/google`);

    try {
      let url = `${API_URL}/auth/login/google`;
      const codeToUse = codeOverride !== null ? codeOverride : invitationCode;
      if (codeToUse) {
        url += `?invitation_code=${encodeURIComponent(codeToUse)}`;
      }
      const response = await axios.get(url);
      setGoogleAuthUrl(response.data.url);
    } catch (error) {
      setError('Failed to fetch Google login URL');
    }
  }, [invitationCode]);

  // Extract code from URL query parameters and check for messages from redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code');
    if (codeFromUrl) {
      setInvitationCode(codeFromUrl);
      fetchGoogleAuthUrl(codeFromUrl);
    } else {
      fetchGoogleAuthUrl();
    }

    // Check for error messages in location state (from GoogleCallback)
    if (location.state && location.state.message) {
      setNotificationMessage(location.state.message);

      // If the error is related to invitation code, highlight that field
      if (location.state.requiresInvitationCode) {
        setHighlightInvitationCode(true);
      }

      // Clear the location state to prevent showing the message again on refresh
      navigate(location.pathname, { replace: true, state: {} });

      // Hide the notification after 5 seconds
      const timer = setTimeout(() => {
        setNotificationMessage('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [fetchGoogleAuthUrl, location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.detail || 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email: forgotPasswordEmail });
      setForgotPasswordMessage('If an account exists for this email, you will receive a password reset link shortly.');
    } catch (error) {
      setError('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      {notificationMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 max-w-md w-full bg-amber-100 border border-amber-200 text-amber-800 px-4 py-3 rounded-md shadow-md flex items-center justify-between z-50">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p>{notificationMessage}</p>
          </div>
          <button
            onClick={() => setNotificationMessage('')}
            className="text-amber-800 hover:text-amber-900"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h1 className="text-5xl font-bold text-center text-gray-900">Laneo</h1>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
            {showForgotPassword ? 'Reset Your Password' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {showForgotPassword
              ? 'Enter your email to receive a password reset link.'
              : 'The Product for Product people'}
          </p>
        </div>
        {!showForgotPassword ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>

              <div className={`mt-4 ${highlightInvitationCode ? 'animate-pulse' : ''}`}>
                <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-700">
                  Invitation Code {highlightInvitationCode && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="invitationCode"
                  name="invitationCode"
                  type="text"
                  value={invitationCode}
                  onChange={(e) => {
                    setInvitationCode(e.target.value);
                    setHighlightInvitationCode(false);
                  }}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    highlightInvitationCode
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="Enter invitation code if you have one"
                />
                {highlightInvitationCode && (
                  <p className="mt-1 text-sm text-red-600">
                    An invitation code is required for new user registration.
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
            {googleAuthUrl && (
              <div>
                <a
                  href={googleAuthUrl}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="flex items-center">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      <path d="M1 1h22v22H1z" fill="none"/>
                    </svg>
                    Sign in with Google
                  </span>
                </a>
              </div>
            )}
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
            <div>
              <label htmlFor="forgotPasswordEmail" className="sr-only">
                Email address
              </label>
              <input
                id="forgotPasswordEmail"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            {forgotPasswordMessage && (
              <div className="text-yellow-500 text-sm text-center">{forgotPasswordMessage}</div>
            )}

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
        <div className="text-center space-y-2">
          {/* <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Don't have an account? Register here
          </Link> */}
          {/* <div>
            <Link to="/faq" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
              <HelpCircle className="w-4 h-4 mr-1" />
              Need help? Check our FAQ
            </Link>
          </div> */}
        </div>
      </div>
    </div>
  );
}
