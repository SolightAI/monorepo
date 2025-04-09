import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, POLLING_INTERVAL } from '../../config';

/**
 * Custom hook to validate a URL and find login page
 * 
 * @param {string} taskId - The task ID returned from the validation request
 * @returns {Object} - Validation state: { status, result, error, isPolling }
 */
export const useUrlValidation = (taskId) => {
  const [status, setStatus] = useState('pending');  // pending, completed, error, unknown
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(!!taskId);

  useEffect(() => {
    if (!taskId) {
      setIsPolling(false);
      console.log("useUrlValidation: No taskId provided, not polling");
      return;
    }

    console.log(`useUrlValidation: Starting to poll status for task ${taskId}`);
    setIsPolling(true);
    
    // Start polling for task status
    const intervalId = setInterval(async () => {
      try {
        console.log(`useUrlValidation: Checking status for task ${taskId}`);
        const response = await axios.get(
          `${API_URL}/products/url-validation-status/${taskId}`,
          { withCredentials: true }
        );
        
        if (!response.data) {
          console.log(`useUrlValidation: Received empty response for task ${taskId}`);
          return;
        }
        
        const data = response.data;
        
        console.log(`useUrlValidation: Received status: ${data.status} for task ${taskId}`, data);
        
        // Update status from response
        setStatus(data.status);
        
        // If the task has completed or errored, stop polling
        if (data.status === 'completed') {
          console.log(`useUrlValidation: Task ${taskId} completed, results:`, data.results);
          setResult(data.results);
          setIsPolling(false);
          clearInterval(intervalId);
        } else if (data.status === 'error') {
          console.log(`useUrlValidation: Task ${taskId} errored:`, data.error);
          // Check if this is a timeout error
          const errorMsg = data.error || '';
          if (
            errorMsg.includes('Timeout') || 
            errorMsg.includes('timeout') || 
            errorMsg.includes('timed out') ||
            errorMsg.includes('ETIMEDOUT')
          ) {
            console.log(`useUrlValidation: Detected timeout error for task ${taskId}`);
          }
          
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
          console.log(`useUrlValidation: Detected timeout error from exception`);
          finalErrorMsg = 'Login page not found. The page took too long to respond.';
        }
        
        setError(finalErrorMsg);
        setIsPolling(false);
        clearInterval(intervalId);
      }
    }, POLLING_INTERVAL);
    
    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [taskId]);

  return { status, result, error, isPolling };
};

/**
 * Trigger URL validation for a product
 * 
 * @param {string} url - The URL to validate
 * @returns {Promise<string>} - Promise resolving to the task ID
 */
export const triggerUrlValidation = async (url) => {
  try {
    // Note: This function is provided for direct validation testing
    // Normally the task_id comes from product creation/update responses
    const response = await axios.post(
      `${API_URL}/validate-url/`,
      { url },
      { withCredentials: true }
    );
    
    return response.data.task_id;
  } catch (error) {
    console.error('Error triggering URL validation:', error);
    throw error;
  }
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