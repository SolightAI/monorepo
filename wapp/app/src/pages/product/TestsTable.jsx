import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  Search,
  ChevronUp,
  ChevronDown,
  Calendar,
  Beaker,
  Layers,
  FileText,
  Play
} from 'lucide-react';
import axios from 'axios';
import { getTestsByFeature, getTestsByEpic, getTestsByProduct } from '@/services/testService';
import { getAllEpics, getFeaturesByEpic } from '@/services/productService';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
import TestDetailsModal from '@/components/modals/TestDetailsModal';
import { getStatusIconLarge, formatStatus, getStatusColorClasses } from '@/utils/testExecutionUtils';
import { formatDate } from '@/utils/dateUtils';

/**
 * Displays all tests in a tabular format with sorting and filtering capabilities
 */
const TestsTable = () => {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [selectedTest, setSelectedTest] = useState(null);
  const [epics, setEpics] = useState([]);
  const [features, setFeatures] = useState([]);
  const [selectedEpic, setSelectedEpic] = useState('all');
  const [selectedFeature, setSelectedFeature] = useState('all');
  const [epicFeaturesMap, setEpicFeaturesMap] = useState({});
  const [loadingEpics, setLoadingEpics] = useState(false);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const navigate = useNavigate();
  const { selectedProduct } = useProduct();
  const { selectedOrganization } = useOrganization();

  useEffect(() => {
    if (selectedProduct && selectedOrganization) {
      console.log('Selected product:', selectedProduct);
      console.log('Selected organization:', selectedOrganization);
      fetchTestsByProduct(selectedProduct.id);
      fetchEpicsAndFeatures();
    }
  }, [selectedProduct, selectedOrganization]);

  // Add console logs for epics and features state changes
  useEffect(() => {
    console.log('Epics updated:', epics);
  }, [epics]);

  useEffect(() => {
    console.log('Features updated:', features);
  }, [features]);

  // Fetch epic-specific features when an epic is selected
  useEffect(() => {
    if (selectedEpic !== 'all') {
      fetchFeaturesByEpic(selectedEpic);
    } else {
      setSelectedFeature('all');
      setFeatures(Object.values(epicFeaturesMap).flat());
    }
  }, [selectedEpic, epicFeaturesMap]);

  const fetchEpicsAndFeatures = async () => {
    try {
      setLoadingEpics(true);
      setLoadingFeatures(true);

      if (!selectedProduct || !selectedOrganization?.id) {
        console.error('No product or organization selected:', {
          selectedProduct,
          selectedOrganization,
          productId: selectedProduct?.id,
          orgId: selectedOrganization?.id
        });
        setEpics([]);
        setFeatures([]);
        setLoadingEpics(false);
        setLoadingFeatures(false);
        return;
      }

      console.log('Fetching epics for:', {
        productId: selectedProduct.id,
        orgId: selectedOrganization.id
      });

      // Fetch epics for the current product
      const epicsData = await getAllEpics(selectedProduct.id, selectedOrganization.id);
      console.log('Fetched epics data:', epicsData);

      if (!Array.isArray(epicsData) || epicsData.length === 0) {
        console.warn('No epics data returned or empty array');
        setEpics([]);
      } else {
        setEpics(epicsData);
      }

      // Create a mapping of epic ID to features
      const featuresMap = {};
      const fetchPromises = epicsData.map(async (epic) => {
        if (!epic.id) {
          console.error('Epic missing ID:', epic);
          return [];
        }
        console.log('Fetching features for epic:', epic.id);
        const epicFeatures = await getFeaturesByEpic(epic.id);
        console.log('Features for epic', epic.id, ':', epicFeatures);
        featuresMap[epic.id] = epicFeatures;
        return epicFeatures;
      });

      const allFeaturesArrays = await Promise.all(fetchPromises);
      const allFeatures = allFeaturesArrays.flat();
      console.log('All features:', allFeatures);

      setEpicFeaturesMap(featuresMap);
      setFeatures(allFeatures);
    } catch (err) {
      console.error('Error fetching epics and features:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setEpics([]);
      setFeatures([]);
    } finally {
      setLoadingEpics(false);
      setLoadingFeatures(false);
    }
  };

  const fetchFeaturesByEpic = async (epicId) => {
    if (epicFeaturesMap[epicId]) {
      setFeatures(epicFeaturesMap[epicId]);
    } else {
      try {
        setLoadingFeatures(true);
        const featuresData = await getFeaturesByEpic(epicId);
        const updatedMap = { ...epicFeaturesMap, [epicId]: featuresData };
        setEpicFeaturesMap(updatedMap);
        setFeatures(featuresData);
      } catch (err) {
        console.error(`Error fetching features for epic ${epicId}:`, err);
      } finally {
        setLoadingFeatures(false);
      }
    }
  };

  // Centralized error handling function
  const handleFetchError = (action, err) => {
    console.error(`Error ${action}:`, err);
    setError(`Failed to ${action}. Please try again later.`);
    setLoading(false);
  };

  const fetchTestsByProduct = async (productId) => {
    try {
      setLoading(true);
      setError(null);
      const testsData = await getTestsByProduct(productId);
      setTests(testsData);
      applyFilters(testsData, selectedStatus, searchQuery);
    } catch (err) {
      handleFetchError('load tests data', err);
      setFilteredTests([]);
    } finally {
      setLoading(false);
    }
  };

  // Sort function that can be reused across the component
  const sortItems = (items, key, direction) => {
    return [...items].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const applyFilters = (testsToFilter = tests, statusOverride = null, queryOverride = null) => {
    let result = [...testsToFilter];

    // Use the status override if provided, otherwise use the state
    const filterStatus = statusOverride !== null ? statusOverride : selectedStatus;

    // Apply status filter
    if (filterStatus !== 'all') {
      // Log test statuses to help with debugging
      if (result.length > 0) {
        console.log("Test statuses examples:", result.slice(0, 3).map(test => test.status));
        console.log("Filtering by status:", filterStatus);
      }

      result = result.filter(test => {
        const testStatus = test.status?.toLowerCase();
        return testStatus === filterStatus;
      });
    }

    // Apply search filter (case-insensitive)
    // Use the query override if provided, otherwise use the state
    const filterQuery = queryOverride !== null ? queryOverride : searchQuery;

    if (filterQuery) {
      const lowercaseQuery = filterQuery.toLowerCase();
      result = result.filter(test =>
        test.name.toLowerCase().includes(lowercaseQuery) ||
        test.description.toLowerCase().includes(lowercaseQuery)
      );
    }

    // Apply sorting using the reusable function
    result = sortItems(result, sortConfig.key, sortConfig.direction);
    setFilteredTests(result);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const newSortConfig = { key, direction };
    setSortConfig(newSortConfig);

    // Re-sort the filtered tests using the reusable function
    const sorted = sortItems(filteredTests, key, direction);
    setFilteredTests(sorted);
  };

  // Centralized function to fetch tests based on the current filters
  const fetchTestsWithCurrentFilters = async () => {
    try {
      setLoading(true);
      setError(null);

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
      handleFetchError('load tests data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEpicChange = (epicId) => {
    setSelectedEpic(epicId);
    if (epicId === 'all') {
      setSelectedFeature('all');
      // Refresh tests with product ID
      fetchTestsByProduct(selectedProduct.id);
    } else {
      // Get tests for the epic using the centralized fetch function
      fetchTestsWithCurrentFilters();
    }
  };

  const handleFeatureChange = (featureId) => {
    setSelectedFeature(featureId);
    // Use the centralized fetch function for any filter change
    fetchTestsWithCurrentFilters();
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  const getStatusIcon = (status) => {
    return getStatusIconLarge(status);
  };

  const handleTestSelect = (test) => {
    setSelectedTest(test);
  };

  const handleTestClose = () => {
    setSelectedTest(null);
    // We don't need to refresh on every close - TestDetailsModal will call onTestUpdated when there's an actual change
  };

  // This function will be called only when a test is actually updated
  const handleTestUpdated = () => {
    // Refresh tests list after viewing test details with current filters
    fetchTestsWithCurrentFilters();
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
            status: 'PENDING',
            environment: 'development',
            executor_type: 'MANUAL',
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

      // Refresh the tests list using the centralized function
      await fetchTestsWithCurrentFilters();

    } catch (err) {
      handleFetchError('run selected tests', err);
      setSuccessMessage(null);
    } finally {
      setLoading(false);
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
      {/* Render test details modal conditionally without affecting main content */}
      {selectedTest && (
        <TestDetailsModal
          test={selectedTest}
          onClose={handleTestClose}
          onTestUpdated={handleTestUpdated}
        />
      )}

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
              const newQuery = e.target.value;
              setSearchQuery(newQuery);
              // Pass the new query directly to applyFilters
              applyFilters(tests, selectedStatus, newQuery);
            }}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status filter */}
        <div className="relative w-full sm:w-48">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter size={18} className="text-gray-400" />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => {
              const newStatus = e.target.value;
              setSelectedStatus(newStatus);
              // Pass the new status value directly to applyFilters
              applyFilters(tests, newStatus);
            }}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="not_started">Not Started</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {/* Epic filter */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Layers size={18} className="text-gray-400" />
          </div>
          <select
            value={selectedEpic}
            onChange={(e) => handleEpicChange(e.target.value)}
            disabled={loadingEpics}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">All Epics</option>
            {Array.isArray(epics) && epics.length > 0 ? (
              epics.map(epic => {
                console.log('Rendering epic option:', epic);
                return (
                  <option key={epic.id} value={epic.id}>
                    {epic.name || 'Unnamed Epic'}
                  </option>
                );
              })
            ) : (
              <option value="" disabled>No epics available</option>
            )}
          </select>
        </div>

        {/* Feature filter */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FileText size={18} className="text-gray-400" />
          </div>
          <select
            value={selectedFeature}
            onChange={(e) => handleFeatureChange(e.target.value)}
            disabled={loadingFeatures}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">All Features</option>
            {Array.isArray(features) && features.length > 0 ? (
              features.map(feature => {
                console.log('Rendering feature option:', feature);
                return (
                  <option key={feature.id} value={feature.id}>
                    {feature.name || 'Unnamed Feature'}
                  </option>
                );
              })
            ) : (
              <option value="" disabled>No features available</option>
            )}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Add "Run Selected Tests" button above the table */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {filteredTests.length} tests selected
          </div>
          <button
            onClick={handleRunSelectedTests}
            disabled={filteredTests.length === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150 disabled:bg-green-300 disabled:cursor-not-allowed"
          >
            <Play size={18} className="mr-2" />
            Run Tests
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center">
                      Category
                      {getSortIcon('category')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden md:table-cell"
                    onClick={() => handleSort('started_at')}
                  >
                    <div className="flex items-center">
                      Last Run
                      {getSortIcon('started_at')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTests.length > 0 ? (
                  filteredTests.map((test) => (
                    <tr
                      key={test.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleTestSelect(test)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(test.status)}
                          <span className={`ml-2 text-sm font-medium px-2 py-1 rounded-full ${getStatusColorClasses(test.status)}`}>
                            {formatStatus(test.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{test.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-md">{test.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {test.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {formatDate(test.started_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestSelect(test);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-lg text-gray-500">
                      {tests.length === 0 ? (
                        <div className="flex flex-col items-center">
                          <p>No tests found in the system.</p>
                          <p className="text-sm mt-2">Start by creating a test for a feature or acceptance criteria.</p>
                        </div>
                      ) : (
                        <div>
                          <p>No tests match the current filters.</p>
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedStatus('all');
                              setSelectedEpic('all');
                              setSelectedFeature('all');
                              fetchTestsByProduct(selectedProduct.id);
                            }}
                            className="text-blue-600 underline mt-2"
                          >
                            Clear all filters
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-t border-gray-200">
          <div className="text-gray-500 text-sm">
            Showing {filteredTests.length} of {tests.length} tests
          </div>
          <div className="flex items-center gap-2">
            {/* Pagination placeholder for future implementation */}
            <button
              className="px-3 py-1 border border-gray-300 rounded-md text-gray-600 bg-white disabled:opacity-50"
              disabled
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">Page 1</span>
            <button
              className="px-3 py-1 border border-gray-300 rounded-md text-gray-600 bg-white disabled:opacity-50"
              disabled
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestsTable;
