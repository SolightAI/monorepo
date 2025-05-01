import React, { useEffect, useState } from 'react';
import { useSecret } from '../../context/SecretContext';
import { useOrganization } from '../../context/OrganizationContext';
import { useProduct } from '../../context/ProductContext';
import {
  HiKey,
  HiPlusCircle,
  HiExclamationCircle,
  HiLockClosed
} from 'react-icons/hi';
import SecretModal from './SecretModal';

const SecretList = () => {
  const {
    secrets,
    loading,
    error,
    fetchSecrets,
    selectSecret,
    deleteSecret,
    clearError
  } = useSecret();

  const { selectedOrganization } = useOrganization();
  const { selectedProduct } = useProduct();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSecret, setCurrentSecret] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  // Fetch secrets when organization or product changes
  useEffect(() => {
    if (selectedOrganization) {
      fetchSecrets();
    }
  }, [selectedOrganization, selectedProduct, fetchSecrets]);

  // Handle secret selection for viewing/editing
  const handleSecretClick = (secret) => {
    setCurrentSecret(secret);
    selectSecret(secret);
    setIsModalOpen(true);
  };

  // Open modal for creating a new secret
  const handleAddSecret = () => {
    setCurrentSecret(null);
    setIsModalOpen(true);
  };

  // Close the modal
  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentSecret(null);
  };

  // Handle delete confirmation
  const handleDeleteClick = (secret, e) => {
    e.stopPropagation();
    setDeleteConfirmation(secret);
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (deleteConfirmation) {
      await deleteSecret(deleteConfirmation.id);
      setDeleteConfirmation(null);
    }
  };

  // Cancel delete action
  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  // Get the secret type display text
  const getSecretTypeDisplay = (type) => {
    const typeMap = {
      'username_password': 'Credentials',
      // 'api_key': 'API Key',
      // 'environment_variable': 'Environment Variable',
      // 'connection_string': 'Connection String',
      // 'oauth_credential': 'OAuth Credentials',
      // 'other': 'Other'
    };
    return typeMap[type] || type;
  };

  // Render delete confirmation modal
  const renderDeleteConfirmation = () => {
    if (!deleteConfirmation) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
          <p className="mb-4">
            Are you sure you want to delete the secret "{deleteConfirmation.name}"?
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={cancelDelete}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // If no organization is selected
  if (!selectedOrganization) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-10">
          <HiLockClosed className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Organization Selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select an organization to manage secrets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
        Test Credentials Management
          {selectedProduct && (
            <span className="ml-2 text-sm text-gray-500">
              for {selectedProduct.name}
            </span>
          )}
        </h2>
        <div className="flex space-x-2">
          {/* <button
            onClick={fetchSecrets}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Refresh secrets"
          >
            <HiRefresh className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button> */}
          <button
            onClick={handleAddSecret}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            <HiPlusCircle className="mr-1" /> New Test Credential
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <HiExclamationCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={clearError}
                className="text-red-700 hover:text-red-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && !secrets.length ? (
        <div className="py-10 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading secrets...</p>
        </div>
      ) : !secrets.length ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
          <HiKey className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No secrets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new secret.
          </p>
          <div className="mt-6">
            <button
              onClick={handleAddSecret}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <HiPlusCircle className="mr-2 -ml-1 h-5 w-5" />
              New Test Credential
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {secrets.map((secret) => (
                <tr
                  key={secret.id}
                  onClick={() => handleSecretClick(secret)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <HiKey className="h-5 w-5 text-gray-400 mr-2" />
                      <div className="font-medium text-gray-900">{secret.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getSecretTypeDisplay(secret.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(secret.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {secret.expires_at ? new Date(secret.expires_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => handleDeleteClick(secret, e)}
                      className="text-red-600 hover:text-red-900 ml-4"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <SecretModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          secret={currentSecret}
          onRefresh={fetchSecrets}
        />
      )}

      {renderDeleteConfirmation()}
    </div>
  );
};

export default SecretList;
