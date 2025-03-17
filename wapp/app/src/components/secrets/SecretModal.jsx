import React, { useState, useEffect } from 'react';
import { useSecret } from '../../context/SecretContext';
import { useOrganization } from '../../context/OrganizationContext';
import { useProduct } from '../../context/ProductContext';
import { HiX, HiEye, HiEyeOff, HiClipboardCopy, HiExclamationCircle } from 'react-icons/hi';
import { v4 as uuidv4 } from 'uuid';

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

  // Form state
  const [formData, setFormData] = useState({
    name: 'Username/Password Credentials', // Default name for the default type
    description: '',
    type: 'username_password', // Default type
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

  // Load existing secret data when editing
  useEffect(() => {
    const loadSecretData = async () => {
      if (isEditing && secret) {
        // Set basic secret data
        setFormData({
          name: secret.name,
          description: secret.description || '',
          type: secret.type,
          expires_at: secret.expires_at ? new Date(secret.expires_at).toISOString().split('T')[0] : '',
          organization_id: secret.organization_id,
          product_id: secret.product_id || selectedProduct?.id,
        });

        // Fetch secret values
        setLoadingValues(true);
        try {
          const secretWithValues = await getSecretWithValues(secret.id);
          if (secretWithValues && secretWithValues.values) {
            // Create an array of key-value pairs from the values object
            const valueArray = Object.entries(secretWithValues.values).map(([key, value]) => ({
              id: uuidv4(),
              key,
              value,
              revealed: false
            }));

            // If no values, add an empty row
            setSecretValues(valueArray.length ? valueArray : [{
              id: uuidv4(), key: '', value: '', revealed: false
            }]);

            // Initialize values to update
            const initialValues = {};
            Object.entries(secretWithValues.values).forEach(([key, value]) => {
              initialValues[key] = value;
            });
            setValuesToUpdate(initialValues);
          }
        } catch (err) {
          setError('Failed to load secret values. Please try again.');
        } finally {
          setLoadingValues(false);
        }
      } else if (!isEditing) {
        // For new secrets, set default fields based on the selected type
        setDefaultFieldsForType(formData.type);
      }
    };

    loadSecretData();
  }, [isEditing, secret, getSecretWithValues, selectedProduct, formData.type]);

  // Handle input changes for basic form fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // If changing secret type, update the name with a default suggestion
    // and set the appropriate default fields
    if (name === 'type') {
      const typeToNameMap = {
        'username_password': 'Username/Password Credentials',
        'api_key': 'API Key',
        'environment_variable': 'Environment Variables',
        'connection_string': 'Connection String',
        'oauth_credential': 'OAuth Credentials',
        'other': 'Custom Secret'
      };

      // Always update the type
      setFormData(prev => {
        // If the user has not manually changed the name from a default,
        // or if the name is empty, suggest a new name based on the type
        if (!prev.name ||
            prev.name === 'Username/Password Credentials' ||
            prev.name === 'API Key' ||
            prev.name === 'Environment Variables' ||
            prev.name === 'Connection String' ||
            prev.name === 'OAuth Credentials' ||
            prev.name === 'Custom Secret') {
          // Update type and suggest appropriate name
          return {
            ...prev,
            [name]: value,
            name: typeToNameMap[value]
          };
        } else {
          // Just update the type, keep the custom name
          return {
            ...prev,
            [name]: value
          };
        }
      });

      // Set default fields for the selected type
      setDefaultFieldsForType(value);
    } else {
      // For other field changes, just update normally
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Set default fields based on secret type
  const setDefaultFieldsForType = (type) => {
    if (type === 'username_password') {
      // Set username and password fields only
      setSecretValues([
        { id: uuidv4(), key: 'username', value: '', revealed: false },
        { id: uuidv4(), key: 'password', value: '', revealed: false }
      ]);

      // Update valuesToUpdate
      setValuesToUpdate({
        username: '',
        password: ''
      });
    } else if (type === 'api_key') {
      // Set API key fields with more context
      setSecretValues([
        { id: uuidv4(), key: 'api_key', value: '', revealed: false },
        { id: uuidv4(), key: 'api_url', value: '', revealed: false },
        { id: uuidv4(), key: 'header_name', value: 'Authorization', revealed: false }
      ]);

      // Update valuesToUpdate
      setValuesToUpdate({
        api_key: '',
        api_url: '',
        header_name: 'Authorization'
      });
    } else if (type === 'environment_variable') {
      // Set environment variable fields with descriptive names
      setSecretValues([
        { id: uuidv4(), key: 'DATABASE_URL', value: '', revealed: false },
        { id: uuidv4(), key: 'API_TOKEN', value: '', revealed: false },
        { id: uuidv4(), key: 'DEBUG_MODE', value: 'false', revealed: false }
      ]);

      // Update valuesToUpdate
      setValuesToUpdate({
        DATABASE_URL: '',
        API_TOKEN: '',
        DEBUG_MODE: 'false'
      });
    } else if (type === 'connection_string') {
      // Set connection string fields with different typical types
      setSecretValues([
        { id: uuidv4(), key: 'database_url', value: '', revealed: false },
        { id: uuidv4(), key: 'database_type', value: 'postgresql', revealed: false },
        { id: uuidv4(), key: 'ssl_mode', value: 'require', revealed: false }
      ]);

      // Update valuesToUpdate
      setValuesToUpdate({
        database_url: '',
        database_type: 'postgresql',
        ssl_mode: 'require'
      });
    } else if (type === 'oauth_credential') {
      // Set OAuth credential fields with additional useful fields
      setSecretValues([
        { id: uuidv4(), key: 'client_id', value: '', revealed: false },
        { id: uuidv4(), key: 'client_secret', value: '', revealed: false },
        { id: uuidv4(), key: 'redirect_uri', value: '', revealed: false },
        { id: uuidv4(), key: 'token_url', value: '', revealed: false },
        { id: uuidv4(), key: 'auth_url', value: '', revealed: false }
      ]);

      // Update valuesToUpdate
      setValuesToUpdate({
        client_id: '',
        client_secret: '',
        redirect_uri: '',
        token_url: '',
        auth_url: ''
      });
    } else {
      // For 'other' type, set a more useful example
      setSecretValues([
        { id: uuidv4(), key: 'service_name', value: '', revealed: false },
        { id: uuidv4(), key: 'credential_value', value: '', revealed: false }
      ]);

      // Update valuesToUpdate
      setValuesToUpdate({
        service_name: '',
        credential_value: ''
      });
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
                {isEditing ? 'Edit Secret' : 'Create New Secret'}
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
                  Secret Type *
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="username_password">Username/Password</option>
                  <option value="api_key">API Key</option>
                  <option value="environment_variable">Environment Variable</option>
                  <option value="connection_string">Connection String</option>
                  <option value="oauth_credential">OAuth Credentials</option>
                  <option value="other">Other</option>
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
                    Secret Values *
                  </label>
                  {formData.type === 'other' && (
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
                          readOnly={formData.type !== 'other'}
                          disabled={formData.type !== 'other'}
                        />
                        <div className="relative flex-1">
                          <input
                            type={item.revealed ? 'text' : 'password'}
                            placeholder={
                              // Username/Password fields
                              item.key === 'username' ? 'Enter username' :
                              item.key === 'password' ? 'Enter password' :

                              // API Key fields
                              item.key === 'api_key' ? 'Enter API key value' :
                              item.key === 'api_url' ? 'https://api.example.com/v1' :
                              item.key === 'header_name' ? 'Name of header (e.g., Authorization)' :

                              // Environment Variable fields
                              item.key === 'DATABASE_URL' ? 'postgresql://user:pass@localhost:5432/db' :
                              item.key === 'API_TOKEN' ? 'Enter API token value' :
                              item.key === 'DEBUG_MODE' ? 'true or false' :

                              // Connection String fields
                              item.key === 'database_url' ? 'postgresql://user:pass@localhost:5432/db' :
                              item.key === 'database_type' ? 'postgresql, mysql, mongodb, etc.' :
                              item.key === 'ssl_mode' ? 'require, prefer, disable, etc.' :

                              // OAuth credential fields
                              item.key === 'client_id' ? 'Enter OAuth client ID' :
                              item.key === 'client_secret' ? 'Enter OAuth client secret' :
                              item.key === 'redirect_uri' ? 'https://your-app.com/callback' :
                              item.key === 'token_url' ? 'https://provider.com/oauth/token' :
                              item.key === 'auth_url' ? 'https://provider.com/oauth/authorize' :

                              // Other type
                              item.key === 'service_name' ? 'Name of the service' :
                              item.key === 'credential_value' ? 'Enter credential value' :

                              // Default
                              'Enter value'
                            }
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
                        </div>
                        {formData.type === 'other' && (
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
                isEditing ? 'Update Secret' : 'Create Secret'
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
