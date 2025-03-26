import { useState, useEffect } from 'react';
import axios from 'axios';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Custom hook for tracking generation status
 *
 * @param {string} taskId - The task ID to track
 * @param {string} scope - The scope of generation ('feature', 'epic', 'product')
 * @returns {Object} Status information and loading state
 */
const useGenerationStatus = (taskId, scope) => {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  useEffect(() => {
    if (!taskId) {
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/generation/status/${taskId}`,
          { withCredentials: true }
        );

        setStatus(response.data);
        setIsLoading(false);

        // Stop polling if generation is complete or failed
        if (
          response.data.status === 'completed' ||
          response.data.status === 'completed_with_errors' ||
          response.data.status === 'failed'
        ) {
          if (pollInterval) {
            clearInterval(pollInterval);
            setPollInterval(null);
          }
        }
      } catch (err) {
        console.error('Error fetching generation status:', err);
        setError(err.message || 'Failed to fetch generation status');
        setIsLoading(false);

        // Stop polling on error
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
      }
    };

    // Fetch initial status
    fetchStatus();

    // Set up polling interval
    if (!pollInterval) {
      const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
      setPollInterval(interval);
    }

    // Clean up on unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [taskId]);

  // Helper function to calculate overall progress percentage
  const calculateProgress = () => {
    if (!status) return 0;

    // If we have specific progress information
    if (status.current_item?.progress) {
      return status.current_item.progress;
    }

    // Calculate based on completed items
    if (status.scope === 'feature') {
      // For a single feature, calculate based on stage
      switch (status.current_item?.stage) {
        case 'user_stories': return 0;
        case 'acceptance_criteria': return 33;
        case 'tests': return 66;
        default: return 0;
      }
    } else {
      // For epics and products, calculate based on completed items
      const total = status.current_item?.total || 1;
      const completed = status.completed_items?.length || 0;
      const index = status.current_item?.index || 0;
      const stageProgress = status.current_item?.progress || 0;

      // Calculate progress as a combination of completed items and current progress
      if (completed === total) return 100;

      const baseProgress = (completed / total) * 100;
      const currentItemProgress = (stageProgress / 100) * (1 / total) * 100;

      return Math.floor(baseProgress + currentItemProgress);
    }
  };

  return {
    status,
    progress: calculateProgress(),
    isLoading,
    error,
    isComplete: status?.status === 'completed',
    hasErrors: status?.status === 'completed_with_errors' || status?.status === 'failed',
    errors: status?.errors || [],
  };
};

export default useGenerationStatus;
