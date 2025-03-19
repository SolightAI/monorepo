import axios from 'axios';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Create a new user story
 * @param {object} userStoryData - The user story data
 * @returns {Promise<object>} Promise with the created user story
 */
export const createUserStory = async (userStoryData) => {
  try {
    const response = await axios.post(
      `${API_URL}/user-stories/`,
      userStoryData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error(`Error creating user story:`, error);
    throw error;
  }
};

/**
 * Get a user story by ID
 * @param {string} userStoryId - The UUID of the user story
 * @returns {Promise<object>} Promise with the user story
 */
export const getUserStory = async (userStoryId) => {
  try {
    const response = await axios.get(
      `${API_URL}/user-stories/${userStoryId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching user story ${userStoryId}:`, error);
    throw error;
  }
};

/**
 * Trigger user stories generation for a feature
 * @param {string} featureId - The UUID of the feature
 * @returns {Promise<string>} Promise with the task ID (UUID)
 */
export const triggerUserStoriesGeneration = async (featureId) => {
  try {
    const response = await axios.post(
      `${API_URL}/user-stories/generate?feature_id=${featureId}`,
      {},
      { withCredentials: true }
    );
    return response.data.task_id;
  } catch (error) {
    console.error(`Error triggering user stories generation for feature ${featureId}:`, error);
    throw error;
  }
};

/**
 * Check the status of a user stories generation task
 * @param {string} taskId - The task ID (UUID)
 * @returns {Promise<object>} Promise with the task status data
 */
export const getUserStoriesGenerationStatus = async (taskId) => {
  try {
    const response = await axios.get(
      `${API_URL}/user-stories/generate/status/${taskId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching user stories generation status for task ${taskId}:`, error);
    throw error;
  }
};
