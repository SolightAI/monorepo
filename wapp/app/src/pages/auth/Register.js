import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';


export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invitationValid, setInvitationValid] = useState(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { register: authRegister, error: authError, validateInvitationCode } = useAuth();

  // Extract invitation code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('invitation_code');
    if (code) {
      setInvitationCode(code);
    }
  }, [location]);

  // Use authError from context if available
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // Function to validate code (used during form submission)
  const validateCode = async (code) => {
    if (!code) {
      const result = { isValid: false, error: 'Invitation code is required' };
      return result;
    }

    try {
      const validationApiResult = await validateInvitationCode(code, email || undefined);
      return validationApiResult;
    } catch (error) {
      const result = { isValid: false, error: 'Error validating invitation code' };
      return result;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setInvitationValid(null); // Reset validation status on new submission

    // If an invitation code is provided, validate it.
    if (invitationCode) {
      setValidatingCode(true);
      const validationResult = await validateCode(invitationCode);

      const isValidBoolean = validationResult.isValid;

      const negatedIsValidBoolean = !isValidBoolean;

      setValidatingCode(false);

      if (negatedIsValidBoolean) {
        setInvitationValid(false);
        setError(validationResult.error || 'Invalid invitation code');
        setIsLoading(false);
        return;
      }
      setInvitationValid(true);
    } else {
      // No invitation code provided, clear any previous validation state for it
      setInvitationValid(null);
    }

    try {
      // Pass invitationCode (it will be undefined if empty, which is fine for the backend)
      await authRegister(username, email, password, invitationCode || undefined);
      navigate('/'); // Navigate to home or dashboard on successful registration
      return; // Ensure no further code in this try block executes on success
    } catch (error) {
      // Error state is set by AuthContext, this log is for tracing here.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">Solight</h1>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-3">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="invitationCode" className="sr-only">
                Invitation Code
              </label>
              <div className="flex items-center">
                <input
                  id="invitationCode"
                  name="invitationCode"
                  type="text"
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    invitationValid === true ? 'border-green-500' :
                    invitationValid === false ? 'border-red-500' :
                    'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder="Invitation Code"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                />
                <span className="ml-2">
                  {validatingCode ? (
                    <span className="text-gray-400 animate-spin">⟳</span>
                  ) : invitationValid === true ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : invitationValid === false ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : null}
                </span>
              </div>
              {invitationValid === false && (
                <p className="text-red-500 text-xs mt-1">Invalid invitation code</p>
              )}
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
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-6 w-6 text-gray-400" /> : <Eye className="h-6 w-6 text-gray-400" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center mb-4">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
        <div className="text-center space-y-2">
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Already have an account? Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
