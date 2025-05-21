import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants/api';

const JoinOrganization = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, validateInvitationCode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    // Validate the invitation code
    const validateInvitation = async () => {
      setLoading(true);
      try {
        const result = await validateInvitationCode(code);
        if (result.isValid) {
          // Check if this is an organization invitation
          if (!result.data.organization_id) {
            setError('This is an individual invitation code, not an organization invitation.');
            setLoading(false);
            return;
          }

          setInvitation(result.data);
          // Fetch organization details using the public endpoint
          try {
            const orgResponse = await axios.get(
              `${API_URL}/organizations/public/${result.data.organization_id}`,
              {
                withCredentials: true
              }
            );
            setOrganization(orgResponse.data);
          } catch (err) {
            console.error('Error fetching organization details:', err);
            setError('Failed to fetch organization details.');
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        console.error('Error validating invitation:', err);
        // If we get a network error and the user is not authenticated, show auth options
        if (!isAuthenticated && err.message?.includes('Network Error')) {
          setLoading(false);
          return;
        }
        setError('Failed to validate invitation. It may have expired or been used already.');
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [code, isAuthenticated, navigate]);

  const handleJoin = async (provider) => {
    try {
      const response = await axios.get(`${API_URL}/auth/login/${provider}?invitation_code=${code}`);
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error(`Failed to get ${provider} auth URL:`, error);
      setError('Failed to initiate login process.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-center text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Invalid Invitation</h2>
            <p className="mt-2 text-red-600">{error}</p>
            {error.includes('individual invitation code') && (
              <p className="mt-4 text-sm text-gray-600">
                Please use the{' '}
                <button
                  onClick={() => navigate(`/login?invitation_code=${code}`)}
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  login page
                </button>{' '}
                to complete your registration.
              </p>
            )}
          </div>
          <div className="mt-6">
            <button
              onClick={() => navigate('/')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Join Organization
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading...</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="text-red-600 text-sm">{error}</div>
            </div>
          ) : invitation && organization ? (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  You've been invited to join {organization.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Role: {invitation.role}
                </p>
              </div>

              {/* Email/Password Sign In Button Link */}
              <div>
                <Link
                  to={`/login?invitation_code=${code}`}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign in
                </Link>
              </div>

              {/* Email/Password Sign Up Button Link */}
              <div>
                <Link
                  to={`/register?invitation_code=${code}`}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mt-3"
                >
                  Sign up
                </Link>
              </div>

              {/* Separator */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>

              {/* Google */ }
              <div className="space-y-4">
                <button
                  onClick={() => handleJoin('google')}
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

                {/* Azure */}
                <button
                  onClick={() => handleJoin('azure')}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="flex items-center">
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
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default JoinOrganization;
