import axios from 'axios';
import { API_URL } from '@/constants/api';

/**
 * Get all features
 * @returns {Promise<Array>} Promise with all features data
 */
export const getAllFeatures = async () => {
  try {
    const response = await axios.get(`${API_URL}/features/`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching all features:', error);
    throw error;
  }
};

/**
 * Get epics for a specific product
 * @param {string} productId - The UUID of the product
 * @param {string} organizationId - The UUID of the organization
 * @returns {Promise<Array>} Promise with epics data for the specified product
 */
export const getAllEpics = async (productId, organizationId) => {
  try {
    if (!productId || !organizationId) {
      console.error('Product ID and Organization ID are required');
      return [];
    }

    // Get the specific product by ID, which includes its epics
    const response = await axios.get(
      `${API_URL}/products/${productId}?organization_id=${organizationId}`,
      {
        withCredentials: true
      }
    );

    // Extract and format epics from the product
    const epics = response.data.epics || [];

    // Add product reference to each epic for context
    return epics.map(epic => ({
      ...epic,
      product_name: response.data.name
    }));
  } catch (error) {
    console.error(`Error fetching epics for product ${productId}:`, error);
    throw error;
  }
};

/**
 * Get features by epic ID
 * @param {string} epicId - The UUID of the epic
 * @returns {Promise<Array>} Promise with features data for the epic
 */
export const getFeaturesByEpic = async (epicId) => {
  try {
    // Get the specific epic by ID, which includes its features
    const response = await axios.get(`${API_URL}/epics/${epicId}`, {
      withCredentials: true
    });

    // Return the features from the epic
    return response.data.features || [];
  } catch (error) {
    console.error(`Error fetching features for epic ${epicId}:`, error);
    throw error;
  }
};
