import axios from 'axios';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

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
