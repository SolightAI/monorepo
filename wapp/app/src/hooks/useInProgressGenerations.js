import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '@/config';

/**
 * Custom hook for checking in-progress generations
 * 
 * @param {Function} onComplete - Callback function to be called when all generations are completed
 * @returns {Object} Object containing in-progress generations and loading state
 */
export const useInProgressGenerations = (onComplete) => {
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const previousGenerations = useRef([]);

  const fetchGenerations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/generations/in-progress`);
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
            setError('No in-progress generations found');
            break;
          case 401:
          case 403:
            setError('Please log in to view in-progress generations');
            break;
          case 500:
            setError('Server error while fetching generations');
            break;
          default:
            setError('Error loading generations');
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError('Unable to connect to the server');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError('Error checking for in-progress generations');
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

    // Set up polling every 3 seconds
    const interval = setInterval(fetchGenerations, 3000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  return { generations, loading, error };
};

export default useInProgressGenerations; 