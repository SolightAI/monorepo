import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RefreshCw,
  Beaker,
} from 'lucide-react';
import axios from 'axios';
import TestDetails from '@/components/test/TestDetails';
import { API_URL } from '@/config';
import { getTestsByFeature, getTestsByEpic, getTestsByProduct } from '@/services/testService';
import { useProduct } from '@/contexts/ProductContext';
import { getStatusIconLarge, TEST_STATUS, EXECUTOR_TYPE } from '@/utils/testExecutionUtils';
import { formatDate } from '@/utils/dateUtils';

/**
 * Component for displaying and filtering tests in a table format
 */
const TestsTable = () => {
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedFeature, setSelectedFeature] = useState('all');
  const [selectedEpic, setSelectedEpic] = useState('all');
  const [features, setFeatures] = useState([]);
  const [epics, setEpics] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [successMessage, setSuccessMessage] = useState(null);
  const { productId } = useParams();
  const { selectedProduct } = useProduct();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialFeatureId = searchParams.get('featureId');
  const initialEpicId = searchParams.get('epicId');

  /**
   * Sort tests by the specified key and direction
   *
   * @param {Array} testsToSort - Tests to sort
   * @param {Object} config - Sort configuration
   * @returns {Array} Sorted tests
   */
  const sortTests = (testsToSort, config) => {
    if (!config.key) return testsToSort;

    return [...testsToSort].sort((a, b) => {
      // Handle null or undefined values
      if (!a[config.key] && !b[config.key]) return 0;
      if (!a[config.key]) return config.direction === 'asc' ? -1 : 1;
      if (!b[config.key]) return config.direction === 'asc' ? 1 : -1;

      // Compare dates
      if (config.key === 'started_at' || config.key === 'ended_at') {
        const dateA = a[config.key] ? new Date(a[config.key]) : new Date(0);
        const dateB = b[config.key] ? new Date(b[config.key]) : new Date(0);
        return config.direction === 'asc'
          ? dateA - dateB
          : dateB - dateA;
      }

      // Compare strings
      if (typeof a[config.key] === 'string' && typeof b[config.key] === 'string') {
        return config.direction === 'asc'
          ? a[config.key].localeCompare(b[config.key])
          : b[config.key].localeCompare(a[config.key]);
      }

      // Compare numbers or other types
      return config.direction === 'asc'
        ? a[config.key] > b[config.key] ? 1 : -1
        : a[config.key] < b[config.key] ? 1 : -1;
    });
  };

  /**
   * Apply filters to tests based on status and search query
   *
   * @param {Array} testsToFilter - Tests to filter
   * @param {string} status - Status filter
   * @param {string} query - Search query
   */
  const applyFilters = (testsToFilter, status, query) => {
    let filtered = testsToFilter;

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter(test =>
        test.status?.toLowerCase() === status.toLowerCase()
      );
    }

    // Filter by search query
    if (query.trim() !== '') {
      const lowerCaseQuery = query.toLowerCase();
      filtered = filtered.filter(test =>
        test.name.toLowerCase().includes(lowerCaseQuery) ||
        test.description.toLowerCase().includes(lowerCaseQuery) ||
        test.url.toLowerCase().includes(lowerCaseQuery)
      );
    }

    // Sort filtered tests
    const sortedTests = sortTests(filtered, sortConfig);
    setFilteredTests(sortedTests);
  };

  /**
   * Fetch tests by product ID
   *
   * @param {string} productId - Product ID
   */
  const fetchTestsByProduct = async (productId) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tests for the product
      const testsData = await getTestsByProduct(productId);
      setTests(testsData);

      // Initial filtering and sorting
      applyFilters(testsData, selectedStatus, searchQuery);

      // Fetch related data for filtering
      fetchFeaturesAndEpics(productId);
    } catch (err) {
      console.error('Error fetching tests:', err);
      setError('Failed to load tests data. Please try again later.');
      setFilteredTests([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch features and epics for filtering
   *
   * @param {string} productId - Product ID
   */
  const fetchFeaturesAndEpics = async (productId) => {
    try {
      // Fetch epics
      const epicsResponse = await axios.get(`${API_URL}/products/${productId}/epics`, {
        withCredentials: true
      });
      setEpics(epicsResponse.data);

      // Fetch features
      const allFeatures = [];
      for (const epic of epicsResponse.data) {
        const featuresResponse = await axios.get(`${API_URL}/epics/${epic.id}/features`, {
          withCredentials: true
        });
        allFeatures.push(...featuresResponse.data);
      }
      setFeatures(allFeatures);

      // Set initial feature or epic if provided in URL
      if (initialFeatureId) {
        setSelectedFeature(initialFeatureId);
        getTestsByFeature(initialFeatureId).then(testsData => {
          setTests(testsData);
          applyFilters(testsData, selectedStatus, searchQuery);
        });
      } else if (initialEpicId) {
        setSelectedEpic(initialEpicId);
        getTestsByEpic(initialEpicId).then(testsData => {
          setTests(testsData);
          applyFilters(testsData, selectedStatus, searchQuery);
        });
      }
    } catch (err) {
      console.error('Error fetching features/epics:', err);
      // We don't set the global error here as it's not a critical failure
    }
  };

  // Initial load
  useEffect(() => {
    if (productId) {
      fetchTestsByProduct(productId);
    }
  }, [productId]);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prevConfig => {
      const newDirection = prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc';
      const newConfig = { key, direction: newDirection };

      // Apply new sort config
      const sortedTests = sortTests(filteredTests, newConfig);
      setFilteredTests(sortedTests);

      return newConfig;
    });
  };

  // Get sort icon for the table header
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  const handleTestSelect = (test) => {
    setSelectedTest(test);
  };

  const handleTestClose = () => {
    setSelectedTest(null);
    // Refresh tests list after viewing test details with current filters
    if (selectedFeature !== 'all') {
      getTestsByFeature(selectedFeature).then(testsData => {
        setTests(testsData);
        applyFilters(testsData, selectedStatus, searchQuery);
      }).catch(err => {
        console.error('Error fetching tests:', err);
        setError('Failed to load tests data. Please try again later.');
        setFilteredTests([]);
      });
    } else if (selectedEpic !== 'all') {
      getTestsByEpic(selectedEpic).then(testsData => {
        setTests(testsData);
        applyFilters(testsData, selectedStatus, searchQuery);
      }).catch(err => {
        console.error('Error fetching tests:', err);
        setError('Failed to load tests data. Please try again later.');
        setFilteredTests([]);
      });
    } else {
      fetchTestsByProduct(selectedProduct.id);
    }
  };

  // Handle running selected tests (filtered tests)
  const handleRunSelectedTests = async () => {
    try {
      if (filteredTests.length === 0) {
        setError('No tests selected to run. Try adjusting your filters.');
        setSuccessMessage(null);
        return;
      }

      setError(null);
      setSuccessMessage(null);
      setLoading(true);

      let testCount = 0;

      // Run each filtered test
      for (const test of filteredTests) {
        try {
          const executionData = {
            test_id: test.id,
            status: TEST_STATUS.PENDING,
            environment: 'development',
            executor_type: EXECUTOR_TYPE.MANUAL,
            notes: null
          };

          await axios.post(`${API_URL}/test-executions/`, executionData, {
            withCredentials: true
          });

          testCount++;
        } catch (testErr) {
          console.error(`Error running test ${test.id}:`, testErr);
          // Continue with other tests
        }
      }

      // Show appropriate message based on results
      if (testCount > 0) {
        setSuccessMessage(`Successfully started ${testCount} tests.`);
        setError(null);
      } else {
        setError('Failed to start any tests. Please try again.');
        setSuccessMessage(null);
      }

      // Refresh the tests list while maintaining the current filters
      await refreshTestsWithCurrentFilters();

    } catch (err) {
      console.error('Error running selected tests:', err);
      setError('Failed to run selected tests. Please try again.');
      setSuccessMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to refresh tests while maintaining current filters
  const refreshTestsWithCurrentFilters = async () => {
    try {
      // Re-fetch tests based on the current filter selections
      if (selectedFeature !== 'all') {
        const testsData = await getTestsByFeature(selectedFeature);
        setTests(testsData);
        applyFilters(testsData, selectedStatus, searchQuery);
      } else if (selectedEpic !== 'all') {
        const testsData = await getTestsByEpic(selectedEpic);
        setTests(testsData);
        applyFilters(testsData, selectedStatus, searchQuery);
      } else {
        await fetchTestsByProduct(selectedProduct.id);
      }
    } catch (err) {
      console.error('Error refreshing tests:', err);
      // Don't show error as this is just a refresh, and the main action (running tests) was successful
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-lg">Loading tests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => fetchTestsByProduct(selectedProduct.id)}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-red-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {selectedTest ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <TestDetails test={selectedTest} onClose={handleTestClose} />
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <Beaker className="mr-2" size={24} />
              All Tests
            </h1>
          </div>

          {/* Add success message display */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-700 rounded-lg flex items-start">
              <p>{successMessage}</p>
            </div>
          )}

          {/* All filters in one row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">
            {/* Search input */}
            <div className="relative w-full sm:w-64 lg:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  applyFilters(tests, selectedStatus, e.target.value);
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Feature filter */}
            <div className="relative w-full sm:w-48">
              <select
                value={selectedFeature}
                onChange={(e) => {
                  const featureId = e.target.value;
                  setSelectedFeature(featureId);
                  // Clear epic selection when feature is selected
                  if (featureId !== 'all') {
                    setSelectedEpic('all');
                    getTestsByFeature(featureId).then(testsData => {
                      setTests(testsData);
                      applyFilters(testsData, selectedStatus, searchQuery);
                    }).catch(err => {
                      console.error('Error fetching tests:', err);
                    });
                  } else if (selectedEpic !== 'all') {
                    // If feature is set to 'all' but epic is selected, keep epic filter
                    getTestsByEpic(selectedEpic).then(testsData => {
                      setTests(testsData);
                      applyFilters(testsData, selectedStatus, searchQuery);
                    }).catch(err => {
                      console.error('Error fetching tests:', err);
                    });
                  } else {
                    // If both are 'all', fetch all tests for the product
                    fetchTestsByProduct(selectedProduct.id);
                  }
                }}
                className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
              >
                <option value="all">All Features</option>
                {features.map(feature => (
                  <option key={feature.id} value={feature.id}>{feature.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Filter size={18} className="text-gray-400" />
              </div>
            </div>

            {/* Epic filter */}
            <div className="relative w-full sm:w-48">
              <select
                value={selectedEpic}
                onChange={(e) => {
                  const epicId = e.target.value;
                  setSelectedEpic(epicId);
                  // Clear feature selection when epic is selected
                  if (epicId !== 'all') {
                    setSelectedFeature('all');
                    getTestsByEpic(epicId).then(testsData => {
                      setTests(testsData);
                      applyFilters(testsData, selectedStatus, searchQuery);
                    }).catch(err => {
                      console.error('Error fetching tests:', err);
                    });
                  } else if (selectedFeature !== 'all') {
                    // If epic is set to 'all' but feature is selected, keep feature filter
                    getTestsByFeature(selectedFeature).then(testsData => {
                      setTests(testsData);
                      applyFilters(testsData, selectedStatus, searchQuery);
                    }).catch(err => {
                      console.error('Error fetching tests:', err);
                    });
                  } else {
                    // If both are 'all', fetch all tests for the product
                    fetchTestsByProduct(selectedProduct.id);
                  }
                }}
                className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
              >
                <option value="all">All Epics</option>
                {epics.map(epic => (
                  <option key={epic.id} value={epic.id}>{epic.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Filter size={18} className="text-gray-400" />
              </div>
            </div>

            {/* Status filter */}
            <div className="relative w-full sm:w-48">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  applyFilters(tests, e.target.value, searchQuery);
                }}
                className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="blocked">Blocked</option>
                <option value="not_started">Not Started</option>
                <option value="agent_limitation">Agent Limitation</option>
                <option value="unexisting_feature">Unexisting Feature</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Filter size={18} className="text-gray-400" />
              </div>
            </div>

            {/* Run selected tests button */}
            <button
              onClick={handleRunSelectedTests}
              disabled={loading || filteredTests.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw size={18} className="mr-2" />
                  Run Tests ({filteredTests.length})
                </>
              )}
            </button>
          </div>

          {/* Tests table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Test Name
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('started_at')}
                    >
                      <div className="flex items-center">
                        Last Run
                        {getSortIcon('started_at')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Feature
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTests.length > 0 ? (
                    filteredTests.map(test => (
                      <tr
                        key={test.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleTestSelect(test)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{test.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{test.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIconLarge(test.status)}
                            <span className="ml-2 text-sm">
                              {test.status ? test.status.replace('_', ' ') : 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            {test.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(test.started_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {features.find(f => f.id === test.feature_id)?.name || 'Unknown'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        No tests found matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TestsTable;
