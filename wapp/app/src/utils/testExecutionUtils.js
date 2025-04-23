import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, SkipForward, Server, User, RefreshCw, Info, Search } from 'lucide-react';
import { formatDuration } from './dateUtils';

/**
 * Test status constants
 */
export const TEST_STATUS = {
  PENDING: "pending",
  PASSED: "passed",
  FAILED: "failed",
  ERROR: "error",
  BLOCKED_BY_CAPTCHA: "blocked_by_captcha",
  AGENT_LIMITATION: "agent_limitation",
  UNEXISTING_FEATURE: "unexisting_feature",
};

/**
 * Executor type constants matching backend enum
 */
export const EXECUTOR_TYPE = {
  MANUAL: 'MANUAL',
  AUTOMATED: 'AUTOMATED',
  CI_PIPELINE: 'CI_PIPELINE',
  SCHEDULED: 'SCHEDULED'
};

/**
 * Get icon and color based on execution status
 *
 * @param {string} status - The status of the test execution
 * @returns {Object} Object with icon and color for the status
 */
export const getStatusInfo = (status) => {
  switch (status) {
    case TEST_STATUS.PASSED:
      return { icon: <CheckCircle size={16} />, color: 'text-green-500 bg-green-50' };
    case TEST_STATUS.FAILED:
      return { icon: <XCircle size={16} />, color: 'text-red-500 bg-red-50' };
    case TEST_STATUS.PENDING:
      return { icon: <Clock size={16} />, color: 'text-yellow-500 bg-yellow-50' };
    case TEST_STATUS.ERROR:
      return { icon: <XCircle size={16} />, color: 'text-red-500 bg-red-50' };
    case TEST_STATUS.AGENT_LIMITATION:
      return { icon: <Info size={16} />, color: 'text-purple-500 bg-purple-50' };
    case TEST_STATUS.UNEXISTING_FEATURE:
      return { icon: <Search size={16} />, color: 'text-amber-500 bg-amber-50' };
    default:
      console.log('getStatusInfo', status);
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
  switch (status) {
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
      return <SkipForward size={20} className="text-blue-500" />;
    case TEST_STATUS.AGENT_LIMITATION:
      return <Info size={20} className="text-purple-500" />;
    case TEST_STATUS.UNEXISTING_FEATURE:
      return <Search size={20} className="text-amber-500" />;
    default:
      console.log('getStatusIconLarge', status);
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
  switch (status) {
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
    case TEST_STATUS.AGENT_LIMITATION:
      return 'bg-purple-100 text-purple-800';
    case TEST_STATUS.UNEXISTING_FEATURE:
      return 'bg-amber-100 text-amber-800';
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
  switch (status) {
    case TEST_STATUS.PASSED:
      return 'text-green-600 bg-green-50 border-green-100';
    case TEST_STATUS.FAILED:
      return 'text-red-600 bg-red-50 border-red-100';
    case TEST_STATUS.ERROR:
      return 'text-red-600 bg-red-50 border-red-100';
    case TEST_STATUS.PENDING:
      return 'text-orange-600 bg-orange-50 border-orange-100';
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
  switch (executorType) {
    case EXECUTOR_TYPE.MANUAL:
      return <User size={16} className="text-gray-600" />;
    case EXECUTOR_TYPE.AUTOMATED:
      return <RefreshCw size={16} className="text-blue-600" />;
    case EXECUTOR_TYPE.CI_PIPELINE:
      return <Server size={16} className="text-purple-600" />;
    case EXECUTOR_TYPE.SCHEDULED:
      return <Clock size={16} className="text-green-600" />;
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
export const formatExecutionDuration = formatDuration;

/**
 * Format execution status by replacing underscores with spaces and normalizing case
 *
 * @param {string} status - The execution status string
 * @returns {string} Formatted status with spaces instead of underscores and consistent case
 */
export const formatStatus = (status) => {
  if (!status) return '';

  // First convert to uppercase to normalize
  const upperStatus = status.toUpperCase();

  // Then replace underscores with spaces
  return upperStatus.replace(/_/g, ' ');
};
