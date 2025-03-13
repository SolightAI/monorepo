import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { validateInvitationCode } from '@/utils/auth';
import { Users, CheckCircle2, XCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const JoinOrganization = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    // Check authentication status
    setIsAuthenticated(localStorage.getItem('isAuthenticated') === 'true');

    // Validate the invitation code
    const validateInvitation = async () => {
      setLoading(true);
      try {
        const result = await validateInvitationCode(code);
        if (result.valid) {
          setInvitation(result.data);
          // If the invitation is for an organization, fetch organization details
          if (result.data.organization_id) {
            try {
              const orgResponse = await axios.get(`${API_URL}/organizations/${result.data.organization_id}`, {
                withCredentials: true
              });
              setOrganization(orgResponse.data);
            } catch (orgErr) {
              console.error('Error fetching organization:', orgErr);
              setError('Failed to fetch organization details.');
            }
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to validate invitation. It may have expired or been used already.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [code]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      // Redirect to register page with invitation code
      navigate(`/register?invitation_code=${code}`);
      return;
    }

    setJoining(true);
    try {
      // Mark invitation as used
      await axios.post(`${API_URL}/invitations/mark-used/${code}`, {}, {
        withCredentials: true
      });
      setJoinSuccess(true);

      // Redirect to the main application after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to join organization. Please try again.'
      );
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <Users className="h-12 w-12 text-indigo-500 mx-auto" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Join Organization</h2>

          {organization ? (
            <div className="mt-4">
              <p className="text-lg font-medium text-gray-900">{organization.name}</p>
              <p className="text-sm text-gray-600">{organization.description}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {organization.type}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-gray-600">You've been invited to join an organization</p>
          )}

          {invitation && invitation.role && (
            <p className="mt-4 text-sm text-gray-600">
              You will join as a <span className="font-medium">{invitation.role}</span>
            </p>
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={handleJoin}
            disabled={joining}
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
              joining ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {joining ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Joining...
              </>
            ) : (
              isAuthenticated ? 'Accept Invitation' : 'Sign Up & Join'
            )}
          </button>
        </div>

        {!isAuthenticated && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate(`/login?invitation_code=${code}`)}
                className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
              >
                Sign in
              </button>
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-4">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-900 flex justify-center"
          >
            Cancel and go back
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinOrganization;
