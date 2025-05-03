import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { Building2, Users, Edit, Trash2, Plus, Mail, CheckCircle2, XCircle, UserPlus, Copy, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { API_URL } from '@/constants/api';

// --- Members Section Component ---
const MembersSection = ({
  organization,
  members,
  loadingMembers,
  membersError,
  currentUserRole,
  loadMembers,
  onMembersUpdate
}) => {
  const { updateMemberRole, removeOrganizationMember } = useOrganization();
  const { user } = useAuth();

  const [inviteData, setInviteData] = useState({ email: '', role: 'member' });
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const roleHierarchy = { owner: 4, admin: 3, member: 2, guest: 1 };

  const canPerformAnyAction = members.some(member => {
    const canChangeRole = currentUserRole === 'admin' || currentUserRole === 'owner';
    const canRemove = (
      (currentUserRole === 'admin' || currentUserRole === 'owner' || String(member.user?.id) === user?.id) &&
      (roleHierarchy[member.role] <= roleHierarchy[currentUserRole] || String(member.user?.id) === user?.id)
    );
    return canChangeRole || canRemove;
  });

  const generateInvitationLink = (code) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join-organization/${code}`;
  };

  const copyToClipboard = (link) => {
    navigator.clipboard.writeText(link).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
        setInviteError('Failed to copy to clipboard. Please copy the link manually.');
      }
    );
  };

  useEffect(() => {
    if (members) {
      onMembersUpdate(members.length);
    }
  }, [members, onMembersUpdate]);

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
      const response = await axios.post(`${API_URL}/invitations/`, {
        email: inviteData.email,
        organization_id: organization.id,
        role: inviteData.role
      }, { withCredentials: true });

      setInvitationCode(response.data.code);
      setInviteData({ email: '', role: 'member' });
      setInviteSuccess(`Invitation created for ${inviteData.email}. Please share the link below:`);
      await loadMembers();
    } catch (err) {
      setInviteError(err.response?.data?.detail || 'Failed to create invitation. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId, role) => {
    try {
      await updateMemberRole(organization.id, memberId, { role });
      await loadMembers();
      setEditingMemberId(null);
    } catch (err) {
      console.error('Failed to update member role', err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (confirmingDelete !== memberId) {
      setConfirmingDelete(memberId);
      return;
    }

    try {
      await removeOrganizationMember(organization.id, memberId);
      await loadMembers();
      setConfirmingDelete(null);
    } catch (err) {
      console.error('Failed to remove member', err);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Users className="w-5 h-5 mr-2 text-gray-500" />
        Organization Members
      </h3>

      {loadingMembers ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Invite Form */}
          {(currentUserRole === 'admin' || currentUserRole === 'owner') && (
            <div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <UserPlus className="w-4 h-4 mr-2 text-gray-500" />
                  Invite New Member
                </h4>

                {inviteSuccess && (
                  <div className="mb-3 bg-green-50 text-green-700 p-3 rounded-md flex flex-col text-sm">
                    <div className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{inviteSuccess}</span>
                    </div>
                    {invitationCode && (
                      <div className="mt-2 p-2 bg-white border border-gray-200 rounded-md">
                        <div className="text-xs text-gray-800 overflow-hidden overflow-ellipsis break-all">
                          {generateInvitationLink(invitationCode)}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generateInvitationLink(invitationCode))}
                          className={`mt-2 w-full inline-flex justify-center items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md ${copied ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                        >
                          {copied ? (<><CheckCircle2 className="h-3 w-3 mr-1" />Copied!</>) : (<><Copy className="h-3 w-3 mr-1" />Copy Link</>)}
                        </button>
                        <p className="mt-1 text-xs text-gray-500">The API does not send emails.</p>
                      </div>
                    )}
                  </div>
                )}

                {inviteError && (
                  <div className="mb-3 bg-red-50 text-red-700 p-3 rounded-md flex items-start text-sm">
                    <XCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <form onSubmit={handleInviteSubmit}>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <input type="email" name="email" id="email" required value={inviteData.email} onChange={handleInviteChange} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 sm:text-sm text-xs border-gray-300 rounded-md py-1.5" placeholder="colleague@example.com" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="role" className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                      <select id="role" name="role" value={inviteData.role} onChange={handleInviteChange} className="mt-1 w-full pl-2 pr-8 py-1.5 text-sm focus:outline-none">
                        {Object.entries(roleHierarchy)
                          .filter(([roleName, level]) => level <= (roleHierarchy[currentUserRole] || 0))
                          .map(([roleName]) => (
                            <option key={roleName} value={roleName} className="capitalize">
                              {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    <div>
                      <button type="submit" disabled={isInviting} className={`w-full flex justify-center py-1.5 px-3 border border-transparent rounded-md shadow-sm text-xs font-medium text-white ${isInviting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}>
                        {isInviting ? (
                          <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Sending...</>
                        ) : 'Create Invitation'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Role Descriptions (Optional - Keep or remove based on desired clutter) */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <ul className="space-y-1 text-xs text-gray-600">
                    <span className="font-semibold" >Guest: </span><span className="pr-5">View-only access</span>
                    <span className="font-semibold" >Member: </span><span className="pr-5">View/use resources</span>
                    <span className="font-semibold" >Admin: </span><span className="pr-5">Manage members/settings</span>
                    <span className="font-semibold" >Owner: </span><span className="pr-5">Full control</span>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Members List */}
          <div>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {membersError && (
                <div className="bg-red-50 text-red-700 p-3 text-sm">
                  {membersError}
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
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                        {canPerformAnyAction && (
                          <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-gray-500 text-sm font-medium">
                                  {member.user?.username?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {member.user?.username}
                                  {String(member.user?.id) === user?.id && (
                                    <span className="ml-2 text-gray-500 italic">(you)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {editingMemberId === member.user.id ? (
                              <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="block w-full pl-2 pr-8 py-1 text-xs border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                              >
                                {Object.entries(roleHierarchy)
                                  .filter(([roleName, level]) => level <= (roleHierarchy[currentUserRole] || 0))
                                  .map(([roleName]) => (
                                    <option key={roleName} value={roleName} className="capitalize">
                                      {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                                    </option>
                                  ))
                                }
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                                ${member.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                  member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                    member.role === 'member' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'}`}>
                                {member.role}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {new Date(member.joined_at).toLocaleDateString()}
                          </td>
                          {canPerformAnyAction && (
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              {editingMemberId === member.user.id ? (
                                <div className="flex justify-end space-x-2">
                                  <button onClick={() => handleRoleChange(member.user.id, selectedRole)} className="text-blue-600 hover:text-blue-800 text-xs">Save</button>
                                  <button onClick={() => setEditingMemberId(null)} className="text-gray-600 hover:text-gray-900 text-xs">Cancel</button>
                                </div>
                              ) : (
                                <div className="flex justify-end space-x-2">
                                  {(currentUserRole === 'admin' || currentUserRole === 'owner') && roleHierarchy[member.role] < roleHierarchy[currentUserRole] && (
                                    <button
                                      onClick={() => { setEditingMemberId(member.user?.id); setSelectedRole(member.role); }}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                      disabled={roleHierarchy[member.role] >= roleHierarchy[currentUserRole]}
                                    >
                                      Change Role
                                    </button>
                                  )}
                                  {(currentUserRole === 'admin' || currentUserRole === 'owner' || String(member.user?.id) === user?.id) &&
                                    (roleHierarchy[member.role] <= roleHierarchy[currentUserRole] || String(member.user?.id) === user?.id) &&
                                    (
                                      <button
                                        onClick={() => handleRemoveMember(member.user?.id)}
                                        className={`text-xs ${confirmingDelete === member.user?.id ? "text-red-600 hover:text-red-900" : "text-gray-600 hover:text-gray-900"}`}
                                        disabled={roleHierarchy[member.role] >= roleHierarchy[currentUserRole] && String(member.user?.id) !== user?.id}
                                      >
                                        {confirmingDelete === member.user?.id ? 'Confirm' : 'Remove'}
                                      </button>
                                    )
                                  }
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// --- End Members Section Component ---

const OrganizationDashboard = () => {
  const navigate = useNavigate();
  const {
    organizations,
    selectedOrganization,
    selectOrganization,
    updateOrganization,
    deleteOrganization,
    fetchOrganizationMembers,
    loading: loadingOrgs,
    error: orgError
  } = useOrganization();
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    type: 'individual',
  });
  const [editError, setEditError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [memberCount, setMemberCount] = useState(0);

  const loadMembers = async () => {
    if (!selectedOrganization) return;
    setLoadingMembers(true);
    setMembersError('');
    setCurrentUserRole(null);
    try {
      const data = await fetchOrganizationMembers(selectedOrganization.id);
      setMembers(data);
      const currentUserMembership = data.find(member => String(member.user?.id) === user?.id);
      setCurrentUserRole(currentUserMembership?.role);
      setMemberCount(data.length);
    } catch (err) {
      setMembersError('Failed to load organization members');
      console.error(err);
      setCurrentUserRole(null);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (selectedOrganization) {
      setEditData({
        name: selectedOrganization.name,
        description: selectedOrganization.description || '',
        type: selectedOrganization.type
      });
      setMemberCount(0);
      setMembers([]);
      loadMembers();
      setIsEditing(false);
      setIsDeleting(false);
      setEditError('');
      setDeleteError('');
    } else {
      setMembers([]);
      setCurrentUserRole(null);
    }
  }, [selectedOrganization, user?.id]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!(currentUserRole === 'admin' || currentUserRole === 'owner')) {
      setEditError('You do not have permission to edit this organization.');
      return;
    }

    try {
      await updateOrganization(selectedOrganization.id, editData);
      setIsEditing(false);
    } catch (err) {
      setEditError(
        err.response?.data?.detail ||
        'An error occurred while updating the organization. Please try again.'
      );
    }
  };

  const handleDelete = async () => {
    setDeleteError('');

    if (currentUserRole !== 'owner') {
      setDeleteError('Only the organization owner can delete the organization.');
      setIsDeleting(false);
      return;
    }

    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }

    try {
      await deleteOrganization(selectedOrganization.id);
      setIsDeleting(false);
    } catch (err) {
      setDeleteError(
        err.response?.data?.detail ||
        'An error occurred while deleting the organization. Please try again.'
      );
      setIsDeleting(false);
    }
  };

  if (loadingOrgs) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md my-4">
        <p>Error: {orgError}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Organization Dashboard</h1>
        </div>
      </div>

      {organizations.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Organizations Yet</h2>
          <p className="text-gray-500 mb-4">You don't have any organizations yet. Create your first organization to get started.</p>
          <button
            onClick={() => navigate('/organization/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Organization
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Organizations List */}
          <div className="md:col-span-1 bg-white shadow-md rounded-lg p-4 h-min">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Organizations</h2>
            <ul className="space-y-2">
              {organizations.map((org) => (
                <li key={org.id}>
                  <button
                    onClick={() => selectOrganization(org)}
                    className={`w-full text-left px-4 py-3 rounded-md transition-colors ${
                      selectedOrganization?.id === org.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium truncate pr-2">{org.name}</div>
                    </div>
                    <div className="text-sm text-gray-500 capitalize">{org.type}</div>
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/organization/create')}
              className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Organization
            </button>
          </div>

          {/* Organization Details */}
          {selectedOrganization && (
            <div className="md:col-span-2 bg-white shadow-md rounded-lg p-6">
              {isEditing ? (
                // Edit Form
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Edit Organization</h2>

                  {editError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
                      {editError}
                    </div>
                  )}

                  <form onSubmit={handleEditSubmit}>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Organization Name
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={editData.name}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                          Organization Type
                        </label>
                        <select
                          id="type"
                          name="type"
                          required
                          value={editData.type}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="individual">Individual</option>
                          <option value="startup">Startup</option>
                          <option value="enterprise">Enterprise</option>
                          <option value="education">Education</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // View Details
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedOrganization.name}</h2>
                      <span className="inline-block px-2 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full mt-2">
                        {selectedOrganization.type}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {(currentUserRole === 'admin' || currentUserRole === 'owner') && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-2 text-gray-500 hover:text-blue-600 focus:outline-none"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                      {currentUserRole === 'owner' && (
                        <button
                          onClick={handleDelete}
                          className={`p-2 ${isDeleting ? 'text-red-600' : 'text-gray-600 hover:text-red-600'} focus:outline-none`}
                          title={isDeleting ? 'Click again to confirm deletion' : 'Delete'}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {deleteError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md my-3 text-sm">
                      {deleteError}
                    </div>
                  )}

                  {isDeleting && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md my-3 text-sm">
                      Are you sure you want to delete this organization? This action cannot be undone. Click the delete button again to confirm.
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Created:</span> {new Date(selectedOrganization.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Members Section Integration */}
                  <MembersSection
                    organization={selectedOrganization}
                    members={members}
                    loadingMembers={loadingMembers}
                    membersError={membersError}
                    currentUserRole={currentUserRole}
                    loadMembers={loadMembers}
                    onMembersUpdate={setMemberCount}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationDashboard;
