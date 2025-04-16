import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
        // If we get a network error and the user is not authenticated, redirect to Google OAuth
        if (!isAuthenticated && err.message?.includes('Network Error')) {
          // Get the Google auth URL with the invitation code
          try {
            const response = await axios.get(`${API_URL}/auth/login/google?invitation_code=${code}`);
            if (response.data.url) {
              window.location.href = response.data.url;
            }
          } catch (error) {
            console.error('Failed to get Google auth URL:', error);
            setError('Failed to initiate login process.');
          }
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
    try {
      const response = await axios.get(`${API_URL}/auth/login/google?invitation_code=${code}`);
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to get Google auth URL:', error);
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

              <button
                onClick={handleJoin}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Join Organization
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default JoinOrganization;
