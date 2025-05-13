import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;
const ALLOW_EMAIL_LOGIN = process.env.REACT_APP_ALLOW_EMAIL_LOGIN || false;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [highlightInvitationCode, setHighlightInvitationCode] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login: authLogin,
    error: authError,
    isAuthenticated,
    logout,
    loginWithGoogle,
    loginWithAzure
  } = useAuth();
  const authChecked = useRef(false);

  // Handle successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      // Check if there's a stored redirect path
      const redirectPath = sessionStorage.getItem('joinOrgRedirect');
      if (redirectPath) {
        console.log('Found redirect path:', redirectPath);
        // Clear the stored path
        sessionStorage.removeItem('joinOrgRedirect');
        // Navigate to the stored path
        navigate(redirectPath, { replace: true });
      } else {
        // If no redirect path, go to main app
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, navigate]);

  // Extract code from URL query parameters and check for messages from redirects
  useEffect(() => {
    // Skip if already authenticated or in loading state
    if (isAuthenticated || isLoading) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    console.log('Login page URL params:', Object.fromEntries(params));

    // Check for error messages from URL parameters
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    if (error) {
      console.log('Error from URL params:', error, errorDescription);
      setError(errorDescription || error);
    }

    // Check for messages from React Router state (redirects)
    const state = location.state;
    if (state?.message) {
      console.log('Error from state:', state.message);
      setError(state.message);

      // Clear the state message so it doesn't persist on refresh
      const timer = setTimeout(() => {
        navigate(location.pathname, { replace: true });
      }, 100);

      return () => clearTimeout(timer);
    }

    // Extract invitation code from URL or cookies
    const cookies = document.cookie.split(';');
    const pendingInvitation = cookies.find(cookie => cookie.trim().startsWith('pending_invitation='));
    const codeFromUrl = params.get('invitation_code');

    if (pendingInvitation) {
      const code = pendingInvitation.split('=')[1];
      console.log('Found invitation code in cookies:', code);
      setInvitationCode(code);
    } else if (codeFromUrl) {
      console.log('Invitation code from URL:', codeFromUrl);
      setInvitationCode(codeFromUrl);
    }

    // Mark that we've checked for the code once
    authChecked.current = true;
  }, [location, navigate, isLoading, isAuthenticated]);

  // Use authError from context if available
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting login with email:', email, 'and invitation code:', invitationCode);
      // Pass email, password, and invitationCode (which can be undefined)
      const loginSuccess = await authLogin(email, password, invitationCode);

      if (loginSuccess) {
        console.log('Login successful, navigating to main app');
        // Navigation is handled by useEffect based on isAuthenticated
      } else {
        // Error is set by authLogin if it returns false or throws
        // No need to set error here explicitly unless authLogin doesn't handle it
        console.log('Login attempt returned false or threw an error.');
      }
    } catch (error) { // This catch block might be redundant if authLogin handles all errors
      console.error('Login error in component:', error);
      // setError is typically set within authLogin now
      // If authLogin re-throws, this will catch it.
      // If authLogin returns false, error should already be set in AuthContext.
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
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      setError('An error occurred. Please try again later.');
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
          <h1 className="text-5xl font-bold text-center text-gray-900">Solight</h1>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
            {isLoading && "Checking authentication..."}
            {!isLoading && (showForgotPassword ? 'Reset Your Password' : 'Sign in to your account')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLoading
              ? "Please wait..."
              : (showForgotPassword
                ? 'Enter your email to receive a password reset link.'
                : 'The Product for Product people')}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : !showForgotPassword ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <>
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    autoComplete="email"
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
                    autoComplete="current-password"
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
              </>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <>
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
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link
                    to={`/register${invitationCode ? `?invitation_code=${invitationCode}` : ''}`}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Register here
                  </Link>
                </p>
              </div>
            </>

            {/* Separator */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>


            {/* Google Login Button */}
            <div>
              <button
                type="button"
                onClick={() => loginWithGoogle(invitationCode)}
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
                  Continue with Google
                </span>
              </button>
            </div>

            {/* Microsoft Login Button */}
            <div>
              <button
                type="button"
                onClick={() => loginWithAzure(invitationCode)}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="flex items-center">
                  {/* Microsoft Logo SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" className="h-5 w-5 mr-2">
                    <path fill="#f25022" d="M1 1h9v9H1z"/>
                    <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                    <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                    <path fill="#ffb900" d="M11 11h9v9h-9z"/>
                  </svg>
                  Continue with Microsoft
                </span>
              </button>
            </div>

            <div className="mt-4">
              {!showInviteCode && (
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteCode(!showInviteCode);
                    if (!showInviteCode) {
                      setHighlightInvitationCode(false);
                    }
                  }}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
                >
                  {showInviteCode ? "Hide invitation code" : "I have an invitation code"}
                </button>
              )}

              {showInviteCode && (
                <div className="mt-2">
                  <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-700">
                    Invitation Code {highlightInvitationCode && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id="invitationCode"
                    name="invitationCode"
                    type="text"
                    value={invitationCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setInvitationCode(newCode);
                      setHighlightInvitationCode(false);
                    }}
                    onKeyPress={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (invitationCode) {
                          try {
                            console.log("Enter press detected, user should click a provider button.");
                          } catch (error) {
                            console.error('Error initiating OAuth on Enter:', error);
                            setError('Could not start login process.');
                          }
                        }
                      }
                    }}
                    className={`mt-1 block w-full px-3 py-2 border ${
                      highlightInvitationCode
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    placeholder="Enter your invitation code"
                  />
                  {invitationCode && (
                    <div className="mt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setError('');
                            setInvitationCode('');
                            setHighlightInvitationCode(false);
                            setIsLoading(false);
                            authChecked.current = false;
                            await logout();
                            navigate('/login', { replace: true, state: {} });
                          } catch (error) {
                            console.error('Logout failed:', error);
                          }
                        }}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700"
                      >
                        Clear invitation code
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
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
      </div>
    </div>
  );
}
