/**
 * Severity levels for bugs
 */
export const SEVERITY_LEVEL = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

/**
 * Colors for different bug severities
 */
export const SEVERITY_COLORS = {
  [SEVERITY_LEVEL.CRITICAL]: 'text-red-700 bg-red-50 border-red-100',
  [SEVERITY_LEVEL.HIGH]: 'text-orange-700 bg-orange-50 border-orange-100',
  [SEVERITY_LEVEL.MEDIUM]: 'text-yellow-700 bg-yellow-50 border-yellow-100',
  [SEVERITY_LEVEL.LOW]: 'text-green-700 bg-green-50 border-green-100'
};

/**
 * Colors for bug severity in charts
 */
export const SEVERITY_CHART_COLORS = {
  [SEVERITY_LEVEL.CRITICAL]: '#DC2626', // red-600
  [SEVERITY_LEVEL.HIGH]: '#EA580C',     // orange-600
  [SEVERITY_LEVEL.MEDIUM]: '#D97706',   // amber-600
  [SEVERITY_LEVEL.LOW]: '#65A30D'       // lime-600
};

/**
 * Get the color classes for a bug severity
 *
 * @param {string} severity - The severity level
 * @returns {string} CSS classes for the severity
 */
export const getSeverityColorClasses = (severity) => {
  return SEVERITY_COLORS[severity] || 'text-gray-700 bg-gray-50 border-gray-100';
};

/**
 * Get the chart color for a bug severity
 *
 * @param {string} severity - The severity level
 * @returns {string} Hex color code for the severity
 */
export const getSeverityChartColor = (severity) => {
  return SEVERITY_CHART_COLORS[severity] || '#9CA3AF'; // gray-400
};
