import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Start full generation process for a feature, epic, or product
 * @param {string} scope - The scope of generation ('feature', 'epic', 'product')
 * @param {string} id - The ID of the entity to generate for
 * @returns {Promise<Object>} The generation task information
 */
export const generateAll = async (scope, id) => {
  const response = await axios.post(
    `${API_URL}/generation/full?scope=${scope}&id=${id}`,
    {},
    {
      withCredentials: true,
    }
  );

  return response.data;
};

/**
 * Get the status of a generation task
 * @param {string} taskId - The task ID to check
 * @returns {Promise<Object>} The current status of the generation task
 */
export const getGenerationStatus = async (taskId) => {
  const response = await axios.get(
    `${API_URL}/generation/status/${taskId}`,
    {
      withCredentials: true,
    }
  );

  return response.data;
}; 