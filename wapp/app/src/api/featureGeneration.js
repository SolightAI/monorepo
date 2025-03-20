import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Start feature generation for an epic
 * @param {string} epicId - The ID of the epic to generate features for
 * @returns {Promise<string>} The task ID for tracking the generation
 */
export const generateFeatures = async (epicId) => {
  const response = await axios.post(
    `${API_URL}/feature-generation/${epicId}`,
    {},
    {
      withCredentials: true,
    }
  );

  return response.data.task_id;
};

/**
 * Get the status of a feature generation task
 * @param {string} taskId - The task ID returned from the generation request
 * @returns {Promise<Object>} The current status of the generation task
 */
export const getFeatureGenerationStatus = async (taskId) => {
  const response = await axios.get(
    `${API_URL}/feature-generation/status/${taskId}`,
    {
      withCredentials: true,
    }
  );

  return response.data;
};
