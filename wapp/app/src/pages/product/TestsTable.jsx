import React, { useState, useEffect, useRef } from 'react';
import {
  Filter,
  Search,
  ChevronUp,
  ChevronDown,
  Calendar,
  Beaker,
  FileText,
  Play,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import axios from 'axios';
import { getTestsByFeature, getTestsByEpic, getTestsByProduct, triggerFeatureTestGeneration, getTestGenerationStatus } from '@/services/testService';
import { getAllEpics, getFeaturesByEpic } from '@/services/productService';
import { createTestExecution, getTestExecution } from '@/services/testExecutionService';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useSecret } from '@/context/SecretContext';
import TestDetailsModal from '@/components/modals/TestDetailsModal';
import AddFeatureModal from '@/components/modals/AddFeatureModal';
import EditFeatureModal from '@/components/modals/EditFeatureModal';
import AddTestModal from '@/components/modals/AddTestModal';
import { getStatusIconLarge, formatStatus, getStatusColorClasses } from '@/utils/testExecutionUtils';
import { formatDate } from '@/utils/dateUtils';
import { API_URL } from '@/constants/api';

/**
 * Displays all tests in a tabular format with sorting and filtering capabilities
 */
const TestsTable = () => {
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
  const [selectedEpic, setSelectedEpic] = useState('all'); // Will be updated to first epic when data loads
  const [selectedFeature, setSelectedFeature] = useState('all');
  const [epicFeaturesMap, setEpicFeaturesMap] = useState({});
  const [loadingEpics, setLoadingEpics] = useState(false);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isAddFeatureModalOpen, setIsAddFeatureModalOpen] = useState(false);
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false);
  const [isEditFeatureModalOpen, setIsEditFeatureModalOpen] = useState(false);
  const [selectedFeatureForEdit, setSelectedFeatureForEdit] = useState(null);
  const [showFeatureActionMenu, setShowFeatureActionMenu] = useState(null); // ID of feature with open action menu
  const [isFeatureDropdownOpen, setIsFeatureDropdownOpen] = useState(false);
  const featureDropdownRef = useRef(null);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [testGenerationTaskId, setTestGenerationTaskId] = useState(null);
  const pollingIntervalRef = useRef(null);
  const [runningTests, setRunningTests] = useState({}); // Track tests that are currently running
  const testPollingIntervalsRef = useRef({}); // Track polling intervals for individual tests

  const { selectedProduct } = useProduct();
  const { selectedOrganization } = useOrganization();
  const { secrets, fetchSecrets } = useSecret();
  const errorMessageNoCredentials = "You need to add test credentials before running or generating tests. Go to 'Test Credentials' to add credentials.";

  // Add a constant for the running status display
  const RUNNING_STATUS = 'Running';

  // Fetch secrets when component loads or when product/organization changes
  useEffect(() => {
    if (selectedProduct && selectedOrganization) {
      fetchSecrets();
    }
  }, [selectedProduct, selectedOrganization, fetchSecrets]);

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

    // When epics are loaded, select the first epic by default if available
    if (epics.length > 0 && selectedEpic === 'all') {
      const firstEpicId = epics[0].id;
      console.log('Setting first epic as default:', firstEpicId);
      setSelectedEpic(firstEpicId);
      // Features will be fetched in the other useEffect when selectedEpic changes
    }
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
    setSuccessMessage(null);
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

  // Handle running a single test
  const handleRunSingleTest = async (testId) => {
    try {
      setError(null);

      // Check if the project has test credentials
      if (!secrets || secrets.length === 0) {
        setError(
          <span>
            Cannot run tests: No test credentials found. Please add credentials in the Test Credentials Management section.
          </span>
        );
        setSuccessMessage(null);
        return;
      }

      // Mark this test as running
      setRunningTests(prev => ({ ...prev, [testId]: true }));

      const executionData = {
        test_id: testId,
        status: 'PENDING',
        environment: 'development',
        executor_type: 'MANUAL',
        notes: null
      };

      const response = await createTestExecution(executionData);

      // Start polling for the test status
      pollTestExecutionStatus(testId, response.id);

      // Update tests list immediately to show pending
      setTests(prevTests => prevTests.map(test =>
        test.id === testId ? {
          ...test,
          status: 'pending',
          last_execution_id: response.id,
          started_at: new Date().toISOString()
        } : test
      ));

      // Update filtered tests too
      setFilteredTests(prevTests => prevTests.map(test =>
        test.id === testId ? {
          ...test,
          status: 'pending',
          last_execution_id: response.id,
          started_at: new Date().toISOString()
        } : test
      ));

    } catch (err) {
      console.error('Error running test:', err);
      setError('Failed to run test. Please try again.');
      setSuccessMessage(null);

      // Remove from running tests
      setRunningTests(prev => {
        const updated = { ...prev };
        delete updated[testId];
        return updated;
      });
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

      // Check if the project has test credentials
      if (!secrets || secrets.length === 0) {
        setError(
          <span>
            {errorMessageNoCredentials}
          </span>
        );
        setSuccessMessage(null);
        return;
      }

      setError(null);
      setSuccessMessage(null);
      setLoading(true);

      let testCount = 0;
      const testExecutions = [];

      // Run each filtered test
      for (const test of filteredTests) {
        try {
          // Mark test as running
          setRunningTests(prev => ({ ...prev, [test.id]: true }));

          const executionData = {
            test_id: test.id,
            status: 'PENDING',
            environment: 'development',
            executor_type: 'MANUAL',
            notes: null
          };

          const response = await createTestExecution(executionData);
          testExecutions.push({ testId: test.id, executionId: response.id });

          // Update tests list immediately to show pending
          setTests(prevTests => prevTests.map(t =>
            t.id === test.id ? {
              ...t,
              status: 'pending',
              last_execution_id: response.id,
              started_at: new Date().toISOString()
            } : t
          ));

          // Update filtered tests too
          setFilteredTests(prevTests => prevTests.map(t =>
            t.id === test.id ? {
              ...t,
              status: 'pending',
              last_execution_id: response.id,
              started_at: new Date().toISOString()
            } : t
          ));

          testCount++;
        } catch (testErr) {
          console.error(`Error running test ${test.id}:`, testErr);

          // Remove from running tests
          setRunningTests(prev => {
            const updated = { ...prev };
            delete updated[test.id];
            return updated;
          });

          // Continue with other tests
        }
      }

      // Show appropriate message based on results
      if (testCount > 0) {
        setError(null);

        // Start polling for each test execution
        testExecutions.forEach(({ testId, executionId }) => {
          pollTestExecutionStatus(testId, executionId);
        });
      } else {
        setError('Failed to start any tests. Please try again.');
        setSuccessMessage(null);
      }
    } catch (err) {
      handleFetchError('run selected tests', err);
      setSuccessMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Function to poll test execution status
  const pollTestExecutionStatus = async (testId, executionId) => {
    if (!executionId) return;

    console.log(`Starting to poll execution status for test ${testId}, execution ${executionId}`);

    // Clear any existing interval for this test
    if (testPollingIntervalsRef.current[testId]) {
      clearInterval(testPollingIntervalsRef.current[testId]);
    }

    // Start polling
    testPollingIntervalsRef.current[testId] = setInterval(async () => {
      try {
        const executionData = await getTestExecution(executionId);
        console.log(`Polling execution ${executionId} status:`, executionData.status);

        // Normalize status to uppercase for consistency
        const normalizedStatus = executionData.status?.toUpperCase() || '';

        // Update test status in state with the latest data
        setTests(prevTests => prevTests.map(test =>
          test.id === testId
            ? {
                ...test,
                status: normalizedStatus,
                started_at: executionData.started_at || test.started_at,
                last_execution_id: executionId
              }
            : test
        ));

        // Also update filtered tests
        setFilteredTests(prevTests => prevTests.map(test =>
          test.id === testId
            ? {
                ...test,
                status: normalizedStatus,
                started_at: executionData.started_at || test.started_at,
                last_execution_id: executionId
              }
            : test
        ));

        // If status is no longer pending, stop polling
        if (normalizedStatus !== 'PENDING') {
          console.log(`Test ${testId} execution completed with status: ${normalizedStatus}`);
          clearInterval(testPollingIntervalsRef.current[testId]);
          delete testPollingIntervalsRef.current[testId];

          // Remove from running tests
          setRunningTests(prev => {
            const updated = { ...prev };
            delete updated[testId];
            return updated;
          });
        }
      } catch (err) {
        console.error(`Error polling test execution status for ${executionId}:`, err);
        // Stop polling on error
        clearInterval(testPollingIntervalsRef.current[testId]);
        delete testPollingIntervalsRef.current[testId];

        // Remove from running tests
        setRunningTests(prev => {
          const updated = { ...prev };
          delete updated[testId];
          return updated;
        });
      }
    }, 2000); // Poll every 2 seconds
  };

  // Function to handle feature creation completion
  const handleFeatureAdded = (newFeature) => {
    // Update the features list
    if (newFeature.epic_id === selectedEpic || selectedEpic === 'all') {
      setFeatures(prevFeatures => [...prevFeatures, newFeature]);

      // Update the epicFeaturesMap
      const updatedMap = { ...epicFeaturesMap };
      if (updatedMap[newFeature.epic_id]) {
        updatedMap[newFeature.epic_id] = [...updatedMap[newFeature.epic_id], newFeature];
      } else {
        updatedMap[newFeature.epic_id] = [newFeature];
      }
      setEpicFeaturesMap(updatedMap);

      // Automatically select the newly created feature
      setSelectedFeature(newFeature.id);
    }

    // Show success message - truncate long feature names
    const displayName = newFeature.name.length > 30 ? `${newFeature.name.substring(0, 30)}...` : newFeature.name;
    setSuccessMessage(`Feature "${displayName}" created successfully`);

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Function to handle test creation button click
  const handleCreateTestClick = () => {
    // Check if there are any features
    if (features.length === 0) {
      // Show a prompt to create features first
      setError('Please create at least one feature before adding tests.');

      // Open the dropdown to access the create feature button
      setIsFeatureDropdownOpen(true);

      // Highlight the feature dropdown
      const featureDropdown = document.querySelector('[data-feature-dropdown]');
      if (featureDropdown) {
        // Add a pulse animation class
        featureDropdown.classList.add('ring-4', 'ring-red-300', 'ring-opacity-50', 'animate-pulse');

        // Remove the animation after 5 seconds
        setTimeout(() => {
          featureDropdown.classList.remove('ring-4', 'ring-red-300', 'ring-opacity-50', 'animate-pulse');
        }, 5000);
      }

      // Automatically clear the error after 6 seconds
      setTimeout(() => {
        setError(null);
      }, 6000);

      // Scroll to top to make sure error is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });

      return;
    }
    // Check if a feature is selected
    else if (selectedFeature === 'all') {
      // Show a prompt to select a feature first

      // Highlight the feature dropdown
      const featureDropdown = document.querySelector('[data-feature-dropdown]');
      if (featureDropdown) {
        // Add a pulse animation class
        featureDropdown.classList.add('ring-4', 'ring-red-300', 'ring-opacity-50', 'animate-pulse');

        // Remove the animation after 5 seconds
        setTimeout(() => {
          featureDropdown.classList.remove('ring-4', 'ring-red-300', 'ring-opacity-50', 'animate-pulse');
        }, 5000);
      }

      // Open the dropdown to show options
      setIsFeatureDropdownOpen(true);

      // Automatically clear the error after 6 seconds
      setTimeout(() => {
        setError(null);
      }, 6000);

      // Scroll to top to make sure error is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });

      return;
    }

    // If a feature is selected, open the test creation modal
    setIsAddTestModalOpen(true);
  };

  // Function to dismiss error message
  const dismissError = () => {
    setError(null);
  };

  // Function to handle test creation completion
  const handleTestAdded = async (newTest) => {
    try {
      // Make API call to save the test
      const testData = {
        ...newTest
      };

      // Add the appropriate ID based on the current selection
      if (selectedFeature !== 'all') {
        testData.feature_id = selectedFeature;
    } else if (selectedEpic !== 'all') {
        testData.epic_id = selectedEpic;
      } else if (selectedProduct) {
        testData.epic_id = epics[0]?.id; // Use first epic as a fallback
      }

      const response = await axios.post(
        `${API_URL}/tests/`,
        testData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Show success message - truncate long test names
      const displayName = response.data.name.length > 30 ? `${response.data.name.substring(0, 30)}...` : response.data.name;
      setSuccessMessage(`Test "${displayName}" created successfully`);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

      // Refresh tests list
      fetchTestsWithCurrentFilters();
    } catch (err) {
      console.error('Error saving test:', err);
      setError('Failed to create test. Please try again.');
      setSuccessMessage(null);
    }
  };

  // Function to handle test generation for the selected feature
  const handleGenerateTests = async () => {
    // Check if a feature is selected
    if (selectedFeature === 'all') {
      // Show error message

      // Highlight the feature dropdown
      const featureDropdown = document.querySelector('[data-feature-dropdown]');
      if (featureDropdown) {
        // Add a pulse animation class
        featureDropdown.classList.add('ring-4', 'ring-red-300', 'ring-opacity-50', 'animate-pulse');

        // Remove the animation after 5 seconds
        setTimeout(() => {
          featureDropdown.classList.remove('ring-4', 'ring-red-300', 'ring-opacity-50', 'animate-pulse');
        }, 5000);
      }

      // Open the dropdown to show options
      setIsFeatureDropdownOpen(true);

      // Automatically clear the error after 6 seconds
      setTimeout(() => {
        setError(null);
      }, 6000);

      // Scroll to top to make sure error is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });

      return;
    }

    // Check if the project has test credentials
    if (!secrets || secrets.length === 0) {
      setError(
        <span>
          Cannot generate tests: No test credentials found. Please add credentials in the{' '}
          <a href="/test-credentials" className="text-red-800 font-medium underline">
            Test Credentials Management
          </a>{' '}
          section.
        </span>
      );
      setSuccessMessage(null);
      return;
    }

    try {
      setIsGeneratingTests(true);
      setError(null);
      setSuccessMessage(`Starting test generation. Status: ${formatStatus('PENDING')}`);

      // Call the API to generate tests
      console.log('Triggering test generation for feature:', selectedFeature);
      const taskId = await triggerFeatureTestGeneration(selectedFeature);
      console.log('Test generation task ID received:', taskId);
      setTestGenerationTaskId(taskId?.toString() || null); // Ensure taskId is a string or null

      // Clear any existing interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Poll for status
      pollingIntervalRef.current = setInterval(async () => {
        try {
          console.log('Polling test generation status for task:', taskId);
          const response = await getTestGenerationStatus(taskId);
          console.log('Test generation status response:', response);

          // Update success message with current status
          setSuccessMessage(
            `Test generation in progress. Status: ${response.status ? formatStatus(response.status) : formatStatus('PENDING')}${response.progress ? ` (${response.progress})` : ''}`
          );

          if (response.status === 'completed') {
            console.log('Test generation completed successfully:', response);
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            setIsGeneratingTests(false);
            setTestGenerationTaskId(null);

            // Refresh tests and show success
            await fetchTestsWithCurrentFilters();

            // Get the current number of tests after refresh
            const currentTests = await getTestsByFeature(selectedFeature);

            if (currentTests.length === 0) {
              setError('Test generation completed but no tests were created. Please check the logs for more information.');
              setSuccessMessage(null);
            } else {
              setSuccessMessage(
                `Successfully generated ${currentTests.length} tests for the selected feature. Status: ${formatStatus('COMPLETED')}`
              );
            }

            // Clear success message after 5 seconds
            setTimeout(() => {
              setSuccessMessage(null);
            }, 5000);
          }
        } catch (err) {
          console.error('Error polling test generation status:', err);
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setIsGeneratingTests(false);
          setTestGenerationTaskId(null);
          setError('Error checking test generation status. Please try again.');
        }
      }, 2000); // Poll every 2 seconds

    } catch (err) {
      console.error('Error generating tests:', err);
      setIsGeneratingTests(false);
      setTestGenerationTaskId(null);
      setError('Failed to start test generation. Please try again.');
      setSuccessMessage(null);
    }
  };

  // Add useEffect for cleanup of polling interval
  useEffect(() => {
    // Log when the polling is started/active
    if (pollingIntervalRef.current) {
      console.log('Polling is active for test generation task:', testGenerationTaskId);
    }

    // Cleanup function to stop polling when component unmounts or feature changes
    return () => {
      if (pollingIntervalRef.current) {
        console.log('Stopping polling for test generation task:', testGenerationTaskId);
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (testGenerationTaskId) {
        console.log('Cleaning up test generation polling on unmount or feature change');
        setIsGeneratingTests(false);
        setTestGenerationTaskId(null);
      }
    };
  }, [selectedFeature]);

  // Function to handle feature editing
  const handleEditFeature = (feature) => {
    setSelectedFeatureForEdit(feature);
    setIsEditFeatureModalOpen(true);
    setShowFeatureActionMenu(null); // Close the menu
  };

  // Function to handle feature deletion
  const handleDeleteFeature = async (featureId) => {
    if (!featureId) return;

    if (!window.confirm('Are you sure you want to delete this feature? This will also delete all associated tests.')) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API_URL}/features/${featureId}`, {
        withCredentials: true
      });

      // Update the features state by removing the deleted feature
      setFeatures(prevFeatures => prevFeatures.filter(f => f.id !== featureId));

      // Update the epicFeaturesMap
      const updatedMap = { ...epicFeaturesMap };
      Object.keys(updatedMap).forEach(epicId => {
        updatedMap[epicId] = updatedMap[epicId].filter(f => f.id !== featureId);
      });
      setEpicFeaturesMap(updatedMap);

      // If the deleted feature was the selected one, reset to 'all'
      if (selectedFeature === featureId) {
        setSelectedFeature('all');
      }

      // Show success message
      setSuccessMessage('Feature deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh tests
      fetchTestsWithCurrentFilters();

    } catch (err) {
      console.error('Error deleting feature:', err);
      setError('Failed to delete feature. Please try again.');
      setSuccessMessage(null);
    } finally {
      setLoading(false);
      setShowFeatureActionMenu(null); // Close the menu
    }
  };

  // Function to handle feature update completion
  const handleFeatureUpdated = (updatedFeature) => {
    // Update the features list
    setFeatures(prevFeatures =>
      prevFeatures.map(f => f.id === updatedFeature.id ? updatedFeature : f)
    );

    // Update the epicFeaturesMap
    const updatedMap = { ...epicFeaturesMap };
    if (updatedMap[updatedFeature.epic_id]) {
      updatedMap[updatedFeature.epic_id] = updatedMap[updatedFeature.epic_id]
        .map(f => f.id === updatedFeature.id ? updatedFeature : f);
    }
    setEpicFeaturesMap(updatedMap);

    // Show success message - truncate long feature names
    const displayName = updatedFeature.name.length > 30 ? `${updatedFeature.name.substring(0, 30)}...` : updatedFeature.name;
    setSuccessMessage(`Feature "${displayName}" updated successfully`);

    setTimeout(() => setSuccessMessage(null), 3000);

    // Close the modal
    setIsEditFeatureModalOpen(false);
    setSelectedFeatureForEdit(null);
  };

  // Close feature dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (featureDropdownRef.current && !featureDropdownRef.current.contains(event.target)) {
        setIsFeatureDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Add useEffect for cleanup of test polling intervals
  useEffect(() => {
    return () => {
      // Clean up all polling intervals when component unmounts
      Object.values(testPollingIntervalsRef.current).forEach(interval => {
        clearInterval(interval);
      });
      testPollingIntervalsRef.current = {};
    };
  }, []);

  // Add a function to check if any tests are running
  const hasRunningTests = () => {
    return Object.keys(runningTests).length > 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-lg">Loading tests...</span>
      </div>
    );
  }

  // Only show error page for critical/loading errors that prevent displaying the main UI
  if (error && loading) {
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

      {/* Add Feature Modal */}
      {isAddFeatureModalOpen && selectedEpic !== 'all' && (
        <AddFeatureModal
          epicId={selectedEpic}
          epicName={epics.find(epic => epic.id === selectedEpic)?.name || 'Selected Epic'}
          onClose={() => setIsAddFeatureModalOpen(false)}
          onFeatureAdded={handleFeatureAdded}
        />
      )}

      {/* Add Test Modal */}
      {isAddTestModalOpen && (
        <AddTestModal
          onClose={() => setIsAddTestModalOpen(false)}
          onAddTest={handleTestAdded}
          defaultType={selectedFeature !== 'all' ? 'Feature' : selectedEpic !== 'all' ? 'Epic' : 'Epic'}
          epicId={selectedEpic !== 'all' ? selectedEpic : epics[0]?.id}
          featureId={selectedFeature !== 'all' ? selectedFeature : undefined}
          defaultUrl={selectedFeature !== 'all' && features.length > 0
            ? features.find(f => f.id === selectedFeature)?.urls?.[0]
            : undefined}
        />
      )}

      {/* Edit Feature Modal */}
      {isEditFeatureModalOpen && selectedFeatureForEdit && (
        <EditFeatureModal
          onClose={() => {
            setIsEditFeatureModalOpen(false);
            setSelectedFeatureForEdit(null);
          }}
          feature={selectedFeatureForEdit}
          onFeatureUpdated={handleFeatureUpdated}
        />
      )}

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <Beaker className="mr-2" size={24} />
              All Tests
            </h1>
          </div>

      {/* Error message display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start justify-between">
          <p>{error}</p>
          <button
            onClick={dismissError}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Add success message display */}
      {successMessage && (
        <div className={`mb-6 p-4 ${isGeneratingTests ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-green-100 border-green-200 text-green-700'} border rounded-lg flex items-start justify-between`}>
          <div className="flex-1 break-words overflow-hidden">
            {isGeneratingTests && (
              <div className="flex items-center mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <p className="font-medium">Test Generation in Progress</p>
              </div>
            )}
            <p>{successMessage}</p>
          </div>
          {isGeneratingTests && testGenerationTaskId && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded ml-2 whitespace-nowrap">
              Task ID: {testGenerationTaskId.substring(0, 8)}...
            </div>
          )}
        </div>
      )}

      {/* Show warning when there are no credentials */}
      {(!secrets || secrets.length === 0) && (
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-200 text-yellow-800 rounded-lg">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium">Test credentials required</h3>
              <p className="mt-1 text-sm">
                {errorMessageNoCredentials}
              </p>
            </div>
          </div>
        </div>
      )}

          {/* All filters in one row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">
            {/* Search input */}
        <div className="relative w-full">
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
        <div className="relative w-full">
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
        {/* <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Layers size={18} className="text-gray-400" />
              </div>
              <select
                value={selectedEpic}
                onChange={(e) => handleEpicChange(e.target.value)}
                disabled={loadingEpics}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
            <option value="all">{loadingEpics ? 'Loading epics...' : 'All Epics'}</option>
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
        </div> */}

        {/* Feature filter and Add Feature button group */}
        <div className="flex flex-col md:flex-row w-full gap-2">
          {/* Feature filter - Custom dropdown */}
          <div className="relative w-full md:w-56" ref={featureDropdownRef}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText size={18} className="text-gray-400" />
              </div>
            <button
              onClick={() => setIsFeatureDropdownOpen(!isFeatureDropdownOpen)}
                disabled={loadingFeatures}
              className="flex w-full justify-between pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left"
              data-feature-dropdown
            >
              <span className="block truncate">
                {loadingFeatures
                  ? 'Loading features...'
                  : selectedFeature === 'all'
                    ? (features.length > 0 ? 'All Features' : '--')
                    : features.find(f => f.id === selectedFeature)?.name || 'Select Feature'
                }
              </span>
              <ChevronDown size={18} className={`flex-shrink-0 ml-1 text-gray-400 transition-transform ${isFeatureDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {/* Custom dropdown menu */}
            {isFeatureDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {/* Create Feature button - only show when an Epic is selected */}
                {selectedEpic !== 'all' && (
                  <div className="py-2 px-4 hover:bg-blue-50 cursor-pointer">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAddFeatureModalOpen(true);
                        setIsFeatureDropdownOpen(false);
                      }}
                      className="w-full flex items-center text-blue-600 font-medium"
                      title="Add new feature to selected epic"
                      data-create-feature-button
                    >
                      <Plus size={18} className="mr-2" />
                      Create Feature
                    </button>
            </div>
                )}

                <div className="border-t border-gray-200"></div>

                { features.length > 0 && (
                  <>
                    <div
                      className="py-2 px-4 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        handleFeatureChange('all');
                    setIsFeatureDropdownOpen(false);
                  }}
                >
                  All Features
                    </div>
                    <div className="border-t border-gray-200"></div>
                  </>
                )}

                {features.length === 0 ? (
                  <div className="py-2 px-4 text-gray-500 italic">No features available</div>
                ) : (
                  features.map(feature => (
                    <div
                      key={feature.id}
                      className="py-2 px-4 hover:bg-gray-100 flex justify-between items-center"
                    >
                      <div
                        className="cursor-pointer flex-grow truncate mr-2"
                        onClick={() => {
                          handleFeatureChange(feature.id);
                          setIsFeatureDropdownOpen(false);
                        }}
                      >
                        {feature.name || 'Unnamed Feature'}
                      </div>
                      <div className="flex items-center flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditFeature(feature);
                            setIsFeatureDropdownOpen(false);
                          }}
                          className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full flex-shrink-0"
                          title="Edit feature"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFeature(feature.id);
                            setIsFeatureDropdownOpen(false);
                          }}
                          className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full ml-1 flex-shrink-0"
                          title="Delete feature"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Generate Tests button */}
            <button
              onClick={handleGenerateTests}
              disabled={isGeneratingTests || !secrets || secrets.length === 0}
              className="flex items-center justify-center px-3 py-2 bg-purple-600 text-white rounded-md shadow hover:bg-purple-700 transition duration-150 disabled:bg-purple-300 disabled:cursor-not-allowed"
              title={!secrets || secrets.length === 0 ? "Test credentials required to generate tests" : "Generate tests for selected feature using AI"}
            >
              {isGeneratingTests ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Beaker size={18} className="mr-2" />
                  <span className="whitespace-nowrap">Generate Tests with AI</span>
                  {secrets && secrets.length > 0 && (
                    <span className="ml-1.5 flex items-center justify-center bg-purple-800 text-white text-xs rounded-full h-5 min-w-5 px-1">
                      {secrets.length}
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Add Test button */}
            <button
              onClick={handleCreateTestClick}
              className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition duration-150"
              title="Add new test to selected feature"
            >
              <Plus size={18} className="mr-2" />
              <span className="whitespace-nowrap">Add Test To Feature</span>
            </button>
          </div>
        </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Add "Run Selected Tests" button above the table */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {filteredTests.length} tests selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRunSelectedTests}
              disabled={filteredTests.length === 0 || hasRunningTests() || !secrets || secrets.length === 0}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150 disabled:bg-green-300 disabled:cursor-not-allowed"
              title={!secrets || secrets.length === 0 ? "Test credentials required to run tests" : "Run selected tests"}
            >
              {hasRunningTests() ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {formatStatus(RUNNING_STATUS)} Tests
                </>
              ) : (
                <>
                  <Play size={18} className="mr-2" />
                  Run Tests
                  {secrets && secrets.length > 0 && (
                    <span className="ml-1.5 flex items-center justify-center bg-green-800 text-white text-xs rounded-full h-5 min-w-5 px-1">
                      {secrets.length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
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
                          {runningTests[test.id] ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                          ) : (
                            getStatusIcon(test.status)
                          )}
                          <span className={`ml-2 text-sm font-medium px-2 py-1 rounded-full ${runningTests[test.id] ? 'bg-blue-100 text-blue-800' : getStatusColorClasses(test.status)}`}>
                            {runningTests[test.id] ? formatStatus(RUNNING_STATUS) : formatStatus(test.status)}
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
                        <div className="flex justify-end items-center space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTestSelect(test);
                              }}
                            >
                              View
                            </button>
                          <button
                            className={`text-green-600 hover:text-green-900 flex items-center ${runningTests[test.id] || !secrets || secrets.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!runningTests[test.id] && secrets && secrets.length > 0) {
                                handleRunSingleTest(test.id);
                              }
                            }}
                            title={!secrets || secrets.length === 0 ? "Test credentials required to run tests" : runningTests[test.id] ? `Test is ${formatStatus(RUNNING_STATUS)}` : `Run this test`}
                            disabled={runningTests[test.id] || !secrets || secrets.length === 0}
                          >
                            {runningTests[test.id] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-1"></div>
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
                        </div>
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
