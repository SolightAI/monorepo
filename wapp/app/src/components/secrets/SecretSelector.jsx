import React, { useState, useEffect } from 'react';
import { useSecret } from '../../context/SecretContext';
import { HiKey, HiEye, HiEyeOff, HiSelector, HiX } from 'react-icons/hi';

const SecretSelector = ({
  onSecretSelect,
  selectedSecretIds = [],
  secretType = null,
  label = "Select Secrets",
  placeholder = "Choose secrets...",
  className = "",
  multiple = false
}) => {
  const {
    secrets,
    fetchSecrets,
    getSecretWithValues,
    loading
  } = useSecret();

  const [isOpen, setIsOpen] = useState(false);
  const [filteredSecrets, setFilteredSecrets] = useState([]);
  const [selectedSecrets, setSelectedSecrets] = useState([]);
  const [revealValues, setRevealValues] = useState(false);
  const [secretsValues, setSecretsValues] = useState({});
  const [loadingValues, setLoadingValues] = useState(false);

  // Filter secrets by type if provided
  useEffect(() => {
    if (secretType) {
      setFilteredSecrets(secrets.filter(secret => secret.type === secretType));
    } else {
      setFilteredSecrets(secrets);
    }
  }, [secrets, secretType]);

  // Load secrets on component mount
  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  // Find selected secrets in list
  useEffect(() => {
    if (selectedSecretIds && selectedSecretIds.length > 0) {
      const found = secrets.filter(s => selectedSecretIds.includes(s.id));
      setSelectedSecrets(found);

      // Load values for all selected secrets
      Promise.all(found.map(s => loadSecretValues(s.id)));
    } else {
      setSelectedSecrets([]);
      setSecretsValues({});
    }
  }, [selectedSecretIds, secrets]);

  // Load secret values
  const loadSecretValues = async (secretId) => {
    setLoadingValues(true);
    try {
      const secretWithValues = await getSecretWithValues(secretId);
      if (secretWithValues && secretWithValues.values) {
        setSecretsValues(prev => ({
          ...prev,
          [secretId]: secretWithValues.values
        }));
      }
    } catch (err) {
      console.error('Error loading secret values:', err);
    } finally {
      setLoadingValues(false);
    }
  };

  // Handle secret selection
  const handleSelectSecret = async (secret) => {
    if (multiple) {
      // For multiple selection mode
      if (selectedSecrets.some(s => s.id === secret.id)) {
        // If already selected, remove it
        setSelectedSecrets(selectedSecrets.filter(s => s.id !== secret.id));

        // Update secretsValues
        const updatedValues = { ...secretsValues };
        delete updatedValues[secret.id];
        setSecretsValues(updatedValues);

        // Notify parent component
        if (onSecretSelect) {
          const updatedIds = selectedSecrets
            .filter(s => s.id !== secret.id)
            .map(s => s.id);
          onSecretSelect(updatedIds, selectedSecrets.filter(s => s.id !== secret.id));
        }
      } else {
        // If not selected, add it
        const updatedSecrets = [...selectedSecrets, secret];
        setSelectedSecrets(updatedSecrets);

        // Load secret values
        await loadSecretValues(secret.id);

        // Notify parent component
        if (onSecretSelect) {
          const updatedIds = updatedSecrets.map(s => s.id);
          onSecretSelect(updatedIds, updatedSecrets);
        }
      }
    } else {
      // For single selection mode
      setSelectedSecrets([secret]);
      setIsOpen(false);

      // Load secret values
      await loadSecretValues(secret.id);

      // Notify parent component
      if (onSecretSelect) {
        onSecretSelect(secret.id, secret);
      }
    }
  };

  // Toggle reveal values
  const toggleRevealValues = () => {
    setRevealValues(!revealValues);
  };

  // Get the secret type display text
  const getSecretTypeDisplay = (type) => {
    const typeMap = {
      'username_password': 'Credentials',
      'api_key': 'API Key',
      'environment_variable': 'Environment Variable',
      'connection_string': 'Connection String',
      'oauth_credential': 'OAuth Credentials',
      'other': 'Other'
    };
    return typeMap[type] || type;
  };

  // Remove a selected secret (for multiple mode)
  const removeSelectedSecret = (secretId) => {
    setSelectedSecrets(selectedSecrets.filter(s => s.id !== secretId));

    // Update secretsValues
    const updatedValues = { ...secretsValues };
    delete updatedValues[secretId];
    setSecretsValues(updatedValues);

    // Notify parent component
    if (onSecretSelect) {
      const updatedSecrets = selectedSecrets.filter(s => s.id !== secretId);
      const updatedIds = updatedSecrets.map(s => s.id);
      onSecretSelect(updatedIds, updatedSecrets);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      {/* Dropdown button */}
      <div
        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3
                 bg-white text-left cursor-pointer focus:outline-none focus:ring-1
                 focus:ring-blue-500 focus:border-blue-500 relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedSecrets.length === 0 ? (
          <div className="text-gray-400">{placeholder}</div>
        ) : multiple ? (
          <div className="flex flex-wrap gap-1">
            {selectedSecrets.map(secret => (
              <span
                key={secret.id}
                className="bg-gray-100 text-gray-800 px-2 py-1 text-sm rounded-md flex items-center"
              >
                <HiKey className="mr-1 text-gray-500" />
                {secret.name}
                <button
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSelectedSecret(secret.id);
                  }}
                >
                  <HiX />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center">
            <HiKey className="mr-2 text-gray-500" />
            <span>{selectedSecrets[0]?.name}</span>
          </div>
        )}

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <HiSelector className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md
                       border border-gray-200 max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredSecrets.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No secrets found</div>
          ) : (
            <ul className="py-1">
              {filteredSecrets.map(secret => (
                <li
                  key={secret.id}
                  className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between
                            ${multiple && selectedSecrets.some(s => s.id === secret.id) ? 'bg-blue-50' : ''}`}
                  onClick={() => handleSelectSecret(secret)}
                >
                  <div className="flex items-center">
                    <HiKey className="mr-2 text-gray-500" />
                    <div>
                      <div className="font-medium">{secret.name}</div>
                      <div className="text-xs text-gray-500">
                        {getSecretTypeDisplay(secret.type)}
                      </div>
                    </div>
                  </div>

                  {multiple && selectedSecrets.some(s => s.id === secret.id) && (
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Display selected secret values */}
      {selectedSecrets.length > 0 && (
        <div className="mt-2 border rounded-md p-3 bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-gray-500">
              {multiple ? 'Selected Secrets' : 'Secret Values'}
            </div>
            <button
              type="button"
              onClick={toggleRevealValues}
              className="flex items-center text-xs text-blue-600 hover:text-blue-800"
            >
              {revealValues ? (
                <>
                  <HiEyeOff className="mr-1" /> Hide Values
                </>
              ) : (
                <>
                  <HiEye className="mr-1" /> Show Values
                </>
              )}
            </button>
          </div>

          {loadingValues ? (
            <div className="text-center text-gray-500 text-sm py-2">Loading values...</div>
          ) : (
            <div className="space-y-3">
              {selectedSecrets.map(secret => (
                <div key={secret.id} className="border-t pt-2">
                  <div className="text-sm font-medium mb-1">
                    {secret.name} ({getSecretTypeDisplay(secret.type)})
                  </div>
                  {secretsValues[secret.id] ? (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(secretsValues[secret.id]).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-medium">{key}:</span>{' '}
                          <span className="font-mono">
                            {revealValues ? value : '•'.repeat(Math.min(8, value.length))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No values available</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SecretSelector;
