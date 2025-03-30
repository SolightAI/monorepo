import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, SkipForward, Server, User, RefreshCw, Info, Search } from 'lucide-react';

/**
 * Get icon and color based on execution status
 *
 * @param {string} status - The status of the test execution
 * @returns {Object} Object with icon and color for the status
 */
export const getStatusInfo = (status) => {
  switch (status?.toUpperCase()) {
    case 'PASSED':
      return { icon: <CheckCircle size={16} />, color: 'text-green-500 bg-green-50' };
    case 'FAILED':
      return { icon: <XCircle size={16} />, color: 'text-red-500 bg-red-50' };
    case 'PENDING':
      return { icon: <Clock size={16} />, color: 'text-yellow-500 bg-yellow-50' };
    case 'ERROR':
      return { icon: <XCircle size={16} />, color: 'text-red-500 bg-red-50' };
    case 'BLOCKED':
      return { icon: <AlertCircle size={16} />, color: 'text-orange-500 bg-orange-50' };
    case 'SKIPPED':
      return { icon: <SkipForward size={16} />, color: 'text-blue-500 bg-blue-50' };
    case 'AGENT_LIMITATION':
      return { icon: <Info size={16} />, color: 'text-purple-500 bg-purple-50' };
    case 'UNEXISTING_FEATURE':
      return { icon: <Search size={16} />, color: 'text-amber-500 bg-amber-50' };
    default:
      return { icon: <Clock size={16} />, color: 'text-gray-500 bg-gray-50' };
  }
};

/**
 * Get executor icon based on executor type
 *
 * @param {string} executorType - The type of test executor
 * @returns {JSX.Element} The icon component for the executor type
 */
export const getExecutorIcon = (executorType) => {
  switch (executorType?.toUpperCase()) {
    case 'MANUAL':
      return <User size={16} className="text-gray-600" />;
    case 'AUTOMATED':
      return <RefreshCw size={16} className="text-blue-600" />;
    case 'CI_PIPELINE':
      return <Server size={16} className="text-purple-600" />;
    default:
      return <User size={16} className="text-gray-600" />;
  }
};

/**
 * Format date for display
 *
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date string
 */
export const formatExecutionDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

/**
 * Format execution duration in milliseconds to a readable format
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export const formatExecutionDuration = (ms) => {
  if (!ms) return 'N/A';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Format execution status by replacing underscores with spaces
 *
 * @param {string} status - The execution status string
 * @returns {string} Formatted status with spaces instead of underscores
 */
export const formatStatus = (status) => {
  if (!status) return '';
  return status.replace(/_/g, ' ');
};
