import axios from 'axios';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Trigger full generation for a feature, epic, or product
 *
 * @param {string} scope - The generation scope ('feature', 'epic', or 'product')
 * @param {string} id - The UUID of the entity to generate for
 * @returns {Promise<Object>} The task ID and initial status
 */
export const triggerFullGeneration = async (scope, id) => {
  try {
    const response = await axios.post(
      `${API_URL}/generation/full?scope=${scope}&id=${id}`,
      {},
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error triggering generation:', error);
    throw error;
  }
};

/**
 * Get the status of a generation task
 *
 * @param {string} taskId - The task ID to check
 * @returns {Promise<Object>} The current status
 */
export const getGenerationStatus = async (taskId) => {
  try {
    const response = await axios.get(
      `${API_URL}/generation/status/${taskId}`,
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error getting generation status:', error);
    throw error;
  }
};
