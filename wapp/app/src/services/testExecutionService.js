import axios from 'axios';
import { API_URL } from '@/constants/api';

/**
 * Get all executions for a specific test
 *
 * @param {string} testId - The UUID of the test
 * @returns {Promise<Array>} Promise with the test executions data
 */
export const getTestExecutions = async (testId) => {
  try {
    const response = await axios.get(`${API_URL}/test-executions/by-test/${testId}`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching test executions for test ${testId}:`, error);
    throw error;
  }
};

/**
 * Get a specific test execution by ID
 *
 * @param {string} executionId - The UUID of the test execution
 * @returns {Promise<Object>} Promise with the test execution data
 */
export const getTestExecution = async (executionId) => {
  try {
    const response = await axios.get(`${API_URL}/test-executions/${executionId}`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching test execution ${executionId}:`, error);
    throw error;
  }
};

/**
 * Create a new test execution
 *
 * @param {Object} executionData - The test execution data
 * @param {string} executionData.test_id - ID of the test this execution is for
 * @param {string} executionData.status - Initial status of the execution
 * @param {string} executionData.environment - Environment where test is being run
 * @param {string} executionData.executor_type - Type of executor (MANUAL, AUTOMATED, etc)
 * @param {string} [executionData.executor_name] - Optional name of the executor
 * @param {string} [executionData.notes] - Optional notes about the execution
 * @param {Array} [executionData.evidence] - Optional list of evidence URLs
 * @param {boolean} [executionData.run_without_cache] - Optional flag to run test without cache
 * @returns {Promise<Object>} Promise with the created test execution data
 */
export const createTestExecution = async (executionData) => {
  try {
    const payload = { ...executionData }; // Clone to avoid modifying original object if it's passed around
    // The backend expects run_without_cache to be explicitly false if not true.
    // If undefined, set it to false. If true, it will be passed as true.
    if (payload.run_without_cache === undefined || payload.run_without_cache === null) {
      payload.run_without_cache = false;
    }

    const response = await axios.post(`${API_URL}/test-executions/`, payload, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error creating test execution:', error);
    throw error;
  }
};

/**
 * Update a test execution
 *
 * @param {string} executionId - The UUID of the test execution to update
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object>} Promise with the updated test execution data
 */
export const updateTestExecution = async (executionId, updateData) => {
  try {
    const response = await axios.put(`${API_URL}/test-executions/${executionId}`, updateData, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating test execution ${executionId}:`, error);
    throw error;
  }
};

// New function to fetch latest executions for multiple tests
export const getLatestTestExecutions = async (testIds) => {
  if (!testIds || testIds.length === 0) {
    return {}; // Return empty object if no IDs are provided
  }
  try {
    const response = await axios.post(
      `${API_URL}/test-executions/latest/`,
      { test_ids: testIds },
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching latest test executions:', error);
    throw error;
  }
};
