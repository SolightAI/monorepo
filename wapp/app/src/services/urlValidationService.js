import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '@/constants/api';
import { POLLING } from '@/constants/generations';
import { TEST_STATUS } from '@/utils/testExecutionUtils';

/**
 * Custom hook to validate a URL and find login page
 *
 * @param {string} taskId - The task ID returned from the validation request
 * @returns {Object} - Validation state: { status, result, error, isPolling }
 */
export const useUrlValidation = (taskId) => {
  const [status, setStatus] = useState(TEST_STATUS.PENDING);  // pending, completed, error, unknown
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(!!taskId);

  useEffect(() => {
    if (!taskId) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    // Start polling for task status
    const intervalId = setInterval(async () => {
      try {
        const response = await axios.get(
          `${API_URL}/products/url-validation-status/${taskId}`,
          { withCredentials: true }
        );

        if (!response.data) {
          return;
        }

        const data = response.data;
        setStatus(data.status);

        // If the task has completed or errored, stop polling
        if (data.status === TEST_STATUS.PASSED) {
          setResult(data.results);
          setIsPolling(false);
          clearInterval(intervalId);
        } else if (data.status === TEST_STATUS.ERROR) {
          setError(data.error);
          setIsPolling(false);
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Error checking URL validation status:', err);
        if (err.response) {
          console.error('Response status:', err.response.status);
          console.error('Response data:', err.response.data);
        }

        // Check for timeout errors in the error message
        const errorMsg = err.message || '';
        let finalErrorMsg = errorMsg;

        if (
          errorMsg.includes('Timeout') ||
          errorMsg.includes('timeout') ||
          errorMsg.includes('timed out') ||
          errorMsg.includes('ETIMEDOUT')
        ) {
          finalErrorMsg = 'Login page not found. The page took too long to respond.';
        }

        setError(finalErrorMsg);
        setIsPolling(false);
        clearInterval(intervalId);
      }
    }, POLLING.INTERVAL);

    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [taskId]);

  return { status, result, error, isPolling };
};

/**
 * Format a validation result for display
 *
 * @param {Object} result - The validation result from the API
 * @returns {Object} - Formatted result with display-friendly properties
 */
export const formatValidationResult = (result) => {
  if (!result) return null;

  return {
    isValid: result.valid === true,
    loginUrl: result.login_url || '',
    message: result.message || '',
    confidence: result.confidence || 'low',
    originalUrl: result.original_url || '',
  };
};
