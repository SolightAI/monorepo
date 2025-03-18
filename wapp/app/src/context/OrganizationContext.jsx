import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL;

const OrganizationContext = createContext();

export const useOrganization = () => useContext(OrganizationContext);

export const OrganizationProvider = ({ children }) => {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Memoize fetchOrganizations to prevent re-renders
  const fetchOrganizations = useCallback(async () => {
    // Don't try to fetch organizations on login, register or create organization pages
    if (
      location.pathname.includes('/login') ||
      location.pathname.includes('/register') ||
      location.pathname.includes('/organization/create') ||
      location.pathname.includes('/join-organization/') ||
      location.pathname.includes('/auth/google/callback')
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/organizations/`, {
        withCredentials: true
      });

      setOrganizations(response.data);

      // Handle case where user has no organizations
      if (response.data.length === 0) {
        console.log('User has no organizations, redirecting to create page');

        // Only redirect if we're not already on the create page to avoid loops
        if (!location.pathname.includes('/organization/create')) {
          navigate('/organization/create');
        }

        setLoading(false);
        return;
      }

      // Set selected organization from local storage or default to first organization
      const storedOrganizationId = localStorage.getItem('selectedOrganizationId');
      if (storedOrganizationId && response.data.length > 0) {
        const foundOrganization = response.data.find(org => org.id === storedOrganizationId);
        if (foundOrganization) {
          setSelectedOrganization(foundOrganization);
        } else {
          // If stored organization not found in results, use first organization
          setSelectedOrganization(response.data[0]);
          localStorage.setItem('selectedOrganizationId', response.data[0].id);
        }
      } else if (response.data.length > 0) {
        // Default to first organization if none stored
        setSelectedOrganization(response.data[0]);
        localStorage.setItem('selectedOrganizationId', response.data[0].id);
      }
    } catch (err) {
      // Check if it's an authentication error (401)
      if (err.response && err.response.status === 401) {
        console.log('Authentication error when fetching organizations');
        // Don't set error here, let the axios interceptor handle the redirect
      } else {
        setError('Failed to fetch organizations');
        console.error('Error fetching organizations:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [location.pathname, navigate]);

  // Fetch organizations on component mount
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Function to select an organization
  const selectOrganization = useCallback((organization) => {
    setSelectedOrganization(organization);
    localStorage.setItem('selectedOrganizationId', organization.id);
  }, []);

  // Function to create a new organization
  const createOrganization = useCallback(async (organizationData) => {
    try {
      const response = await axios.post(`${API_URL}/organizations/`, organizationData, {
        withCredentials: true
      });
      // Refresh organizations list after creating a new one
      await fetchOrganizations();
      return response.data;
    } catch (err) {
      console.error('Error creating organization:', err);
      throw err;
    }
  }, [fetchOrganizations]);

  // Function to update an organization
  const updateOrganization = useCallback(async (id, organizationData) => {
    try {
      const response = await axios.put(`${API_URL}/organizations/${id}`, organizationData, {
        withCredentials: true
      });
      // Refresh organizations list after updating
      await fetchOrganizations();
      return response.data;
    } catch (err) {
      console.error('Error updating organization:', err);
      throw err;
    }
  }, [fetchOrganizations]);

  // Function to delete an organization
  const deleteOrganization = useCallback(async (id) => {
    try {
      await axios.delete(`${API_URL}/organizations/${id}`, {
        withCredentials: true
      });
      // Refresh organizations list after deleting
      await fetchOrganizations();
      return true;
    } catch (err) {
      console.error('Error deleting organization:', err);
      throw err;
    }
  }, [fetchOrganizations]);

  // Function to fetch organization members
  const fetchOrganizationMembers = useCallback(async (organizationId) => {
    try {
      const response = await axios.get(`${API_URL}/organizations/${organizationId}/members`, {
        withCredentials: true
      });
      return response.data.members || [];
    } catch (err) {
      console.error('Error fetching organization members:', err);
      throw err;
    }
  }, []);

  // Function to add a member to an organization
  const addOrganizationMember = useCallback(async (organizationId, memberData) => {
    try {
      const response = await axios.post(`${API_URL}/organizations/${organizationId}/members`, memberData, {
        withCredentials: true
      });
      return response.data;
    } catch (err) {
      console.error('Error adding organization member:', err);
      throw err;
    }
  }, []);

  // Function to update a member's role
  const updateMemberRole = useCallback(async (organizationId, userId, roleData) => {
    try {
      const response = await axios.put(`${API_URL}/organizations/${organizationId}/members/${userId}`, roleData, {
        withCredentials: true
      });
      return response.data;
    } catch (err) {
      console.error('Error updating member role:', err);
      throw err;
    }
  }, []);

  // Function to remove a member from an organization
  const removeOrganizationMember = useCallback(async (organizationId, userId) => {
    try {
      await axios.delete(`${API_URL}/organizations/${organizationId}/members/${userId}`, {
        withCredentials: true
      });
      return true;
    } catch (err) {
      console.error('Error removing organization member:', err);
      throw err;
    }
  }, []);

  // Force refresh of organizations data
  const refreshOrganizations = useCallback(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        selectedOrganization,
        selectOrganization,
        loading,
        error,
        refreshOrganizations,
        createOrganization,
        updateOrganization,
        deleteOrganization,
        fetchOrganizationMembers,
        addOrganizationMember,
        updateMemberRole,
        removeOrganizationMember
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export default OrganizationContext;
