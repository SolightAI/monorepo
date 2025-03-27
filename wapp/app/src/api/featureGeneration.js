import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Start feature generation for an epic
 * @param {string} epicId - The ID of the epic to generate features for
 * @returns {Promise<string>} The task ID for tracking the generation
 */
export const generateFeatures = async (epicId) => {
  console.log(`Starting feature generation for epic: ${epicId}`);
  try {
    const url = `${API_URL}/feature-generation/${epicId}`;
    console.log(`Making POST request to: ${url}`);

    const response = await axios.post(
      url,
      {},
      {
        withCredentials: true,
      }
    );

    console.log('Feature generation initiated successfully:', response.data);
    return response.data.task_id;
  } catch (error) {
    console.error('Error starting feature generation:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get the status of a feature generation task
 * @param {string} taskId - The task ID returned from the generation request
 * @returns {Promise<Object>} The current status of the generation task
 */
export const getFeatureGenerationStatus = async (taskId) => {
  console.log(`Checking feature generation status for task: ${taskId}`);
  try {
    const url = `${API_URL}/feature-generation/status/${taskId}`;
    console.log(`Making GET request to: ${url}`);

    const response = await axios.get(
      url,
      {
        withCredentials: true,
      }
    );

    console.log('Feature generation status response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error checking feature generation status:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};
