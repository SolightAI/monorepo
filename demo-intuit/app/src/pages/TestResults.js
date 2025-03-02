import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import testData from './data.json';

const TestResultItem = ({ test }) => {
  const [showCode, setShowCode] = useState(false);

  // Category badge color mapping
  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case 'Happy path': return 'bg-blue-100 text-blue-800';
      case 'Negative path': return 'bg-purple-100 text-purple-800';
      case 'Integration': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Severity badge color mapping
  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'bg-red-200 text-red-800';
      case 'High': return 'bg-orange-200 text-orange-800';
      case 'Medium': return 'bg-yellow-200 text-yellow-800';
      case 'Low': return 'bg-gray-200 text-gray-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className="mb-6 bg-white border rounded-lg overflow-hidden shadow-sm">
      <div className={`px-4 py-3 flex justify-between items-center border-b ${
        test.status === 'passed' ? 'bg-green-50' :
        test.status === 'failed' ? 'bg-red-50' : 'bg-yellow-50'
      }`}>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${
            test.status === 'passed' ? 'bg-green-500' :
            test.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <h3 className="font-semibold text-gray-800">{test.name}</h3>
          <span className={`ml-3 text-xs px-2 py-1 rounded-full font-medium ${getCategoryBadgeColor(test.category)}`}>
            {test.category}
          </span>
          {test.status === 'failed' && (
            <span className={`ml-3 text-xs px-2 py-1 rounded-full font-medium ${getSeverityBadgeColor(test.severity)}`}>
              Severity: {test.severity}
            </span>
          )}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <span className="mr-4">Duration: {test.duration}</span>
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        </div>
      </div>

      {showCode && (
        <div className="p-4 bg-gray-800 text-gray-100 overflow-x-auto">
          <pre className="text-sm font-mono">{test.code}</pre>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex flex-col space-y-2">
          {test.steps.map((step, i) => (
            <div key={i} className="flex items-start">
              <div className={`mt-1 w-4 h-4 rounded-full flex-shrink-0 ${
                step.status === 'passed' ? 'bg-green-100 text-green-500' :
                step.status === 'failed' ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-500'
              } flex items-center justify-center text-xs`}>
                {step.status === 'passed' ? '✓' : step.status === 'failed' ? '✗' : '!'}
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">{step.description}</p>
                {step.status === 'failed' && test.reason && (
                  <p className="text-xs text-red-600 mt-1">Reason: {test.reason}</p>
                )}
                {step.error && <p className="text-xs text-red-600 mt-1">{step.error}</p>}
                {step.warning && <p className="text-xs text-yellow-600 mt-1">{step.warning}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TestResults = () => {
  const [url, setUrl] = useState('');
  const [testType, setTestType] = useState('');
  const [typeDetails, setTypeDetails] = useState('');
  const [results, setResults] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get data from session storage
    const savedUrl = sessionStorage.getItem('testUrl');
    const savedTestType = sessionStorage.getItem('testType');
    const savedTypeDetails = sessionStorage.getItem('typeDetails');
    
    if (!savedUrl || !savedTestType) {
      // Redirect back to the first step if data is not available
      navigate('/');
      return;
    }
    
    setUrl(savedUrl);
    setTestType(savedTestType);
    if (savedTypeDetails) {
      setTypeDetails(savedTypeDetails);
    }

    // Check if we should skip loading state
    const shouldSkipLoading = 
      savedUrl === 'https://quickbooks.intuit.com/global/' &&
      savedTestType === 'specific-section' &&
      savedTypeDetails === 'Focus on the main landing page of the "global" marketing website. No need to explore other part of the website.';

    if (!shouldSkipLoading) {
      // Keep loading state
      return;
    }
    
    // Sort results: failed tests first, sorted by severity
    const severityOrder = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
    const sortedResults = testData
      .filter(test => !test.internal_error)
      .map(test => {
        const steps = test.test_case.steps.map(step => ({
          description: step,
          status: test.did_the_test_pass ? 'passed' : 'passed' // Default to passed
        }));
        // If the test failed, mark the last step as failed
        if (!test.did_the_test_pass) {
          steps[steps.length - 1].status = 'failed';
        }
        return {
          id: test.test_case.name,
          name: test.test_case.name,
          reason: test.reason,
          status: test.did_the_test_pass ? 'passed' : 'failed',
          duration: 'N/A', // Duration is not available in data.json
          category: test.test_case.category,
          code: '', // Code is not available in data.json
          steps,
          severity: test.test_case.severity,
        };
      })
      .sort((a, b) => {
        if (a.status === 'failed' && b.status === 'failed') {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return a.status === 'failed' ? -1 : 1;
      });

    setResults(sortedResults);
    setIsLoading(false);
    
    // Simulate loading delay
    const timer = setTimeout(() => {
      document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });
    }, 500);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  const getTestTypeLabel = (type) => {
    switch (type) {
      case 'user-story': return 'User Story';
      case 'specific-section': return 'Specific Section';
      case 'whole-website': return 'Whole Website';
      default: return type;
    }
  };

  const getStatusSummary = () => {
    if (!results.length) return {};
    
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const warnings = results.filter(r => r.status === 'warning').length;

    return { total, passed, failed, warnings };
  };

  // Get all unique categories from results
  const getCategories = () => {
    if (!results.length) return [];
    const categories = new Set(results.map(r => r.category));
    return ['All', ...categories];
  };

  // Get category summary counts
  const getCategorySummary = () => {
    if (!results.length) return {};

    const summary = {};
    results.forEach(test => {
      if (!summary[test.category]) {
        summary[test.category] = 0;
      }
      summary[test.category]++;
    });

    return summary;
  };

  const statusSummary = getStatusSummary();
  const categories = getCategories();
  const categorySummary = getCategorySummary();

  // Filter results by selected category
  const filteredResults = selectedCategory === 'All'
    ? results
    : results.filter(r => r.category === selectedCategory);

  const handleStartOver = () => {
    // Clear session storage and redirect to first step
    sessionStorage.removeItem('testUrl');
    sessionStorage.removeItem('testType');
    sessionStorage.removeItem('typeDetails');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header with test parameters - always visible */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Laneo</h1>
            <button
              onClick={handleStartOver}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Test another website
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 text-sm">
            <div className="bg-gray-100 rounded-md p-3">
              <span className="font-semibold text-gray-700">URL:</span> 
              <span className="ml-2 text-gray-800">{url}</span>
            </div>
            <div className="bg-gray-100 rounded-md p-3">
              <span className="font-semibold text-gray-700">Test Type:</span> 
              <span className="ml-2 text-gray-800">{getTestTypeLabel(testType)}</span>
            </div>
            {typeDetails && (
              <div className="bg-gray-100 rounded-md p-3">
                <span className="font-semibold text-gray-700">
                  {testType === 'user-story' ? 'User Story Details:' : 'Section Details:'}
                </span> 
                <div className="mt-1 text-gray-800">{typeDetails}</div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Test results section */}
      <div id="results-container" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Analyzing website and generating test results...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Test Details</h2>

              {/* Category filter */}
              {results.length > 0 && (
                <div className="flex items-center">
                  <label htmlFor="category-filter" className="mr-2 text-sm font-medium text-gray-700">
                    Filter by category:
                  </label>
                  <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="form-select rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <div className="bg-white rounded-lg border p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Generating test results...</p>
              </div>
            ) : (
              <div>
                {filteredResults.map(test => (
                  <TestResultItem key={test.id} test={test} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TestResults; 