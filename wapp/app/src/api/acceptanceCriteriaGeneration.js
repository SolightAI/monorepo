import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Start acceptance criteria generation for a feature
 * @param {string} featureId - The ID of the feature to generate acceptance criteria for
 * @returns {Promise<string>} The task ID for tracking the generation
 */
export const generateAcceptanceCriteria = async (featureId) => {
  const response = await axios.post(
    `${API_URL}/acceptance-criteria-generation/${featureId}`,
    {},
    {
      withCredentials: true,
    }
  );
  
  return response.data.task_id;
};

/**
 * Get the status of an acceptance criteria generation task
 * @param {string} taskId - The task ID returned from the generation request
 * @returns {Promise<Object>} The current status of the generation task
 */
export const getAcceptanceCriteriaGenerationStatus = async (taskId) => {
  const response = await axios.get(
    `${API_URL}/acceptance-criteria-generation/status/${taskId}`,
    {
      withCredentials: true,
    }
  );
  
  return response.data;
}; 