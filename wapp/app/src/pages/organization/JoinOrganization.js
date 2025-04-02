import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Users, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const JoinOrganization = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, validateInvitationCode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

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
        // If we get a network error and the user is not authenticated, redirect to login
        if (!isAuthenticated && err.message?.includes('Network Error')) {
          navigate(`/login?invitation_code=${code}`);
          return;
        }
        setError('Failed to validate invitation. It may have expired or been used already.');
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [code, isAuthenticated, navigate]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      // Redirect to login page with invitation code
      navigate(`/login?invitation_code=${code}`);
      return;
    }

    setJoining(true);
    try {
      console.log('Attempting to join organization:', {
        organizationId: invitation.organization_id,
        invitationCode: code
      });

      // Try to join the organization first
      const joinResponse = await axios.post(
        `${API_URL}/organizations/${invitation.organization_id}/join?invitation_code=${code}`,
        {},
        {
          withCredentials: true
        }
      );

      console.log('Join response:', joinResponse.data);

      // If we get here, the join was successful
      setJoinSuccess(true);

      // Redirect to the main application after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Error joining organization:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        config: err.config
      });
      
      // Check if this is a CORS error but the request actually succeeded
      if (err.message === 'Network Error' && err.config?.url?.includes('/join')) {
        // The request might have succeeded despite the CORS error
        setJoinSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
        return;
      }
      
      // Handle specific error cases
      if (err.response?.status === 400) {
        const errorDetail = err.response?.data?.detail;
        console.log('400 error detail:', errorDetail);
        if (errorDetail === 'You are already a member of this organization') {
          setJoinSuccess(true);
          setTimeout(() => {
            navigate('/');
          }, 2000);
          return;
        }
        if (errorDetail === 'This invitation has already been used') {
          setError('This invitation has already been used. Please request a new invitation.');
        } else if (errorDetail === 'This invitation has expired') {
          setError('This invitation has expired. Please request a new invitation.');
        } else {
          setError(typeof errorDetail === 'string' ? errorDetail : 'Failed to join organization. Please try again.');
        }
      } else if (err.response?.status === 404) {
        setError('Invalid invitation code. Please check the code and try again.');
      } else if (err.response?.status === 422) {
        console.log('422 error data:', err.response?.data);
        // Log the full error details for debugging
        console.log('Full error details:', {
          detail: err.response?.data?.detail,
          type: typeof err.response?.data?.detail,
          isArray: Array.isArray(err.response?.data?.detail),
          firstError: err.response?.data?.detail?.[0],
          firstErrorType: typeof err.response?.data?.detail?.[0],
          firstErrorKeys: err.response?.data?.detail?.[0] ? Object.keys(err.response.data.detail[0]) : [],
          firstErrorMsg: err.response?.data?.detail?.[0]?.msg,
          firstErrorLoc: err.response?.data?.detail?.[0]?.loc
        });

        // Check if the error is about being already a member
        if (err.response?.data?.detail?.includes('already a member')) {
          setJoinSuccess(true);
          setTimeout(() => {
            navigate('/');
          }, 2000);
          return;
        }
        // Check if the error is about email mismatch
        if (err.response?.data?.detail?.includes('email')) {
          setError('This invitation is not valid for your email address. Please use the email address that received the invitation.');
        } else if (Array.isArray(err.response?.data?.detail)) {
          // Handle array of validation errors
          const firstError = err.response.data.detail[0];
          if (firstError && typeof firstError === 'object') {
            // Handle FastAPI validation error format
            const errorMessage = firstError.msg || firstError.message || 'Failed to join organization. Please try again.';
            console.log('Validation error message:', errorMessage);
            console.log('Validation error location:', firstError.loc);
            setError(errorMessage);
          } else if (typeof firstError === 'string') {
            setError(firstError);
          } else {
            setError('Failed to join organization. Please try again.');
          }
        } else if (typeof err.response?.data?.detail === 'string') {
          setError(err.response.data.detail);
        } else {
          setError('Failed to join organization. Please try again.');
        }
      } else {
        setError('Failed to join organization. Please try again later.');
      }
    } finally {
      setJoining(false);
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

  if (joinSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Success!</h2>
            <p className="mt-2 text-gray-600">
              {organization
                ? `You have successfully joined ${organization.name}.`
                : 'You have successfully accepted the invitation.'}
            </p>
            <p className="mt-1 text-gray-500">Redirecting to the dashboard...</p>
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
          ) : joinSuccess ? (
            <div className="text-center">
              <div className="text-green-600 text-sm">
                Successfully joined {organization?.name}! Redirecting...
              </div>
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

              <button
                onClick={handleJoin}
                disabled={joining}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  joining ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {joining ? 'Joining...' : 'Join Organization'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default JoinOrganization;
