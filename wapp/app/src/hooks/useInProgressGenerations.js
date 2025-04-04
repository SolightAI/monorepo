import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '@/config';
import { 
  GENERATIONS_API, 
  POLLING, 
  ERROR_MESSAGES 
} from '@/constants/generations';

/**
 * Custom hook for checking in-progress generations
 * 
 * @param {Function} onComplete - Callback function to be called when all generations are completed
 * @param {boolean} isVisible - Whether the component is currently visible
 * @returns {Object} Object containing in-progress generations and loading state
 */
export const useInProgressGenerations = (onComplete, isVisible = true) => {
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const previousGenerations = useRef([]);

  const fetchGenerations = async () => {
    try {
      const response = await axios.get(`${API_URL}${GENERATIONS_API.IN_PROGRESS}`);
      setGenerations(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching generations:', err);
      
      // Handle different types of errors
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        switch (err.response.status) {
          case 404:
            setError(ERROR_MESSAGES.NOT_FOUND);
            break;
          case 401:
          case 403:
            setError(ERROR_MESSAGES.UNAUTHORIZED);
            break;
          case 500:
            setError(ERROR_MESSAGES.SERVER_ERROR);
            break;
          default:
            setError(ERROR_MESSAGES.DEFAULT_ERROR);
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError(ERROR_MESSAGES.CONNECTION_ERROR);
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(ERROR_MESSAGES.CHECKING_ERROR);
      }
      
      setGenerations([]);
    } finally {
      setLoading(false);
    }
  };

  // Check for completed generations and trigger onComplete
  useEffect(() => {
    if (previousGenerations.current.length > 0 && generations.length === 0) {
      // All generations have completed
      if (onComplete) {
        console.log('Triggering onComplete callback');
        onComplete();
      }
    }
    previousGenerations.current = generations;
  }, [generations, onComplete]);

  useEffect(() => {
    // Initial fetch
    fetchGenerations();

    // Only set up polling if the component is visible
    let interval;
    if (isVisible) {
      interval = setInterval(fetchGenerations, POLLING.INTERVAL);
    }

    // Cleanup interval on unmount or when visibility changes
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isVisible]);

  return { generations, loading, error };
};

export default useInProgressGenerations; 