import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Copy, Mail, Plus, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

export default function AdminInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newInvitation, setNewInvitation] = useState({ email: '', expires_at: '' });
  const [usedFilter, setUsedFilter] = useState('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [copied, setCopied] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [deletingInvitation, setDeletingInvitation] = useState(null);

  // Fetch invitations
  const fetchInvitations = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/invitations/`;
      let params = [];

      if (usedFilter !== 'all') {
        params.push(`used=${usedFilter === 'used'}`);
      }

      if (searchEmail) {
        params.push(`email=${searchEmail}`);
      }

      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      // Ensure we're using a secure connection in production
      await axios.get(`${API_URL}/auth/is-admin/`, {
        withCredentials: true,
        timeout: 5000 // 5 second timeout
      });  // waits for potential 4xx status code

      const response = await axios.get(url, {
        withCredentials: true,
        timeout: 10000 // 10 second timeout
      });
      setInvitations(response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      if (error.response && error.response.status === 403) {
        setError('You need admin privileges to access this page');
      } else {
        setError('Failed to load invitations. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [usedFilter, searchEmail]);

  // Create new invitation
  const createInvitation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCreateSuccess(false);

    try {
      if (newInvitation.expires_at) {
        const expirationDate = new Date(newInvitation.expires_at);
        if (expirationDate <= new Date()) {
          setError('Expiration date cannot be in the past');
          setLoading(false);
          return;
        }
      }

      const payload = {
        code: '', // Let the server generate a code
        email: newInvitation.email || null
      };

      if (newInvitation.expires_at) {
        payload.expires_at = new Date(newInvitation.expires_at).toISOString();
      }

      // Use HTTPS for API requests to prevent mixed content errors in production
      const response = await axios.post(`${API_URL}/invitations/`, payload, {
        withCredentials: true,
        timeout: 10000 // 10 second timeout
      });
      setInvitations([response.data, ...invitations]);

      setNewInvitation({ email: '', expires_at: '' });
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to create invitation:', error);
      if (error.response && error.response.status === 403) {
        setError('You need admin privileges to create invitations');
      } else {
        setError('Failed to create invitation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Copy invitation code to clipboard
  const copyToClipboard = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  // Generate invitation link
  const generateInvitationLink = (code) => {
    return `${window.location.origin}/join-organization/${code}`;
  };

  // Send invitation email
  const sendInvitationEmail = (invitation) => {
    // In a real implementation, you'd send an API request to trigger an email
    // TODO
    const subject = 'Welcome to Laneo!';
    const body = `
      Hello,

      You've been invited to join Laneo. Use the following invitation code to register:

      Invitation Code: ${invitation.code}

      Or simply click this link to register:
      ${generateInvitationLink(invitation.code)}

      ${invitation.expires_at ? `This invitation expires on ${new Date(invitation.expires_at).toLocaleString()}.` : ''}

      Welcome aboard!
    `;

    window.open(`mailto:${invitation.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Check if invitation is expired
  const isExpired = (expires_at) => {
    if (!expires_at) return false;
    return new Date(expires_at) < new Date();
  };

  // Delete invitation
  const deleteInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to delete this invitation?')) {
      return;
    }

    setDeletingInvitation(invitationId);
    setError('');

    try {
      await axios.delete(`${API_URL}/invitations/${invitationId}/`, {
        withCredentials: true,
        timeout: 10000
      });
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
    } catch (error) {
      console.error('Failed to delete invitation:', error);
      if (error.response && error.response.status === 403) {
        setError('You need admin privileges to delete invitations');
      } else {
        setError('Failed to delete invitation. Please try again.');
      }
    } finally {
      setDeletingInvitation(null);
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Invitation Management</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

        {/* Create new invitation */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Invitation</h2>
          <form onSubmit={createInvitation} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">
                Email (Optional)
                <input
                  type="email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="email@example.com"
                  value={newInvitation.email}
                  onChange={(e) => setNewInvitation({ ...newInvitation, email: e.target.value })}
                />
                <p className="text-sm text-gray-500 mt-1">
                  If provided, only this email can use the invitation code
                </p>
              </label>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">
                Expiration Date (Optional)
                <input
                  type="datetime-local"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={newInvitation.expires_at}
                  onChange={(e) => setNewInvitation({ ...newInvitation, expires_at: e.target.value })}
                />
              </label>
            </div>

            <div className="flex items-center">
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                {loading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                Generate Invitation Code
              </button>

              {createSuccess && (
                <span className="ml-4 text-green-600 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-1" />
                  Invitation created successfully!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Invitations list */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row justify-between mb-6">
            <h2 className="text-xl font-semibold mb-4 md:mb-0">Invitations</h2>

            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
              <div>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={usedFilter}
                  onChange={(e) => setUsedFilter(e.target.value)}
                >
                  <option value="all">All Invitations</option>
                  <option value="unused">Unused Only</option>
                  <option value="used">Used Only</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                />
              </div>

              <button
                className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                onClick={fetchInvitations}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No invitations found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Used At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation, index) => (
                    <tr key={invitation.id} className={invitation.used ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <span className={`mr-2 ${invitation.used ? 'line-through text-gray-400' : ''}`}>
                            {invitation.code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(invitation.code, index)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy code"
                          >
                            {copied === index ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invitation.email || 'Any email'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invitation.used ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Used
                          </span>
                        ) : isExpired(invitation.expires_at) ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invitation.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invitation.expires_at ? (
                          <span className={isExpired(invitation.expires_at) ? 'text-red-500' : ''}>
                            {formatDate(invitation.expires_at)}
                          </span>
                        ) : (
                          'Never'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invitation.used_at ? formatDate(invitation.used_at) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => copyToClipboard(generateInvitationLink(invitation.code), `link-${index}`)}
                          className={`text-blue-600 hover:text-blue-900 ${invitation.used ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={invitation.used ? 'Invitation already used' : 'Copy invitation link'}
                          disabled={invitation.used}
                        >
                          {copied === `link-${index}` ? 'Copied!' : 'Copy Link'}
                        </button>

                        {invitation.email && !invitation.used && (
                          <button
                            onClick={() => sendInvitationEmail(invitation)}
                            className="text-green-600 hover:text-green-900 ml-2"
                            title="Send invitation email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}

                        {!invitation.used && (
                          <button
                            onClick={() => deleteInvitation(invitation.id)}
                            className="text-red-600 hover:text-red-900 ml-2"
                            title="Delete invitation"
                            disabled={deletingInvitation === invitation.id}
                          >
                            {deletingInvitation === invitation.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
