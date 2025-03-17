import axios from 'axios';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Get all bugs
 * @returns {Promise} Promise with the bugs data
 */
export const getAllBugs = async () => {
  try {
    const response = await axios.get(`${API_URL}/bugs/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching bugs:', error);
    throw error;
  }
};

/**
 * Get bugs for a specific test
 * @param {string} testId - The test ID
 * @returns {Promise} Promise with the bugs data
 */
export const getBugsByTest = async (testId) => {
  try {
    // This endpoint may need to be implemented in the backend
    const response = await axios.get(`${API_URL}/bugs/by-test/${testId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching bugs for test ${testId}:`, error);
    throw error;
  }
};

/**
 * Get bugs for a specific product
 * @param {string} productPath - The product path
 * @returns {Promise} Promise with the bugs data
 */
export const getBugsByProductPath = async (productPath) => {
  try {
    const response = await axios.get(`${API_URL}/bugs/by-product-path/${productPath}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching bugs for product ${productPath}:`, error);
    throw error;
  }
};

/**
 * Create a new bug
 * @param {Object} bugData - The bug data
 * @param {string} bugData.test_id - ID of the test this bug is associated with
 * @param {string} bugData.name - Bug name
 * @param {string} bugData.description - Bug description
 * @param {string} bugData.severity - Bug severity (Critical, High, Medium, Low)
 * @param {string} bugData.url - URL to the bug
 * @param {Array} bugData.screenshots - Optional list of screenshot URLs
 * @returns {Promise} Promise with the created bug data
 */
export const createBug = async (bugData) => {
  try {
    // Add current timestamp and default status if not provided
    const bugWithDefaults = {
      ...bugData,
      status: bugData.status || 'OPEN',
      detected_at: bugData.detected_at || new Date().toISOString()
    };

    const response = await axios.post(`${API_URL}/bugs/`, bugWithDefaults);
    return response.data;
  } catch (error) {
    console.error('Error creating bug:', error);
    throw error;
  }
};

/**
 * Delete a bug
 * @param {string} bugId - The bug ID
 * @returns {Promise} Promise with the operation result
 */
export const deleteBug = async (bugId) => {
  try {
    const response = await axios.delete(`${API_URL}/bugs/${bugId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting bug ${bugId}:`, error);
    throw error;
  }
};
