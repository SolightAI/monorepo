import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, SkipForward, Server, User, RefreshCw, Info, Search } from 'lucide-react';

/**
 * Test status constants
 */
export const TEST_STATUS = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  ERROR: 'ERROR',
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  SKIPPED: 'SKIPPED',
  AGENT_LIMITATION: 'AGENT_LIMITATION',
  UNEXISTING_FEATURE: 'UNEXISTING_FEATURE',
  NOT_STARTED: 'NOT_STARTED'
};

/**
 * Get icon and color based on execution status
 *
 * @param {string} status - The status of the test execution
 * @returns {Object} Object with icon and color for the status
 */
export const getStatusInfo = (status) => {
  switch (status?.toUpperCase()) {
    case TEST_STATUS.PASSED:
      return { icon: <CheckCircle size={16} />, color: 'text-green-500 bg-green-50' };
    case TEST_STATUS.FAILED:
      return { icon: <XCircle size={16} />, color: 'text-red-500 bg-red-50' };
    case TEST_STATUS.PENDING:
      return { icon: <Clock size={16} />, color: 'text-yellow-500 bg-yellow-50' };
    case TEST_STATUS.ERROR:
      return { icon: <XCircle size={16} />, color: 'text-red-500 bg-red-50' };
    case TEST_STATUS.BLOCKED:
      return { icon: <AlertCircle size={16} />, color: 'text-orange-500 bg-orange-50' };
    case TEST_STATUS.SKIPPED:
      return { icon: <SkipForward size={16} />, color: 'text-blue-500 bg-blue-50' };
    case TEST_STATUS.AGENT_LIMITATION:
      return { icon: <Info size={16} />, color: 'text-purple-500 bg-purple-50' };
    case TEST_STATUS.UNEXISTING_FEATURE:
      return { icon: <Search size={16} />, color: 'text-amber-500 bg-amber-50' };
    default:
      return { icon: <Clock size={16} />, color: 'text-gray-500 bg-gray-50' };
  }
};

/**
 * Get larger icon for test status (for headers, etc.)
 *
 * @param {string} status - The status of the test
 * @returns {JSX.Element} The icon component for the status
 */
export const getStatusIconLarge = (status) => {
  switch (status?.toUpperCase()) {
    case TEST_STATUS.PASSED:
      return <CheckCircle size={20} className="text-green-500" />;
    case TEST_STATUS.FAILED:
      return <XCircle size={20} className="text-red-500" />;
    case TEST_STATUS.ERROR:
      return <XCircle size={20} className="text-red-500" />;
    case TEST_STATUS.PENDING:
      return <Clock size={20} className="text-yellow-500 animate-spin" />;
    case TEST_STATUS.IN_PROGRESS:
      return <Clock size={20} className="text-blue-500 animate-spin" />;
    case TEST_STATUS.BLOCKED:
      return <AlertCircle size={20} className="text-orange-500" />;
    case TEST_STATUS.SKIPPED:
      return <SkipForward size={20} className="text-blue-500" />;
    case TEST_STATUS.AGENT_LIMITATION:
      return <Info size={20} className="text-purple-500" />;
    case TEST_STATUS.UNEXISTING_FEATURE:
      return <Search size={20} className="text-amber-500" />;
    case TEST_STATUS.NOT_STARTED:
    default:
      return <Clock size={20} className="text-gray-400" />;
  }
};

/**
 * Get CSS classes for status backgrounds and text colors
 *
 * @param {string} status - The status of the test
 * @returns {string} CSS classes for the status
 */
export const getStatusColorClasses = (status) => {
  switch (status?.toUpperCase()) {
    case TEST_STATUS.PASSED:
      return 'bg-green-100 text-green-800';
    case TEST_STATUS.FAILED:
      return 'bg-red-100 text-red-800';
    case TEST_STATUS.ERROR:
      return 'bg-red-100 text-red-800';
    case TEST_STATUS.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case TEST_STATUS.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800';
    case TEST_STATUS.BLOCKED:
      return 'bg-orange-100 text-orange-800';
    case TEST_STATUS.SKIPPED:
      return 'bg-blue-100 text-blue-800';
    case TEST_STATUS.AGENT_LIMITATION:
      return 'bg-purple-100 text-purple-800';
    case TEST_STATUS.UNEXISTING_FEATURE:
      return 'bg-amber-100 text-amber-800';
    case TEST_STATUS.NOT_STARTED:
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

/**
 * Get CSS classes for status in summary metrics component
 *
 * @param {string} status - The status of the test
 * @returns {string} CSS classes for the status
 */
export const getStatusMetricClasses = (status) => {
  switch (status?.toUpperCase()) {
    case TEST_STATUS.PASSED:
      return 'text-green-600 bg-green-50 border-green-100';
    case TEST_STATUS.FAILED:
      return 'text-red-600 bg-red-50 border-red-100';
    case TEST_STATUS.ERROR:
      return 'text-red-600 bg-red-50 border-red-100';
    case TEST_STATUS.PENDING:
      return 'text-orange-600 bg-orange-50 border-orange-100';
    case TEST_STATUS.NOT_STARTED:
      return 'text-gray-600 bg-gray-50 border-gray-100';
    case TEST_STATUS.BLOCKED:
      return 'text-purple-600 bg-purple-50 border-purple-100';
    case TEST_STATUS.SKIPPED:
      return 'text-blue-600 bg-blue-50 border-blue-100';
    case TEST_STATUS.AGENT_LIMITATION:
      return 'text-purple-600 bg-purple-50 border-purple-100';
    case TEST_STATUS.UNEXISTING_FEATURE:
      return 'text-amber-600 bg-amber-50 border-amber-100';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-100';
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
