/**
 * Severity levels for test failures
 */
export const SEVERITY_LEVELS = {
  P1: "P1", // Critical - Blocking functionality, e.g. login failures
  P2: "P2", // High - Major functionality affected but with workarounds
  P3: "P3", // Medium - Minor functionality affected, not blocking user experience
};

/**
 * Get severity level information including description and color classes
 * 
 * @param {string} level - The severity level (P1, P2, P3)
 * @returns {Object} Information about the severity level
 */
export const getSeverityInfo = (level) => {
  switch (level) {
    case SEVERITY_LEVELS.P1:
      return {
        name: "Critical",
        description: "Critical issue blocking core functionality. This is a high-priority defect that should be addressed immediately as it affects critical user flows.",
        colorClasses: "bg-red-100 text-red-800 border-red-200",
      };
    case SEVERITY_LEVELS.P2:
      return {
        name: "High",
        description: "Major functionality affected but with potential workarounds. This should be addressed in the current development cycle.",
        colorClasses: "bg-orange-100 text-orange-800 border-orange-200",
      };
    case SEVERITY_LEVELS.P3:
      return {
        name: "Medium",
        description: "Minor functionality affected, not blocking the primary user experience. This can be prioritized after more critical issues.",
        colorClasses: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    default:
      return {
        name: "Unknown",
        description: "Unknown severity level",
        colorClasses: "bg-gray-100 text-gray-800 border-gray-200",
      };
  }
};

/**
 * Estimate severity level based on test information and error details
 * 
 * @param {Object} testData - Information about the test that failed
 * @param {Object} errorDetails - Details about the error
 * @returns {string} Estimated severity level (P1, P2, P3)
 */
export const estimateSeverityLevel = (testData, errorDetails) => {
  // Default to P3 if we don't have enough information
  if (!testData) return SEVERITY_LEVELS.P3;
  
  // Extract error message if available
  const errorMessage = errorDetails?.message?.toLowerCase() || '';
  const testName = testData?.name?.toLowerCase() || '';
  const testDescription = testData?.description?.toLowerCase() || '';
  const category = testData?.category?.toLowerCase() || '';
  const url = testData?.url?.toLowerCase() || '';
  
  // Critical functionality keywords that indicate P1 severity
  const p1Keywords = [
    'login', 'authentication', 'signin', 'sign in', 'sign-in', 'signout', 'sign out', 'sign-out',
    'password', 'reset password', 'forgot password', 'create account', 'register',
    'payment', 'checkout', 'buy', 'purchase', 'transaction', 'order', 'invoice',
    'security', 'critical', 'crash', 'data loss', 'unresponsive', 'hang',
    'submit', 'registration', 'signup', 'sign up', 'account creation',
    'billing', 'credit card', 'financial', 'gdpr', 'compliance', 'privacy',
    'api key', 'token', 'authentication token', 'authorization', 'admin',
    '500 error', 'server error', 'cannot connect', 'database', 'data corruption',
    'jwt', 'oauth', 'sso', 'identity', 'user identity'
  ];
  
  // P2 severity keywords
  const p2Keywords = [
    'upload', 'download', 'save', 'create', 'edit', 'delete', 'modify',
    'navigation', 'search', 'filter', 'sort', 'view', 'display',
    'validation', 'form', 'input', 'button', 'click', 'select',
    'dashboard', 'report', 'chart', 'graph', 'statistics', 'export', 'import',
    'settings', 'configuration', 'profile', 'user profile', 'preferences',
    'notification', 'email', 'message', 'alert', 'warning',
    'integration', 'api', 'connection', 'linked', 'sync',
    'performance', 'slow', 'lag', 'timeout',
    'ui', 'layout', 'design', 'style', 'css', 'rendering'
  ];
  
  // P3 severity keywords
  const p3Keywords = [
    'typo', 'spelling', 'grammar', 'text', 'label', 'tooltip',
    'cosmetic', 'visual', 'aesthetic', 'alignment', 'padding', 'margin',
    'color', 'font', 'icon', 'image', 'logo', 'badge',
    'help', 'documentation', 'hint', 'instruction',
    'non-critical', 'minor', 'low impact', 'edge case',
    'animation', 'transition', 'hover', 'focus'
  ];
  
  // URL patterns for critical paths
  const criticalUrlPatterns = [
    'login', 'auth', 'signup', 'register', 'password', 'checkout',
    'payment', 'billing', 'account', 'admin', 'purchase', 'order'
  ];
  
  // Check if the URL indicates a critical path
  if (url) {
    for (const pattern of criticalUrlPatterns) {
      if (url.includes(pattern)) {
        return SEVERITY_LEVELS.P1;
      }
    }
  }
  
  // Check for critical error patterns
  if (errorMessage.includes('500') || 
      errorMessage.includes('server error') || 
      errorMessage.includes('crash') || 
      errorMessage.includes('database') ||
      errorMessage.includes('cannot connect') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('authentication failed') ||
      errorMessage.includes('permission denied') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden')) {
    return SEVERITY_LEVELS.P1;
  }
  
  // Check for P1 keywords in test name, description, or error message
  for (const keyword of p1Keywords) {
    if (
      testName.includes(keyword) || 
      testDescription.includes(keyword) || 
      errorMessage.includes(keyword)
    ) {
      return SEVERITY_LEVELS.P1;
    }
  }
  
  // Check for P2 keywords
  for (const keyword of p2Keywords) {
    if (
      testName.includes(keyword) || 
      testDescription.includes(keyword) || 
      errorMessage.includes(keyword)
    ) {
      return SEVERITY_LEVELS.P2;
    }
  }
  
  // Check for P3 keywords that specifically indicate minor issues
  for (const keyword of p3Keywords) {
    if (
      testName.includes(keyword) || 
      testDescription.includes(keyword) || 
      errorMessage.includes(keyword)
    ) {
      return SEVERITY_LEVELS.P3;
    }
  }
  
  // Special check for "dashboard" and related terms as this could be a P2
  if (testName.includes('dashboard') || testDescription.includes('dashboard') || 
      testName.includes('report') || testDescription.includes('report')) {
    return SEVERITY_LEVELS.P2;
  }
  
  // If the test category is related to core functionality, consider it P2
  if (category.includes('core') || category.includes('main') || 
      category.includes('critical') || category.includes('essential')) {
    return SEVERITY_LEVELS.P2;
  }
  
  // Default to P3 for all other cases
  return SEVERITY_LEVELS.P3;
}; 