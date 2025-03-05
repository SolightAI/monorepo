import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import testData from './data.json';
import AnimatedBackground from '../components/AnimatedBackground';
import logo from '../components/images/laneo_logo.jpg'; // Import the logo

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
  
  // Add state for floating elements
  const [floatingElements, setFloatingElements] = useState([
    { id: 1, type: 'tickbox', position: { top: '15%', left: '15%' }, visible: true },
    { id: 2, type: 'error', position: { top: '25%', right: '20%' }, visible: true },
    { id: 3, type: 'tickbox', position: { bottom: '20%', right: '25%' }, visible: true },
    { id: 4, type: 'error', position: { bottom: '30%', left: '20%' }, visible: true },
    { id: 5, type: 'tickbox', position: { top: '40%', left: '10%' }, visible: true },
    { id: 6, type: 'error', position: { bottom: '15%', right: '15%' }, visible: true },
    { id: 7, type: 'tickbox', position: { top: '10%', right: '30%' }, visible: true },
    { id: 8, type: 'error', position: { bottom: '40%', left: '30%' }, visible: true },
  ]);

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

    // Add a 15-second loading delay for demo purposes
    setTimeout(() => {
      setResults(sortedResults);
      setIsLoading(false);
      
      // Scroll to results after loading
      const scrollTimer = setTimeout(() => {
        document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });
      }, 500);
      
      return () => clearTimeout(scrollTimer);
    }, 15000); // 15 seconds loading time
    
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
    <div className="relative min-h-screen bg-gray-900 pb-12">
      <AnimatedBackground theme="dark" />
      
      {/* Floating elements */}
      {floatingElements.map((element) => (
        <div
          key={element.id}
          className={`absolute z-5 opacity-30 hover:opacity-60 transition-opacity duration-300 ${
            element.visible ? 'animate-float' : 'hidden'
          }`}
          style={{
            ...element.position,
            animation: `float ${3 + element.id % 2}s ease-in-out infinite`,
          }}
        >
          {element.type === 'tickbox' ? (
            <div className="bg-green-500/20 p-3 rounded-lg backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="bg-red-500/20 p-3 rounded-lg backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
      ))}

      {/* Header with test parameters - always visible */}
      <header className="relative z-10 bg-gray-800 shadow-md border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center mb-4 sm:mb-0">
              <img 
                src={logo} 
                alt="Laneo Logo" 
                className="h-8 mr-2 filter brightness-0 invert" 
              />
              <h1 className="text-xl font-bold text-white">Laneo</h1>
            </div>
            <button
              onClick={handleStartOver}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Test another website
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 text-sm">
            <div className="bg-gray-700 rounded-md p-3">
              <span className="font-semibold text-gray-300">URL:</span> 
              <span className="ml-2 text-gray-200">{url}</span>
            </div>
            <div className="bg-gray-700 rounded-md p-3">
              <span className="font-semibold text-gray-300">Test Type:</span> 
              <span className="ml-2 text-gray-200">{getTestTypeLabel(testType)}</span>
            </div>
            {typeDetails && (
              <div className="bg-gray-700 rounded-md p-3">
                <span className="font-semibold text-gray-300">
                  {testType === 'user-story' ? 'User Story Details:' : 'Section Details:'}
                </span> 
                <div className="mt-1 text-gray-200">{typeDetails}</div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-4">
            <p className="text-sm text-gray-400">Step 3 of 3</p>
          </div>
        </div>
      </header>

      {/* Test results section */}
      <div id="results-container" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-300">Analyzing website and generating test results...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Test Details</h2>

              {/* Category filter */}
              {results.length > 0 && (
                <div className="flex items-center">
                  <label htmlFor="category-filter" className="mr-2 text-sm font-medium text-gray-300">
                    Filter by category:
                  </label>
                  <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="form-select rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
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
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-300">Generating test results...</p>
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
      
      {/* Add CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default TestResults; 