import { estimateSeverityLevel, getSeverityInfo, SEVERITY_LEVELS } from './severityUtils';

describe('getSeverityInfo', () => {
  test('should return correct information for P1 severity', () => {
    const info = getSeverityInfo(SEVERITY_LEVELS.P1);
    expect(info.name).toBe('Critical');
    expect(info.colorClasses).toContain('bg-red-100');
  });

  test('should return correct information for P2 severity', () => {
    const info = getSeverityInfo(SEVERITY_LEVELS.P2);
    expect(info.name).toBe('High');
    expect(info.colorClasses).toContain('bg-orange-100');
  });

  test('should return correct information for P3 severity', () => {
    const info = getSeverityInfo(SEVERITY_LEVELS.P3);
    expect(info.name).toBe('Medium');
    expect(info.colorClasses).toContain('bg-yellow-100');
  });

  test('should return unknown for invalid severity', () => {
    const info = getSeverityInfo('invalid');
    expect(info.name).toBe('Unknown');
  });
});

describe('estimateSeverityLevel', () => {
  test('should return P1 for login failure', () => {
    const testData = {
      name: 'User Login Test',
      description: 'Test user authentication',
      url: 'https://example.com/login',
      category: 'SMOKE'
    };
    const errorDetails = {
      message: 'Authentication failed. User unable to login.'
    };
    
    expect(estimateSeverityLevel(testData, errorDetails)).toBe(SEVERITY_LEVELS.P1);
  });

  test('should return P1 for checkout failure', () => {
    const testData = {
      name: 'Checkout Process',
      description: 'Test payment processing',
      url: 'https://example.com/checkout',
      category: 'END_TO_END'
    };
    const errorDetails = {
      message: 'Payment gateway error'
    };
    
    expect(estimateSeverityLevel(testData, errorDetails)).toBe(SEVERITY_LEVELS.P1);
  });

  test('should return P1 for server errors', () => {
    const testData = {
      name: 'Data Retrieval Test',
      description: 'Test data fetching',
      url: 'https://example.com/data',
      category: 'SMOKE'
    };
    const errorDetails = {
      message: '500 Internal Server Error occurred'
    };
    
    expect(estimateSeverityLevel(testData, errorDetails)).toBe(SEVERITY_LEVELS.P1);
  });
  
  test('should return P2 for dashboard display issues', () => {
    const testData = {
      name: 'Dashboard Metrics',
      description: 'Test dashboard display',
      url: 'https://example.com/dashboard',
      category: 'SMOKE'
    };
    const errorDetails = {
      message: 'Dashboard metrics failed to load'
    };
    
    expect(estimateSeverityLevel(testData, errorDetails)).toBe(SEVERITY_LEVELS.P2);
  });
  
  test('should return P2 for search functionality', () => {
    const testData = {
      name: 'Search Function',
      description: 'Test search feature',
      url: 'https://example.com/search',
      category: 'SMOKE'
    };
    const errorDetails = {
      message: 'Search results not displaying correctly'
    };
    
    expect(estimateSeverityLevel(testData, errorDetails)).toBe(SEVERITY_LEVELS.P2);
  });
  
  test('should return P3 for UI styling issues', () => {
    const testData = {
      name: 'Page Layout',
      description: 'Test layout styling',
      url: 'https://example.com/home',
      category: 'SMOKE'
    };
    const errorDetails = {
      message: 'Button has incorrect color'
    };
    
    expect(estimateSeverityLevel(testData, errorDetails)).toBe(SEVERITY_LEVELS.P3);
  });
  
  test('should return P3 for spelling/grammar issues', () => {
    const testData = {
      name: 'Content Review',
      description: 'Test page content',
      url: 'https://example.com/about',
      category: 'SMOKE'
    };
    const errorDetails = {
      message: 'Found typo in about page text'
    };
    
    expect(estimateSeverityLevel(testData, errorDetails)).toBe(SEVERITY_LEVELS.P3);
  });

  test('should default to P3 when no test data is provided', () => {
    expect(estimateSeverityLevel(null, { message: 'Error occurred' })).toBe(SEVERITY_LEVELS.P3);
  });

  test('should handle empty error details', () => {
    const testData = {
      name: 'Generic Test',
      description: 'Test generic functionality',
      url: 'https://example.com/test',
      category: 'SMOKE'
    };
    
    expect(estimateSeverityLevel(testData, {})).toBe(SEVERITY_LEVELS.P3);
  });
}); 