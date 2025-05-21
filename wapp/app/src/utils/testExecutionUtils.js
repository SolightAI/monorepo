import React from 'react';
import { CheckCircle, XCircle, Clock, Server, User, RefreshCw, Info, Search, Lock } from 'lucide-react';
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
  NOT_FOUND: "not_found",
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
 * Helper to sort tests by test execution status
 *
 * @param {string} status - The status of the test execution
 * @returns {number} Sort order value for the status
 */
export const orderStatus = (status) => {
  switch (status) {
    case TEST_STATUS.PASSED:
    case TEST_STATUS.FAILED:
    case TEST_STATUS.ERROR:
    case TEST_STATUS.AGENT_LIMITATION:
    case TEST_STATUS.NOT_FOUND:
    case TEST_STATUS.BLOCKED_BY_CAPTCHA:
      return 0;
    case TEST_STATUS.PENDING:
      return 1;
    case null:
      return 2;
    default:
      console.log('orderStatus', status);
      return 2;
  }
};

/**
 * Get icon and color based on execution status
 *
 * @param {string} status - The status of the test execution
 * @param {number} [size=16] - The desired icon size
 * @returns {Object} Object with icon and color for the status
 */
export const getStatusInfo = (status, size = 16) => {
  switch (status) {
    case TEST_STATUS.PASSED:
      return { icon: <CheckCircle size={size} />, color: 'text-green-500 bg-green-50' };
    case TEST_STATUS.FAILED:
      return { icon: <XCircle size={size} />, color: 'text-red-500 bg-red-50' };
    case TEST_STATUS.PENDING:
      return { icon: <Clock size={size} />, color: 'text-yellow-500 bg-yellow-50' };
    case TEST_STATUS.ERROR:
      return { icon: <XCircle size={size} />, color: 'text-red-500 bg-red-50' };
    case TEST_STATUS.AGENT_LIMITATION:
      return { icon: <Info size={size} />, color: 'text-purple-500 bg-purple-50' };
    case TEST_STATUS.NOT_FOUND:
      return { icon: <Search size={size} />, color: 'text-amber-500 bg-amber-50' };
    case TEST_STATUS.BLOCKED_BY_CAPTCHA:
      return { icon: <Lock size={size} />, color: 'text-purple-500 bg-purple-50' };
    case null:
      return { icon: <Clock size={size} />, color: 'text-gray-500 bg-gray-50' };
    default:
      console.log('getStatusInfo', status);
      return { icon: <Clock size={size} />, color: 'text-gray-500 bg-gray-50' };
  }
};

/**
 * Get a human-readable description for a test status.
 *
 * @param {string} status - The status of the test execution
 * @returns {string} Description of the status
 */
export const getStatusDescription = (status) => {
  switch (status) {
    case TEST_STATUS.PASSED:
      return 'The test completed successfully.';
    case TEST_STATUS.FAILED:
      return 'The test execution failed assertions or checks.';
    case TEST_STATUS.PENDING:
      return 'The test execution is currently running or queued.';
    case TEST_STATUS.ERROR:
      return 'An unexpected error occurred during test execution.';
    case TEST_STATUS.BLOCKED_BY_CAPTCHA:
      return 'The test execution was blocked by a CAPTCHA.';
    case TEST_STATUS.AGENT_LIMITATION:
      return 'The test could not be completed due to limitations of the AI agent.';
    case TEST_STATUS.NOT_FOUND:
      return 'The test execution target (e.g., element) was not found.';
    case null:
      return 'The test has not been run yet';
    default:
      console.log('getStatusDescription', status);
      return 'The status is unknown.';
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
