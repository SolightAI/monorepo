import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Link as LinkIcon, Edit } from 'lucide-react';
import { useUrlValidation, formatValidationResult } from '@/services/urlValidationService';
import { TEST_STATUS } from '@/utils/testExecutionUtils';

/**
 * URL Validation Notification Component
 * Displays the status of a URL validation task and appropriate notifications
 * based on whether a login page was found
 *
 * @param {Object} props
 * @param {string} props.taskId - The task ID for URL validation
 * @param {string} props.productId - ID of the product being validated
 * @param {function} props.onClose - Function to call when notification is closed
 * @param {function} props.onUrlUpdate - Function to call when URL needs updating
 */
const UrlValidationNotification = ({ taskId, productId, onClose, onUrlUpdate }) => {
  const { status, result, error, isPolling } = useUrlValidation(taskId);
  const [visible, setVisible] = useState(true);
  const [autoCloseTimer, setAutoCloseTimer] = useState(null);

  // Debug logging
  useEffect(() => {
    console.log("UrlValidationNotification mounted with taskId:", taskId);
    console.log("Status:", status, "Result:", result, "Error:", error, "IsPolling:", isPolling);

    return () => {
      console.log("UrlValidationNotification unmounted");
    };
  }, [taskId]);

  // Log status changes
  useEffect(() => {
    console.log("Validation status changed:", status);
    if (result) {
      console.log("Validation result:", result);
    }
    if (error) {
      console.log("Validation error:", error);
    }
  }, [status, result, error]);

  // Format the validation result for display
  const formattedResult = formatValidationResult(result);

  // Handle successful validation with auto-close
  useEffect(() => {
    // If validation succeeded, set auto-close timer
    if (status === 'completed' && formattedResult?.isValid) {
      const timer = setTimeout(() => {
        handleClose();
      }, 5000); // Auto-close after 5 seconds

      setAutoCloseTimer(timer);

      // Clear timer on unmount
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [status, formattedResult]);

  // Close the notification
  const handleClose = () => {
    setVisible(false);
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
    }
    if (onClose) {
      onClose();
    }
  };

  // If notification is not visible, don't render anything
  if (!visible) {
    return null;
  }

  // Check if this is a timeout error
  const isTimeoutError = error && (
    error.includes("Timeout") ||
    error.includes("timeout") ||
    error.includes("timed out") ||
    error.includes("ETIMEDOUT")
  );

  // Determine what to display based on the validation status
  const getNotificationContent = () => {
    // If still polling, show the pending state
    if (isPolling || status === 'pending') {
      return (
        <div className="flex items-center">
          <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>Validating URL and searching for login page...</span>
        </div>
      );
    }

    // Handle timeout errors as "login page not found"
    if (isTimeoutError) {
      return (
        <div className="flex items-start">
          <AlertCircle className="text-amber-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Login page not found</p>
            <p className="text-sm text-gray-600">The URL couldn't be validated because the page took too long to respond.</p>
            <p className="text-sm text-gray-600 mt-1">Please check that the URL is correct and the site is accessible.</p>

            {/* Button to update URL */}
            <button
              onClick={() => onUrlUpdate && onUrlUpdate(productId)}
              className="mt-2 inline-flex items-center px-3 py-1 border border-amber-300 text-sm rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              <Edit className="h-4 w-4 mr-1" />
              Update URL
            </button>
          </div>
        </div>
      );
    }

    // If there was a different error, show error state
    if (status === 'error' || error) {
      return (
        <div className="flex items-start">
          <AlertCircle className="text-amber-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Login page not found</p>
            <p className="text-sm text-gray-600">We couldn't validate the URL.</p>
            <p className="text-sm text-gray-600 mt-1">{error || 'An unknown error occurred during validation.'}</p>

            {/* Button to update URL */}
            <button
              onClick={() => onUrlUpdate && onUrlUpdate(productId)}
              className="mt-2 inline-flex items-center px-3 py-1 border border-amber-300 text-sm rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              <Edit className="h-4 w-4 mr-1" />
              Update URL
            </button>
          </div>
        </div>
      );
    }

    // If validation completed successfully
    if (status === TEST_STATUS.PASSED && formattedResult) {
      // Login page found
      if (formattedResult.isValid) {
        return (
          <div className="flex items-start">
            <CheckCircle className="text-green-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Login page found</p>
              <p className="text-sm text-gray-600">{formattedResult.message}</p>
              {formattedResult.loginUrl && (
                <div className="mt-1 flex items-center text-sm text-blue-600">
                  <LinkIcon className="h-4 w-4 mr-1" />
                  <a
                    href={formattedResult.loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-800"
                  >
                    {formattedResult.loginUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      }
      // Login page not found
      else {
        return (
          <div className="flex items-start">
            <AlertCircle className="text-amber-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Login page not found</p>
              <p className="text-sm text-gray-600">{formattedResult.message || 'We could not find a login page at the provided URL.'}</p>

              {/* Button to update URL */}
              <button
                onClick={() => onUrlUpdate && onUrlUpdate(productId)}
                className="mt-2 inline-flex items-center px-3 py-1 border border-amber-300 text-sm rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <Edit className="h-4 w-4 mr-1" />
                Update URL
              </button>
            </div>
          </div>
        );
      }
    }

    // Default case - should not reach here
    return (
      <div>Unknown validation state</div>
    );
  };

  // Determine background color based on status
  const getBgColor = () => {
    if (isPolling || status === 'pending') return 'bg-blue-50 border-blue-200';
    if (isTimeoutError) return 'bg-amber-50 border-amber-200';
    if (status === 'error' || error) return 'bg-amber-50 border-amber-200';
    if (status === 'completed' && formattedResult) {
      return formattedResult.isValid
        ? 'bg-green-50 border-green-200'
        : 'bg-amber-50 border-amber-200';
    }
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className={`fixed bottom-4 right-4 max-w-md rounded-lg shadow-lg border p-4 ${getBgColor()} z-50`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {getNotificationContent()}
        </div>
        <button
          onClick={handleClose}
          className="ml-3 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="Close notification"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default UrlValidationNotification;
