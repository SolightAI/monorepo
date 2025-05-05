import React, { useState, useEffect, useCallback } from 'react';
import { useSecret } from '../../context/SecretContext';
import { useOrganization } from '../../context/OrganizationContext';
import { useProduct } from '../../context/ProductContext';
import { HiX, HiEye, HiEyeOff, HiClipboardCopy, HiExclamationCircle } from 'react-icons/hi';
import { v4 as uuidv4 } from 'uuid';

const SecretTypes = {
  USERNAME_PASSWORD: 'username_password',
  API_KEY: 'api_key',
  ENVIRONMENT_VARIABLE: 'environment_variable',
  CONNECTION_STRING: 'connection_string',
  OAUTH_CREDENTIAL: 'oauth_credential',
  OTHER: 'other',
};

// Constants for standard secret value keys
const SecretFieldKeys = {
  USERNAME: 'username',
  PASSWORD: 'password',
  PROVIDER: 'provider',
};

// Add constant for OAuth Providers
const OAuthProviders = {
  GOOGLE: 'Google',
};

// Mapping from SecretTypes to their default fields and initial values
const SecretTypeFields = {
  [SecretTypes.USERNAME_PASSWORD]: [
    { key: SecretFieldKeys.USERNAME, value: '', placeholder: 'Enter username' },
    { key: SecretFieldKeys.PASSWORD, value: '', placeholder: 'Enter password' }
  ],
  [SecretTypes.OAUTH_CREDENTIAL]: [
    { key: SecretFieldKeys.PROVIDER, value: '', placeholder: 'Select Provider' },
    { key: SecretFieldKeys.USERNAME, value: '', placeholder: 'Enter username' },
    { key: SecretFieldKeys.PASSWORD, value: '', placeholder: 'Enter password' },
  ],
};

const SecretModal = ({ isOpen, onClose, secret, onRefresh }) => {
  const { selectedOrganization } = useOrganization();
  const { selectedProduct } = useProduct();
  const {
    createSecret,
    updateSecret,
    updateSecretValues,
    getSecretWithValues,
    loading
  } = useSecret();

  const isEditing = !!secret;

  // Initial form state structure (will be populated by effects)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: SecretTypes.USERNAME_PASSWORD, // Default type for initial render
    expires_at: '',
    organization_id: selectedOrganization?.id,
    product_id: selectedProduct?.id,
  });

  // Secret values state (key-value pairs)
  const [secretValues, setSecretValues] = useState([
    { id: uuidv4(), key: '', value: '', revealed: false }
  ]);

  // Loading state for fetching secret values
  const [loadingValues, setLoadingValues] = useState(false);
  const [error, setError] = useState(null);
  const [valuesToUpdate, setValuesToUpdate] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Set initial form data when editing starts or selected product/org changes
  useEffect(() => {
    if (isEditing && secret) {
      setFormData({
        name: secret.name,
        description: secret.description || '',
        type: secret.type,
        expires_at: secret.expires_at ? new Date(secret.expires_at).toISOString().split('T')[0] : '',
        organization_id: secret.organization_id,
        product_id: secret.product_id || selectedProduct?.id, // Prioritize secret's product ID
      });
    } else if (!isEditing) {
      // Reset form for new secret, keeping org/product context
      setFormData({
        name: 'My Credentials', // Default name
        description: '',
        type: SecretTypes.USERNAME_PASSWORD, // Default type
        expires_at: '',
        organization_id: selectedOrganization?.id,
        product_id: selectedProduct?.id,
      });
       // Set default fields for the initial type when creating
       // This is handled by Effect 3 now
    }
  }, [isEditing, secret, selectedOrganization, selectedProduct]); // Rerun if switching between edit/create or context changes

  // Use useCallback for setDefaultFieldsForType to stabilize its reference
  const setDefaultFieldsForType = useCallback((type) => {
    const defaultFields = SecretTypeFields[type] || SecretTypeFields[SecretTypes.OTHER]; // Default to OTHER if type not found

    const initialValues = defaultFields.map(field => ({
      id: uuidv4(),
      key: field.key,
      value: field.value || '', // Ensure value is always a string
      revealed: false,
      placeholder: field.placeholder || 'Enter value' // Add placeholder info
    }));

    setSecretValues(initialValues);

    // Update valuesToUpdate based on the default fields
    const initialValuesToUpdate = {};
    defaultFields.forEach(field => {
      initialValuesToUpdate[field.key] = field.value || '';
    });
    setValuesToUpdate(initialValuesToUpdate);
  }, [setSecretValues, setValuesToUpdate]); // Dependencies are stable setters

  // Fetch values when editing starts
  useEffect(() => {
    const loadSecretValues = async () => {
      if (isEditing && secret?.id) {
        setLoadingValues(true);
        setError(null); // Clear previous errors
        try {
          const secretWithValues = await getSecretWithValues(secret.id);
          if (secretWithValues && secretWithValues.values) {
            const valueArray = Object.entries(secretWithValues.values).map(([key, value]) => ({
              id: uuidv4(),
              key,
              value,
              revealed: false,
              // Find placeholder from definitions based on the *initial* secret type
              placeholder: (SecretTypeFields[secret.type] || []).find(f => f.key === key)?.placeholder || 'Enter value'
            }));

            // Sort based on the *initial* secret type defined order
            valueArray.sort((a, b) => {
              const orderedFields = SecretTypeFields[secret.type] || []; // Use initial type for sorting fetched values
              const orderedKeys = orderedFields.map(field => field.key);
              const indexA = orderedKeys.indexOf(a.key);
              const indexB = orderedKeys.indexOf(b.key);
              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
              if (indexA !== -1) return -1;
              if (indexB !== -1) return 1;
              return a.key.localeCompare(b.key);
            });

            setSecretValues(valueArray.length ? valueArray : [{ id: uuidv4(), key: '', value: '', revealed: false, placeholder: 'Enter value'}]);

            // Initialize values to update with fetched values
            setValuesToUpdate(secretWithValues.values || {});
          } else {
             // If fetch returns no values, set default fields for the secret's type
             setDefaultFieldsForType(secret.type);
          }
        } catch (err) {
          setError('Failed to load secret values. Please try again.');
           // Optionally set default fields on error too
           setDefaultFieldsForType(secret.type);
        } finally {
          setLoadingValues(false);
        }
      }
    };

    loadSecretValues();
  }, [isEditing, secret?.id, secret?.type, getSecretWithValues, setDefaultFieldsForType]); // Fetch when secret ID/type changes

  // Set default fields when type changes during *creation*
  useEffect(() => {
    if (!isEditing) {
      setDefaultFieldsForType(formData.type);
    }
  }, [isEditing, formData.type, setDefaultFieldsForType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If the type is changed *while editing*, reset the fields to match the new type
    if (name === 'type' && isEditing) {
        setDefaultFieldsForType(value);
    }
  };

  // Handle changes to secret value fields
  const handleValueChange = (id, field, value) => {
    setSecretValues(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));

    // Update the values to be sent to the API
    if (field === 'key' || field === 'value') {
      setSecretValues(prev => {
        const updatedValues = prev.map(item => item.id === id ? { ...item, [field]: value } : item);

        // Create an object of key-value pairs
        const valuesObj = {};
        updatedValues.forEach(item => {
          if (item.key) {
            valuesObj[item.key] = item.value;
          }
        });

        setValuesToUpdate(valuesObj);
        return updatedValues;
      });
    }
  };

  // Add a new key-value pair
  const addKeyValuePair = () => {
    setSecretValues(prev => [
      ...prev,
      { id: uuidv4(), key: '', value: '', revealed: false }
    ]);
  };

  // Remove a key-value pair
  const removeKeyValuePair = (id) => {
    setSecretValues(prev => {
      const filtered = prev.filter(item => item.id !== id);

      // Update valuesToUpdate
      const valuesObj = {};
      filtered.forEach(item => {
        if (item.key) {
          valuesObj[item.key] = item.value;
        }
      });
      setValuesToUpdate(valuesObj);

      // If all rows removed, add an empty one
      return filtered.length ? filtered : [{
        id: uuidv4(), key: '', value: '', revealed: false
      }];
    });
  };

  // Toggle password visibility
  const toggleReveal = (id) => {
    setSecretValues(prev => prev.map(item =>
      item.id === id ? { ...item, revealed: !item.revealed } : item
    ));
  };

  // Copy value to clipboard
  const copyToClipboard = (value) => {
    navigator.clipboard.writeText(value)
      .then(() => {
        setSuccessMessage('Copied to clipboard!');
        setTimeout(() => setSuccessMessage(''), 2000);
      })
      .catch(err => {
        setError('Failed to copy to clipboard');
        setTimeout(() => setError(null), 2000);
      });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!formData.name) {
      setError('Name is required');
      return;
    }

    // Validate at least one key-value pair with both key and value
    const hasValidValue = secretValues.some(item => item.key && item.value);
    if (!hasValidValue) {
      setError('At least one secret key-value pair is required');
      return;
    }

    try {
      // Prepare form data for submission - handle empty expires_at
      const submissionData = {
        ...formData,
        expires_at: formData.expires_at || null // Convert empty string to null
      };

      if (isEditing) {
        // Update secret metadata
        await updateSecret(secret.id, submissionData);

        // Update secret values
        await updateSecretValues(secret.id, valuesToUpdate);
      } else {
        // Create new secret with values
        await createSecret({
          ...submissionData,
          values: valuesToUpdate
        });
      }

      // Close modal and refresh list
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Error saving secret:', err);
      setError(err.message || 'An error occurred. Please try again.');
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isEditing ? 'Edit Test Credential' : 'Create New Test Credential'}
              </h3>
              <button
                onClick={onClose}
                className="rounded-full p-1 hover:bg-gray-200 focus:outline-none"
              >
                <HiX className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {error && (
              <div className="mt-3 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <HiExclamationCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mt-3 bg-green-50 border-l-4 border-green-400 p-4">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4">
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="2"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Test Credential Type *
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value={SecretTypes.USERNAME_PASSWORD}>Username/Password</option>
                  <option value={SecretTypes.OAUTH_CREDENTIAL}>OAuth Credentials</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700">
                  Expiration Date (optional)
                </label>
                <input
                  type="date"
                  id="expires_at"
                  name="expires_at"
                  value={formData.expires_at}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Test Credential Values *
                  </label>
                  {formData.type === SecretTypes.OTHER && (
                    <button
                      type="button"
                      onClick={addKeyValuePair}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Value
                    </button>
                  )}
                </div>

                {loadingValues ? (
                  <div className="py-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"></div>
                    <p className="mt-2 text-xs text-gray-500">Loading values...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {secretValues.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={item.key}
                          onChange={(e) => handleValueChange(item.id, 'key', e.target.value)}
                          className="w-1/3 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          readOnly={formData.type !== SecretTypes.OTHER}
                          disabled={formData.type !== SecretTypes.OTHER}
                        />
                        <div className="relative flex-1">
                          {/* Conditional rendering for OAuth provider */}
                          {formData.type === SecretTypes.OAUTH_CREDENTIAL && item.key === SecretFieldKeys.PROVIDER ? (
                            <select
                              value={item.value}
                              onChange={(e) => handleValueChange(item.id, 'value', e.target.value)}
                              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="">Select Provider</option>
                              {/* Map over OAuthProviders to generate options */}
                              {Object.entries(OAuthProviders).map(([key, providerName]) => (
                                <option key={key} value={providerName}>{providerName}</option>
                              ))}
                            </select>
                          ) : (
                            // Original input for other fields or types
                            <>
                              <input
                                type={item.revealed ? 'text' : 'password'}
                                placeholder={item.placeholder || 'Enter value'}
                                value={item.value}
                                onChange={(e) => handleValueChange(item.id, 'value', e.target.value)}
                                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-16 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                <button
                                  type="button"
                                  onClick={() => toggleReveal(item.id)}
                                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                  {item.revealed ? (
                                    <HiEyeOff className="h-4 w-4" />
                                  ) : (
                                    <HiEye className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(item.value)}
                                  className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                                  disabled={!item.value}
                                >
                                  <HiClipboardCopy className="h-4 w-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        {formData.type === SecretTypes.OTHER && (
                          <button
                            type="button"
                            onClick={() => removeKeyValuePair(item.id)}
                            className="text-red-500 hover:text-red-700 focus:outline-none"
                          >
                            <HiX className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || loadingValues}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Test Credential' : 'Create Test Credential'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecretModal;
