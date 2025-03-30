import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to handle polling for items with pending status
 *
 * @param {Function} fetchFunction - Function to call for data refresh
 * @param {Function} checkPendingFunction - Function that returns true if any items have pending status
 * @param {Array} dependencyArray - Dependencies that should trigger a polling reset
 * @param {number} interval - Polling interval in milliseconds (default: 5000ms)
 * @returns {boolean} - Whether polling is currently active
 */
export default function usePendingStatusPolling(fetchFunction, checkPendingFunction, dependencyArray, interval = 5000) {
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    const hasPending = checkPendingFunction();
    setIsPolling(hasPending);

    if (hasPending) {
      pollingRef.current = setInterval(() => {
        if (!isFetchingRef.current) {
          isFetchingRef.current = true;
          fetchFunction().finally(() => {
            isFetchingRef.current = false;
          });
        }
      }, interval);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, dependencyArray);

  return isPolling;
}
