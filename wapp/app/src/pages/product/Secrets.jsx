import React, { useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { useProduct } from '../../context/ProductContext';
import SecretList from '../../components/secrets/SecretList';
import { HiLockClosed } from 'react-icons/hi';

const Secrets = () => {
  const { selectedOrganization } = useOrganization();
  const { selectedProduct } = useProduct();

  useEffect(() => {
    document.name = selectedProduct
      ? `Secrets - ${selectedProduct.name}`
      : 'Secrets Management';
  }, [selectedProduct]);

  // If no organization is selected, show a message
  if (!selectedOrganization) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <HiLockClosed className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No Organization Selected
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select an organization to manage secrets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Secrets Management
          {selectedProduct && (
            <span className="ml-2 text-xl text-gray-600">
              for {selectedProduct.name}
            </span>
          )}
        </h1>
        <p className="mt-1 text-gray-600">
          Securely store and manage sensitive information for testing
        </p>
      </div>

      {/* Main content */}
      <SecretList />

      {/* Documentation section */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          About Secrets Management
        </h2>
        <div className="prose max-w-none">
          <p>
            Secrets Management allows you to securely store sensitive informations. These secrets can be referenced in your tests without exposing the actual values.
            <br />
            Only users with the appropriate permissions can view, create, edit, and delete secrets.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Secrets;
