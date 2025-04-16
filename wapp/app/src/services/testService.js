import axios from 'axios';
import { API_URL } from '@/constants/api';

/**
 * Get all tests
 * @returns {Promise<Array>} Promise with all tests data
 */
export const getAllTests = async () => {
  try {
    const response = await axios.get(`${API_URL}/tests/`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching all tests:', error);
    throw error;
  }
};

/**
 * Get tests by feature ID
 * @param {string} featureId - The UUID of the feature
 * @returns {Promise<Array>} Promise with tests data for the feature
 */
export const getTestsByFeature = async (featureId) => {
  try {
    const response = await axios.get(`${API_URL}/tests/by-feature/${featureId}`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching tests for feature ${featureId}:`, error);
    throw error;
  }
};

/**
 * Get tests by epic ID
 * @param {string} epicId - The UUID of the epic
 * @returns {Promise<Array>} Promise with tests data for all features in the epic
 */
export const getTestsByEpic = async (epicId) => {
  try {
    // Get the epic with its features
    const epicResponse = await axios.get(`${API_URL}/epics/${epicId}`, {
      withCredentials: true
    });

    // If there are no features, return empty array
    if (!epicResponse.data.features || epicResponse.data.features.length === 0) {
      return [];
    }

    // Get tests for each feature in the epic and combine them
    const featurePromises = epicResponse.data.features.map(feature =>
      getTestsByFeature(feature.id)
    );

    const featuresTestsArrays = await Promise.all(featurePromises);

    // Flatten the array of arrays into a single array of tests
    return featuresTestsArrays.flat();
  } catch (error) {
    console.error(`Error fetching tests for epic ${epicId}:`, error);
    throw error;
  }
};

/**
 * Trigger test generation for an acceptance criteria
 * @param {string} acceptanceCriteriaId - The UUID of the acceptance criteria
 * @returns {Promise<string>} Promise with the task ID (UUID)
 */
export const triggerTestGeneration = async (acceptanceCriteriaId) => {
  try {
    const response = await axios.post(
      `${API_URL}/tests/generate?acceptance_criteria_id=${acceptanceCriteriaId}`,
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error(`Error triggering test generation for acceptance criteria ${acceptanceCriteriaId}:`, error);
    throw error;
  }
};

/**
 * Trigger test generation for a feature
 * @param {string} featureId - The UUID of the feature
 * @returns {Promise<string>} Promise with the task ID (UUID)
 */
export const triggerFeatureTestGeneration = async (featureId) => {
  try {
    const response = await axios.post(
      `${API_URL}/tests/generate?feature_id=${featureId}`,
      {},
      { withCredentials: true }
    );
    return response.data.task_id;
  } catch (error) {
    console.error(`Error triggering test generation for feature ${featureId}:`, error);
    throw error;
  }
};

/**
 * Check the status of a test generation task
 * @param {string} taskId - The task ID (UUID)
 * @returns {Promise<object>} Promise with the task status data
 */
export const getTestGenerationStatus = async (taskId) => {
  try {
    const response = await axios.get(`${API_URL}/tests/generate/status/${taskId}`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error(`Error checking test generation status for task ${taskId}:`, error);
    throw error;
  }
};

/**
 * Get tests by product ID
 * @param {string} productId - The UUID of the product
 * @returns {Promise<Array>} Promise with tests data for the product
 */
export const getTestsByProduct = async (productId) => {
  try {
    const response = await axios.get(`${API_URL}/tests/by-product/${productId}`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching tests for product ${productId}:`, error);
    throw error;
  }
};

/**
 * Delete a test by ID
 * @param {string} testId - The UUID of the test to delete
 * @returns {Promise<void>} Promise that resolves when the test is deleted
 */
export const deleteTest = async (testId) => {
  try {
    await axios.delete(`${API_URL}/tests/${testId}`, {
      withCredentials: true
    });
    return true;
  } catch (error) {
    console.error(`Error deleting test ${testId}:`, error);
    throw error;
  }
};

/**
 * Update a test by ID
 * @param {string} testId - The UUID of the test to update
 * @param {object} testData - The test data to update
 * @returns {Promise<object>} Promise that resolves with the updated test
 */
export const updateTest = async (testId, testData) => {
  try {
    const response = await axios.put(
      `${API_URL}/tests/${testId}`,
      testData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating test ${testId}:`, error);
    throw error;
  }
};
