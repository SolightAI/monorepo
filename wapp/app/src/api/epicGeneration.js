import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Start epic generation for a product
 * @param {string} productId - The ID of the product to generate epics for
 * @returns {Promise<string>} The task ID for tracking the generation
 */
export const generateEpics = async (productId) => {
  const response = await axios.post(
    `${API_URL}/epic-generation/${productId}/`,
    {},
    {
      withCredentials: true,
    }
  );

  return response.data.task_id;
};

/**
 * Get the status of an epic generation task
 * @param {string} taskId - The task ID returned from the generation request
 * @returns {Promise<Object>} The current status of the generation task
 */
export const getEpicGenerationStatus = async (taskId) => {
  const response = await axios.get(
    `${API_URL}/epic-generation/status/${taskId}`,
    {
      withCredentials: true,
    }
  );

  return response.data;
};
