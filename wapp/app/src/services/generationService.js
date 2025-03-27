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
  console.log(`Triggering full generation for ${scope} with ID: ${id}`);
  try {
    const requestUrl = `${API_URL}/generation/full?scope=${scope}&id=${id}`;
    console.log(`Making POST request to: ${requestUrl}`);
    
    const response = await axios.post(
      requestUrl,
      {},
      {
        withCredentials: true,
      }
    );

    console.log(`Full generation request successful:`, response.data);
    return response.data;
  } catch (error) {
    console.error('Error triggering generation:', error);
    console.error('Error details:', error.response?.data || error.message);
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
  console.log(`Checking generation status for taskId: ${taskId}`);
  try {
    const requestUrl = `${API_URL}/generation/status/${taskId}`;
    console.log(`Making GET request to: ${requestUrl}`);
    
    const response = await axios.get(
      requestUrl,
      {
        withCredentials: true,
      }
    );

    console.log(`Generation status response:`, response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting generation status:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};
