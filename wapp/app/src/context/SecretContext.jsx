import React, { createContext, useState, useContext, useCallback } from 'react';
import axios from 'axios';
import { useOrganization } from './OrganizationContext';
import { useProduct } from './ProductContext';
import { API_URL } from '@/constants/api';

const SecretContext = createContext();

export const useSecret = () => useContext(SecretContext);

export const SecretProvider = ({ children }) => {
  const [secrets, setSecrets] = useState([]);
  const [selectedSecret, setSelectedSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { selectedOrganization } = useOrganization();
  const { selectedProduct } = useProduct();

  // Fetch secrets for the current organization/product
  const fetchSecrets = useCallback(async () => {
    if (!selectedOrganization) return;

    setLoading(true);
    setError(null);

    try {
      let url = `${API_URL}/secrets?organization_id=${selectedOrganization.id}`;

      // Add product filter if a product is selected
      if (selectedProduct) {
        url += `&product_id=${selectedProduct.id}`;
      }

      const response = await axios.get(url, { withCredentials: true });
      setSecrets(response.data);

      // Clear selected secret if it's no longer in the list
      if (selectedSecret && !response.data.some(s => s.id === selectedSecret.id)) {
        setSelectedSecret(null);
      }
    } catch (err) {
      console.error('Error fetching secrets:', err);
      setError('Failed to load secrets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedOrganization, selectedProduct, selectedSecret]);

  // Get a secret with its values
  const getSecretWithValues = useCallback(async (secretId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/secrets/${secretId}/values`, {
        withCredentials: true
      });
      return response.data;
    } catch (err) {
      console.error('Error fetching secret values:', err);
      setError('Failed to load secret values. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new secret
  const createSecret = useCallback(async (secretData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/secrets`, secretData, {
        withCredentials: true
      });

      // Refresh the secrets list
      await fetchSecrets();
      return response.data;
    } catch (err) {
      console.error('Error creating secret:', err);
      setError(err.response?.data?.detail || 'Failed to create secret. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchSecrets]);

  // Update a secret's metadata
  const updateSecret = useCallback(async (secretId, secretData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.put(`${API_URL}/secrets/${secretId}`, secretData, {
        withCredentials: true
      });

      // Refresh the secrets list
      await fetchSecrets();
      return response.data;
    } catch (err) {
      console.error('Error updating secret:', err);
      setError(err.response?.data?.detail || 'Failed to update secret. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchSecrets]);

  // Update a secret's values
  const updateSecretValues = useCallback(async (secretId, values) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.put(`${API_URL}/secrets/${secretId}/values`, values, {
        withCredentials: true
      });

      return response.data;
    } catch (err) {
      console.error('Error updating secret values:', err);
      setError(err.response?.data?.detail || 'Failed to update secret values. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a secret
  const deleteSecret = useCallback(async (secretId) => {
    setLoading(true);
    setError(null);

    try {
      await axios.delete(`${API_URL}/secrets/${secretId}`, {
        withCredentials: true
      });

      // Refresh the secrets list
      await fetchSecrets();

      // Clear selected secret if it was deleted
      if (selectedSecret && selectedSecret.id === secretId) {
        setSelectedSecret(null);
      }

      return true;
    } catch (err) {
      console.error('Error deleting secret:', err);
      setError(err.response?.data?.detail || 'Failed to delete secret. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchSecrets, selectedSecret]);

  // Get secret access logs
  const getSecretAccessLogs = useCallback(async (secretId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/secrets/${secretId}/access-logs`, {
        withCredentials: true
      });
      return response.data;
    } catch (err) {
      console.error('Error fetching secret access logs:', err);
      setError('Failed to load access logs. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Select a secret
  const selectSecret = useCallback((secret) => {
    setSelectedSecret(secret);
  }, []);

  // Clear selected secret
  const clearSelectedSecret = useCallback(() => {
    setSelectedSecret(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <SecretContext.Provider
      value={{
        secrets,
        selectedSecret,
        loading,
        error,
        fetchSecrets,
        getSecretWithValues,
        createSecret,
        updateSecret,
        updateSecretValues,
        deleteSecret,
        getSecretAccessLogs,
        selectSecret,
        clearSelectedSecret,
        clearError
      }}
    >
      {children}
    </SecretContext.Provider>
  );
};

export default SecretContext;
