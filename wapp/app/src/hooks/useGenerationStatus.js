import { useState, useEffect } from 'react';
import axios from 'axios';
import { getFeatureGenerationStatus } from '@/api/featureGeneration';
import { getGenerationStatus } from '@/services/generationService';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Custom hook for tracking generation status
 *
 * @param {string} taskId - The task ID to track
 * @param {string} scope - The scope of generation ('feature', 'epic', 'product')
 * @param {string} taskType - The type of task ('general' or 'feature')
 * @returns {Object} Status information and loading state
 */
const useGenerationStatus = (taskId, scope, taskType = 'general') => {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  useEffect(() => {
    console.log('useGenerationStatus hook initialized with:', { taskId, scope, taskType });
    
    if (!taskId) {
      console.warn('No taskId provided to useGenerationStatus hook');
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        console.log(`Fetching ${taskType} generation status for taskId: ${taskId}`);
        
        let response;
        // Choose the correct API endpoint based on task type
        if (taskType === 'feature') {
          // Feature generation status endpoint
          response = await getFeatureGenerationStatus(taskId);
        } else {
          // General generation status endpoint
          response = await getGenerationStatus(taskId);
        }

        console.log(`${taskType.charAt(0).toUpperCase() + taskType.slice(1)} generation status response:`, response);
        setStatus(response);
        setIsLoading(false);

        // Stop polling if generation is complete or failed
        if (
          response.status === 'completed' ||
          response.status === 'completed_with_errors' ||
          response.status === 'failed'
        ) {
          console.log(`Generation process finished with status: ${response.status}`);
          if (pollInterval) {
            console.log('Stopping status polling - generation process has ended');
            clearInterval(pollInterval);
            setPollInterval(null);
          }
        }
      } catch (err) {
        console.error(`Error fetching ${taskType} generation status:`, err);
        console.error('Error details:', err.response?.data || err.message);
        setError(err.message || `Failed to fetch ${taskType} generation status`);
        setIsLoading(false);

        // Stop polling on error
        if (pollInterval) {
          console.log('Stopping status polling due to error');
          clearInterval(pollInterval);
          setPollInterval(null);
        }
      }
    };

    // Fetch initial status
    console.log(`Performing initial ${taskType} status fetch`);
    fetchStatus();

    // Set up polling interval
    if (!pollInterval) {
      console.log(`Setting up polling interval for ${taskType} status updates (every 3s)`);
      const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
      setPollInterval(interval);
    }

    // Clean up on unmount
    return () => {
      if (pollInterval) {
        console.log('Cleaning up polling interval on hook unmount');
        clearInterval(pollInterval);
      }
    };
  }, [taskId, taskType]);

  // Helper function to calculate overall progress percentage
  const calculateProgress = () => {
    if (!status) return 0;

    // If we have specific progress information
    if (status.current_item?.progress) {
      return status.current_item.progress;
    }

    // Feature generation has a simpler progress model
    if (taskType === 'feature') {
      // Return progress directly if available, otherwise default to 0
      return status.progress || 0;
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

      console.log('Calculating progress:', { 
        total, 
        completed, 
        index, 
        stageProgress 
      });

      // Calculate progress as a combination of completed items and current progress
      if (completed === total) return 100;

      const baseProgress = (completed / total) * 100;
      const currentItemProgress = (stageProgress / 100) * (1 / total) * 100;
      const calculatedProgress = Math.floor(baseProgress + currentItemProgress);

      console.log('Progress calculation details:', {
        baseProgress,
        currentItemProgress,
        calculatedProgress
      });

      return calculatedProgress;
    }
  };

  const progress = calculateProgress();
  const isComplete = status?.status === 'completed';
  const hasErrors = status?.status === 'completed_with_errors' || status?.status === 'failed';
  const errors = status?.errors || [];

  console.log('useGenerationStatus hook returning:', {
    taskType,
    statusState: status?.status,
    progress,
    isLoading,
    hasError: !!error,
    errorMessage: error,
    isComplete,
    hasErrors,
    errorCount: errors.length
  });

  return {
    status,
    progress,
    isLoading,
    error,
    isComplete,
    hasErrors,
    errors,
  };
};

export default useGenerationStatus;
