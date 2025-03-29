import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { Building2, Users, Edit, Trash2, Plus } from 'lucide-react';

const OrganizationDashboard = () => {
  const navigate = useNavigate();
  const {
    organizations,
    selectedOrganization,
    selectOrganization,
    updateOrganization,
    deleteOrganization,
    loading,
    error
  } = useOrganization();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    type: 'individual',
  });
  const [editError, setEditError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (selectedOrganization) {
      setEditData({
        name: selectedOrganization.name,
        description: selectedOrganization.description || '',
        type: selectedOrganization.type
      });
    }
  }, [selectedOrganization]);

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

    if (!isDeleting) {
      // First click - Show confirmation
      setIsDeleting(true);
      return;
    }

    try {
      await deleteOrganization(selectedOrganization.id);
      setIsDeleting(false);
      // Reload the page after successful deletion
      window.location.reload();
    } catch (err) {
      setDeleteError(
        err.response?.data?.detail ||
        'An error occurred while deleting the organization. Please try again.'
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md my-4">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organization Dashboard</h1>
        <button
          onClick={() => navigate('/organization/create')}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Organization
        </button>
      </div>

      {organizations.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Organizations Yet</h2>
          <p className="text-gray-500 mb-4">You don't have any organizations yet. Create your first organization to get started.</p>
          <button
            onClick={() => navigate('/organization/create')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
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
                        ? 'bg-indigo-100 text-indigo-900'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm text-gray-500">{org.type}</div>
                  </button>
                </li>
              ))}
            </ul>
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          rows="3"
                          value={editData.description}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full mt-2">
                        {selectedOrganization.type}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 text-gray-600 hover:text-indigo-600 focus:outline-none"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleDelete}
                        className={`p-2 ${isDeleting ? 'text-red-600' : 'text-gray-600 hover:text-red-600'} focus:outline-none`}
                        title={isDeleting ? 'Click again to confirm deletion' : 'Delete'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {deleteError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md my-3 text-sm">
                      {deleteError}
                    </div>
                  )}

                  {isDeleting && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md my-3 text-sm">
                      Click the delete button again to permanently delete this organization. This action cannot be undone.
                    </div>
                  )}

                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600">
                      {selectedOrganization.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-medium text-gray-900">Members</h3>
                      <button
                        onClick={() => navigate('/organizations/members')}
                        className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Manage Members
                      </button>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-center text-gray-500">
                        Go to the members management page to view and manage organization members.
                      </p>
                    </div>
                  </div>
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
