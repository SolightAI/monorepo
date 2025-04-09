import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import axios from 'axios';
import { Users, Mail, CheckCircle2, XCircle, UserPlus, ChevronLeft, Copy } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const OrganizationMembers = () => {
  const navigate = useNavigate();
  const { selectedOrganization, fetchOrganizationMembers, addOrganizationMember, updateMemberRole, removeOrganizationMember } = useOrganization();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state for inviting a new member
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member'
  });
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [copied, setCopied] = useState(false);

  // State for member being edited or deleted
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  // Generate the invitation link from a code
  const generateInvitationLink = (code) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join-organization/${code}`;
  };

  // Copy invitation link to clipboard
  const copyToClipboard = (link) => {
    navigator.clipboard.writeText(link).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      },
      (err) => {
        console.error('Could not copy text: ', err);
        setInviteError('Failed to copy to clipboard. Please copy the link manually.');
      }
    );
  };

  useEffect(() => {
    if (!selectedOrganization) {
      navigate('/organizations/dashboard');
      return;
    }

    loadMembers();
  }, [selectedOrganization, navigate]);

  const loadMembers = async () => {
    if (!selectedOrganization) return;

    setLoading(true);
    try {
      const data = await fetchOrganizationMembers(selectedOrganization.id);
      setMembers(data);
    } catch (err) {
      setError('Failed to load organization members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteChange = (e) => {
    const { name, value } = e.target;
    setInviteData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInvitationCode('');
    setCopied(false);
    setIsInviting(true);

    try {
      // Create an invitation with the organization context
      const response = await axios.post(`${API_URL}/invitations/`, {
        email: inviteData.email,
        organization_id: selectedOrganization.id,
        role: inviteData.role
      }, { withCredentials: true });

      // Store the invitation code
      setInvitationCode(response.data.code);

      // Reset form and show success message
      setInviteData({ email: '', role: 'member' });
      setInviteSuccess(`Invitation created for ${inviteData.email}. Please share the link below:`);
    } catch (err) {
      setInviteError(
        err.response?.data?.detail ||
        'Failed to create invitation. Please try again.'
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId, role) => {
    setError('');
    try {
      await updateMemberRole(selectedOrganization.id, memberId, { role });
      await loadMembers(); // Reload the members list
      setEditingMemberId(null);
    } catch (err) {
      setError('Failed to update member role');
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (confirmingDelete !== memberId) {
      setConfirmingDelete(memberId);
      return;
    }

    setError('');
    try {
      await removeOrganizationMember(selectedOrganization.id, memberId);
      await loadMembers(); // Reload the members list
      setConfirmingDelete(null);
    } catch (err) {
      setError('Failed to remove member');
      console.error(err);
    }
  };

  if (!selectedOrganization) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <p className="text-gray-700">No organization selected. Please select an organization first.</p>
          <button
            onClick={() => navigate('/organizations/dashboard')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Go to Organization Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/organizations/dashboard')}
          className="text-gray-600 hover:text-indigo-600 flex items-center"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Members List */}
        <div className="md:w-2/3">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-gray-500" />
                Members of {selectedOrganization.name}
              </h2>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 text-sm">
                {error}
              </div>
            )}

            {members.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No members found in this organization.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-500 font-medium">
                                {member.user?.username?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{member.user?.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingMemberId === member.user.id ? (
                            <select
                              value={selectedRole}
                              onChange={(e) => setSelectedRole(e.target.value)}
                              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="guest">Guest</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                              ${member.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                  member.role === 'member' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'}`}>
                              {member.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(member.joined_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {editingMemberId === member.user.id ? (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleRoleChange(member.user.id, selectedRole)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingMemberId(null)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end space-x-3">
                              <button
                                onClick={() => {
                                  setEditingMemberId(member.user.id);
                                  setSelectedRole(member.role);
                                }}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Change Role
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member.user.id)}
                                className={confirmingDelete === member.user.id
                                  ? "text-red-600 hover:text-red-900"
                                  : "text-gray-600 hover:text-gray-900"}
                              >
                                {confirmingDelete === member.user.id ? 'Confirm Remove' : 'Remove'}
                              </button>
                            </div>
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

        {/* Invite Form */}
        <div className="md:w-1/3">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-gray-500" />
              Invite New Member
            </h2>

            {inviteSuccess && (
              <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-md flex flex-col">
                <div className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{inviteSuccess}</span>
                </div>

                {invitationCode && (
                  <div className="mt-3 p-2 bg-white border border-gray-200 rounded-md">
                    <div className="text-sm text-gray-800 overflow-hidden overflow-ellipsis break-all">
                      {generateInvitationLink(invitationCode)}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generateInvitationLink(invitationCode))}
                      className={`mt-2 w-full inline-flex justify-center items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md ${
                        copied ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Invitation Link
                        </>
                      )}
                    </button>
                    <p className="mt-2 text-xs text-gray-500">
                      Send this link to the user. The API does not automatically send emails yet.
                    </p>
                  </div>
                )}
              </div>
            )}

            {inviteError && (
              <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md flex items-start">
                <XCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      value={inviteData.email}
                      onChange={handleInviteChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      placeholder="colleague@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={inviteData.role}
                    onChange={handleInviteChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isInviting}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      isInviting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  >
                    {isInviting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      'Create Invitation'
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Role Permissions</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="font-semibold mr-2">Owner:</span>
                  <span>Can manage all organization settings, members, and delete the organization.</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">Admin:</span>
                  <span>Can manage members and organization settings, but cannot delete the organization.</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">Member:</span>
                  <span>Can view and interact with organization resources but cannot change organization settings.</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">Guest:</span>
                  <span>Has limited access to organization resources with view-only permissions.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationMembers;
