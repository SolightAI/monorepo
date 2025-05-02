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
import { getTestsByFeature, getTestsByEpic, getTestsByProduct, deleteTest, getTestGenerationStatus } from '@/services/testService';
import { getAllEpics, getFeaturesByEpic } from '@/services/productService';
import { createTestExecution, getTestExecution, getLatestTestExecutions } from '@/services/testExecutionService';
import { handleFeatureTestGeneration } from '@/services/testGenerationService';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useSecret } from '@/context/SecretContext';
import TestDetailsModal from '@/components/modals/TestDetailsModal';
import AddFeatureModal from '@/components/modals/AddFeatureModal';
import EditFeatureModal from '@/components/modals/EditFeatureModal';
import AddTestModal from '@/components/modals/AddTestModal';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { getStatusIconLarge, formatStatus, getStatusColorClasses } from '@/utils/testExecutionUtils';
import { formatDate } from '@/utils/dateUtils';
import { API_URL } from '@/constants/api';
import { TEST_STATUS } from '@/utils/testExecutionUtils';

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
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isAddFeatureModalOpen, setIsAddFeatureModalOpen] = useState(false);
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false);
  const [isEditFeatureModalOpen, setIsEditFeatureModalOpen] = useState(false);
  const [selectedFeatureForEdit, setSelectedFeatureForEdit] = useState(null);
  const [isFeatureDropdownOpen, setIsFeatureDropdownOpen] = useState(false);
  const featureDropdownRef = useRef(null);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [generatingFeatures, setGeneratingFeatures] = useState([]); // Array of features being generated
  const pollingIntervalRef = useRef(null);
  const [runningTests, setRunningTests] = useState({}); // Track tests that are currently running
  const testPollingIntervalsRef = useRef({}); // Track polling intervals for individual tests
  const [selectedTestIds, setSelectedTestIds] = useState(new Set()); // State for selected tests
  const [isDeleting, setIsDeleting] = useState(false); // State for delete operation
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false); // State for confirmation modal
  const [isConfirmFeatureDeleteModalOpen, setIsConfirmFeatureDeleteModalOpen] = useState(false); // State for feature delete confirmation
  const [featureToDeleteId, setFeatureToDeleteId] = useState(null); // ID of feature marked for deletion

  // Add isBannerRelevant condition
  const isBannerRelevant = selectedFeature === 'all' || generatingFeatures.some(f => f.id === selectedFeature);

  // New state for latest execution data
  const [latestExecutionsMap, setLatestExecutionsMap] = useState({});

  const { selectedProduct } = useProduct();
  const { selectedOrganization } = useOrganization();
  const { secrets, fetchSecrets } = useSecret();
  const errorMessageNoCredentials = "You need to add test credentials before running or generating tests. Go to 'Test Credentials' to add credentials.";

  const RUNNING_STATUS = 'Running';   // Add a constant for the running status display
  const MAX_RETRIES_FEATURE_LOADING = 10; // Maximum number of retries (5 seconds total)
  const MAX_RETRIES_TEST_GENERATION_STATUS = 3; // Maximum number of retries for checking test generation status (3 seconds total)
  let testGenerationStatusRetryCount = 0;   // Add retry mechanism before starting polling
  const TEST_GENERATION_STATUS_RETRY_DELAY = 1000; // 1 second between retries

  // Fetch secrets when component loads or when product/organization changes
  useEffect(() => {
    if (selectedProduct && selectedOrganization) {
      fetchSecrets();
    }
  }, [selectedProduct, selectedOrganization, fetchSecrets]);

  useEffect(() => {
    if (selectedProduct && selectedOrganization) {
      fetchTestsByProduct(selectedProduct.id);
      fetchEpicsAndFeatures();
    }
  }, [selectedProduct, selectedOrganization]);

  // Add console logs for epics and features state changes
  useEffect(() => {
    // When epics are loaded, select the first epic by default if available
    if (epics.length > 0 && selectedEpic === 'all') {
      const firstEpicId = epics[0].id;
      setSelectedEpic(firstEpicId);
      // Features will be fetched in the other useEffect when selectedEpic changes
    }
  }, [epics]);

  // Fetch epic-specific features when an epic is selected
  useEffect(() => {
    if (selectedEpic !== 'all') {
      fetchFeaturesByEpic(selectedEpic);
      // Fetch tests for the newly selected epic
      fetchTestsWithCurrentFilters();
    } else {
      setSelectedFeature('all');
      setFeatures(Object.values(epicFeaturesMap).flat());
    }
  }, [selectedEpic, epicFeaturesMap]);

  // Fetch tests when the selected feature changes
  useEffect(() => {
    // Avoid fetching on initial load if feature starts as 'all' and product fetch already ran
    // Or if the selection hasn't changed from initial render
    if (selectedProduct) { // Ensure product context is available
        fetchTestsWithCurrentFilters();
    }
  }, [selectedFeature]); // Re-fetch when feature selection changes

  const fetchEpicsAndFeatures = async () => {
    try {
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
        setLoadingFeatures(false);
        return;
      }
      // Fetch epics for the current product
      const epicsData = await getAllEpics(selectedProduct.id, selectedOrganization.id);

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
        const epicFeatures = await getFeaturesByEpic(epic.id);
        featuresMap[epic.id] = epicFeatures;
        return epicFeatures;
      });

      const allFeaturesArrays = await Promise.all(fetchPromises);
      const allFeatures = allFeaturesArrays.flat();

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
      await fetchLatestExecutions(testsData);
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
      let aValue, bValue;

      // Get value based on sort key, checking latestExecutionsMap if needed
      if (key === 'latest_status' || key === 'latest_ended_at') {
        const aExec = latestExecutionsMap[a.id];
        const bExec = latestExecutionsMap[b.id];
        // Map key to execution field
        const execKey = key === 'latest_status' ? 'status' : 'ended_at';
        aValue = aExec ? aExec[execKey] : null;
        bValue = bExec ? bExec[execKey] : null;

        // Handle nulls (e.g., tests never run) - sort them last
        if (aValue === null && bValue !== null) return direction === 'asc' ? 1 : -1;
        if (aValue !== null && bValue === null) return direction === 'asc' ? -1 : 1;
        if (aValue === null && bValue === null) return 0;

      } else {
        // For other keys like 'name', 'category', 'feature_name'
        aValue = a[key];
        bValue = b[key];
      }

      // Standard comparison
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const applyFilters = (testsToFilter = tests, statusOverride = null, queryOverride = null, executionsMap = latestExecutionsMap) => {
    let result = [...testsToFilter];

    // Use the status override if provided, otherwise use the state
    const filterStatus = statusOverride !== null ? statusOverride : selectedStatus;

    // Apply status filter
    if (filterStatus !== 'all') {
      // Log test statuses to help with debugging
      result = result.filter(test => {
        const latestExecution = executionsMap[test.id];
        const testStatus = latestExecution?.status?.toLowerCase();
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

    // Add feature name to each test for easier sorting/display
    result = result.map(test => ({
      ...test,
      feature_name: features.find(f => f.id === test.feature_id)?.name || 'N/A'
    }));

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
    // Clear selection when sorting changes
    setSelectedTestIds(new Set());
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
        await fetchLatestExecutions(testsData);
      } else if (selectedEpic !== 'all') {
        const testsData = await getTestsByEpic(selectedEpic);
        setTests(testsData);
        applyFilters(testsData, selectedStatus, searchQuery);
        await fetchLatestExecutions(testsData);
      } else {
        await fetchTestsByProduct(selectedProduct.id);
      }
    } catch (err) {
      handleFetchError('load tests data', err);
    } finally {
      setLoading(false);
      setSuccessMessage(null);
      setIsDeleting(false); // Reset deleting state on fetch
      setSelectedTestIds(new Set()); // Clear selection on refresh
    }
  };

  const handleFeatureChange = (featureId) => {
    setSelectedFeature(featureId);
  };

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
    // We don't need to refresh on every close - TestDetailsModal will call onTestUpdated when there's an actual change
    setSelectedTestIds(new Set()); // Clear selection on modal close as well? Or keep it? Let's clear for now.
  };

  // This function will be called only when a test is actually updated
  const handleTestUpdated = () => {
    // Refresh tests list after viewing test details with current filters
    fetchTestsWithCurrentFilters();
    setSuccessMessage(null);
    setIsDeleting(false); // Reset deleting state

    // Stop test generation polling if it's running
    if (pollingIntervalRef.current) {
        pollingIntervalRef.current(); // Call the cleanup function
        pollingIntervalRef.current = null;
    }
    setIsGeneratingTests(false);
    setGeneratingFeatures([]);
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
        status: TEST_STATUS.PENDING,
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

      // Filter out tests that are already running
      const testsToRun = filteredTests.filter(test => !runningTests[test.id]);

      if (testsToRun.length === 0) {
        setError('All selected tests are already running or starting.');
        setSuccessMessage(null);
        // Clear error after a delay
        setTimeout(() => setError(null), 3000);
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
      setLoading(true); // Consider a more specific loading state like setIsRunningSelected

      let testCount = 0;
      const testExecutions = [];

      // Run each filtered test that is NOT already running
      for (const test of testsToRun) { // Iterate over testsToRun instead of filteredTests
        // Skip if already running (double-check, though filtering should handle this)
        if (runningTests[test.id]) continue;

        try {
          // Mark test as running
          setRunningTests(prev => ({ ...prev, [test.id]: true }));

          const executionData = {
            test_id: test.id,
            status: TEST_STATUS.PENDING,
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
              // Don't overwrite status if it's already running from a previous action
              last_execution_id: response.id,
            } : t
          ));

          // Update filtered tests too - reflect running state immediately
          setFilteredTests(prevTests => prevTests.map(t =>
            t.id === test.id ? {
              ...t,
              last_execution_id: response.id,
            } : t
          ));

          testCount++;
        } catch (testErr) {
          console.error(`Error starting test ${test.id}:`, testErr);

          // Remove from running tests only if starting failed
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
        setSuccessMessage(`Started ${testCount} test(s).`);
        setTimeout(() => setSuccessMessage(null), 3000);

        // Start polling for each test execution that was just started
        testExecutions.forEach(({ testId, executionId }) => {
          pollTestExecutionStatus(testId, executionId);
        });
      } else {
        // This case might happen if all attempts failed
        setError('Failed to start any tests. Please check the console and try again.');
        setSuccessMessage(null);
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      handleFetchError('run selected tests', err);
      setSuccessMessage(null);
    } finally {
      setLoading(false); // Reset general loading or specific running state
    }
  };

  // Function to poll test execution status
  const pollTestExecutionStatus = async (testId, executionId) => {
    if (!executionId) return;

    // Clear any existing interval for this test
    if (testPollingIntervalsRef.current[testId]) {
      clearInterval(testPollingIntervalsRef.current[testId]);
    }

    // Start polling
    testPollingIntervalsRef.current[testId] = setInterval(async () => {
      try {
        const executionData = await getTestExecution(executionId);

        // Instead of updating the test object's status directly,
        // update the latestExecutionsMap
        setLatestExecutionsMap(prevMap => ({
          ...prevMap,
          [testId]: {
            test_id: testId,
            execution_id: executionId,
            status: executionData.status,
            started_at: executionData.started_at,
            ended_at: executionData.ended_at
          }
        }));

        // If status is no longer pending, stop polling
        if (executionData.status !== TEST_STATUS.PENDING && executionData.status !== 'unknown') {
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
      setError(
        <span>
          Please create at least one feature before adding tests. You can add one using the {' '}
          <code className="bg-gray-100 p-1 rounded text-sm">Feature</code> dropdown menu.
        </span>
      );

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
      setError(
        <span>
          Please select a specific feature from the <code className="bg-gray-100 p-1 rounded text-sm">Feature</code> dropdown before adding a test.
        </span>
      );

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
    // Clear previous messages/state
    setError(null);
    setSuccessMessage(null);

    // Call the new service function
    pollingIntervalRef.current = await handleFeatureTestGeneration(
      selectedFeature,
      secrets,
      (taskId) => { // onStart
        setIsGeneratingTests(true);
        if (taskId) { // Update task ID only when we receive it
          setGeneratingFeatures([{ id: selectedFeature, name: features.find(f => f.id === selectedFeature)?.name || 'Selected Feature' }]);
        }
      },
      (statusUpdate) => { // onStatusUpdate
        setSuccessMessage(statusUpdate); // Use success message for progress
      },
      async (successMsg) => { // onSuccess
        setIsGeneratingTests(false);
        setGeneratingFeatures([]);
        pollingIntervalRef.current = null; // Clear the cleanup ref

        // Refresh tests and check results
        await fetchTestsWithCurrentFilters(); // Ensure this completes before checking tests

        // Re-fetch tests to check count - Note: This might be slightly delayed, consider alternative check
        const currentTests = await getTestsByFeature(selectedFeature); // Maybe use state?
        if (currentTests.length === 0) {
          setError('Test generation completed but no tests were created. Please check the logs.');
          setSuccessMessage(null); // Clear progress message
          setTimeout(() => setError(null), 5000);
        } else {
          setSuccessMessage(successMsg); // Show final success message from service
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      },
      (errorMsg) => { // onError
        setIsGeneratingTests(false);
        setGeneratingFeatures([]);
        setError(errorMsg);
        setSuccessMessage(null); // Clear progress message
        pollingIntervalRef.current = null; // Clear the cleanup ref
        setTimeout(() => setError(null), 5000);

        // Handle specific error case for missing feature selection
        if (typeof errorMsg === 'string' && errorMsg.includes('select a specific feature')) {
            const featureDropdown = document.querySelector('[data-feature-dropdown]');
            if (featureDropdown) {
                featureDropdown.classList.add('ring-4', 'ring-red-300', 'ring-opacity-50', 'animate-pulse');
                setTimeout(() => {
                    featureDropdown.classList.remove('ring-4', 'ring-red-300', 'ring-opacity-50', 'animate-pulse');
                }, 5000);
            }
            setIsFeatureDropdownOpen(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    );
  };

  // Add useEffect for cleanup of polling interval
  useEffect(() => {
    // Cleanup function to stop polling when component unmounts or feature changes
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current); // Clear the interval using the ID
        pollingIntervalRef.current = null;
      }
      // No need to reset state here, it's handled by the callbacks or unmount
    };
  }, [selectedFeature]); // Keep dependency on selectedFeature

  // Function to handle feature editing
  const handleEditFeature = (feature) => {
    setSelectedFeatureForEdit(feature);
    setIsEditFeatureModalOpen(true);
  };

  // Function to trigger feature deletion confirmation
  const handleDeleteFeature = (featureId) => {
    if (!featureId) return;
    setFeatureToDeleteId(featureId);
    setIsConfirmFeatureDeleteModalOpen(true);
  };

  // Function to perform feature deletion after confirmation
  const confirmDeleteFeature = async () => {
    if (!featureToDeleteId) return;

    try {
      setLoading(true); // You might want a specific loading state for this
      await axios.delete(`${API_URL}/features/${featureToDeleteId}`, {
        withCredentials: true
      });

      // Update the features state by removing the deleted feature
      setFeatures(prevFeatures => prevFeatures.filter(f => f.id !== featureToDeleteId));

      // Update the epicFeaturesMap
      const updatedMap = { ...epicFeaturesMap };
      Object.keys(updatedMap).forEach(epicId => {
        updatedMap[epicId] = updatedMap[epicId].filter(f => f.id !== featureToDeleteId);
      });
      setEpicFeaturesMap(updatedMap);

      // If the deleted feature was the selected one, reset to 'all'
      if (selectedFeature === featureToDeleteId) {
        setSelectedFeature('all');
      }

      // Show success message
      setSuccessMessage('Feature deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh tests (might need adjustment depending on desired behavior)
      fetchTestsWithCurrentFilters();

    } catch (err) {
      console.error('Error deleting feature:', err);
      setError('Failed to delete feature. Please try again.');
      setSuccessMessage(null);
    } finally {
      setLoading(false); // Reset general loading or specific loading state
      setIsConfirmFeatureDeleteModalOpen(false); // Close modal
      setFeatureToDeleteId(null); // Reset feature ID
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
      // Clean up all test execution polling intervals when component unmounts
      Object.values(testPollingIntervalsRef.current).forEach(interval => {
        clearInterval(interval);
      });
      testPollingIntervalsRef.current = {};

      // Clean up test generation polling if active
      if (pollingIntervalRef.current) {
        pollingIntervalRef.current();
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Add a function to check if any tests are running
  const hasRunningTests = () => {
    return Object.keys(runningTests).length > 0;
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const allIds = filteredTests.map(test => test.id);
      setSelectedTestIds(new Set(allIds));
    } else {
      setSelectedTestIds(new Set());
    }
  };

  const handleSelectTest = (event, testId) => {
    const newSelectedIds = new Set(selectedTestIds);
    if (event.target.checked) {
      newSelectedIds.add(testId);
    } else {
      newSelectedIds.delete(testId);
    }
    setSelectedTestIds(newSelectedIds);
  };

  const handleDeleteSelectedTests = async () => {
    const numSelected = selectedTestIds.size;
    if (numSelected === 0) return;

    // Open the confirmation modal instead of using window.confirm
    setIsConfirmModalOpen(true);
  };

  // New function to handle the actual deletion after confirmation
  const confirmDeleteSelectedTests = async () => {
    const numSelected = selectedTestIds.size;
    if (numSelected === 0) return; // Should not happen if modal was opened, but good practice

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    const deletionPromises = Array.from(selectedTestIds).map(testId =>
      deleteTest(testId)
        .then(() => ({ status: 'fulfilled', testId }))
        .catch(err => ({ status: 'rejected', testId, error: err }))
    );

    const results = await Promise.allSettled(deletionPromises);

    const failedDeletions = results.filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && result.value.status === 'rejected'));
    const successfulDeletions = numSelected - failedDeletions.length;

    setIsDeleting(false);
    setSelectedTestIds(new Set()); // Clear selection after deletion attempt

    if (successfulDeletions > 0) {
      setSuccessMessage(`${successfulDeletions} test(s) deleted successfully.`);
      // Refresh the test list after successful deletions
      await fetchTestsWithCurrentFilters();
    }

    if (failedDeletions.length > 0) {
      console.error('Failed to delete tests:', failedDeletions);
      setError(`Failed to delete ${failedDeletions.length} test(s). Check console for details.`);
    }

    // Clear messages after a delay
    setTimeout(() => {
      setSuccessMessage(null);
      setError(null);
    }, 3000);
  };

  // New function to fetch latest executions for the current tests
  const fetchLatestExecutions = async (testsToFetchFor) => {
    if (!testsToFetchFor || testsToFetchFor.length === 0) {
      setLatestExecutionsMap({});
      return;
    }
    try {
      const testIds = testsToFetchFor.map(t => t.id);
      const latestExecutions = await getLatestTestExecutions(testIds);
      setLatestExecutionsMap(latestExecutions);

      // Start polling for any executions that are already pending
      Object.values(latestExecutions).forEach(exec => {
        if (exec.status === TEST_STATUS.PENDING) {
          setSuccessMessage('Test Generation in Progress\n\nTest generation in progress. Status: pending');
          pollTestExecutionStatus(exec.test_id, exec.execution_id);
          // Also mark the test as running visually
          setRunningTests(prev => ({ ...prev, [exec.test_id]: true }));
        }
      });

      // Re-apply filters after getting latest executions
      applyFilters(testsToFetchFor, selectedStatus, searchQuery, latestExecutions);
    } catch (err) {
      console.error('Error fetching latest executions:', err);
      // Optionally set an error state here
      setLatestExecutionsMap({}); // Clear map on error
    }
  };

  // Add a function to check if ALL filtered tests are running
  const allFilteredTestsRunning = () => {
    if (filteredTests.length === 0) return false; // Cannot run if no tests are filtered
    return filteredTests.every(test => runningTests[test.id]);
  };

  // Add the checkExistingTaskId function
  const checkExistingTaskId = async () => {
    if (!selectedFeature) return;
    
    try {
      // If "all features" is selected, check all features for ongoing generation
      if (selectedFeature === 'all') {
        
        // Get all features
        const allFeatures = features;
        
        const ongoingGenerations = [];
        
        // Check each feature for ongoing generation
        for (const feature of allFeatures) {
          try {
            // Use feature ID to check task-manager status
            const statusData = await getTestGenerationStatus(feature.id);
            
            if (statusData && statusData.status === TEST_STATUS.PENDING) {
              ongoingGenerations.push({
                id: feature.id,
                name: feature.name
              });
            } else if (statusData && statusData.status === 'error') {
              setError(`Test generation failed for feature "${feature.name}": ${statusData.error}`);
            }
          } catch (taskError) {
            console.error(`Error checking task-manager status for feature ${feature.id}:`, taskError);
            // Continue checking other features
          }
        }

        // Update state based on ongoing generations
        if (ongoingGenerations.length > 0) {
          setIsGeneratingTests(true);
          setGeneratingFeatures(ongoingGenerations);
          // Start polling for each feature
          ongoingGenerations.forEach(feature => {
            startTestGenerationPolling(feature.id);
          });
        } else {
          setIsGeneratingTests(false);
          setGeneratingFeatures([]);
          // Clear any existing polling intervals
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
        return;
      }

      // For single feature selection
      try {
        // Use feature ID to check task-manager status
        const statusData = await getTestGenerationStatus(selectedFeature);
        
        if (statusData && statusData.status === TEST_STATUS.PENDING) {
          setIsGeneratingTests(true);
          setGeneratingFeatures([{
            id: selectedFeature,
            name: features.find(f => f.id === selectedFeature)?.name || 'Selected Feature'
          }]);
          startTestGenerationPolling(selectedFeature);
        } else if (statusData && statusData.status === 'error') {
          // Clear any existing polling interval
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsGeneratingTests(false);
          setGeneratingFeatures([]);
          setError(`Test generation failed: ${statusData.error}`);
          setSuccessMessage(null);
        } else if (statusData && statusData.status === 'unknown') {
          // Clear any existing polling interval
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsGeneratingTests(false);
          setGeneratingFeatures([]);
          setSuccessMessage(null);
        } else {
          setIsGeneratingTests(false);
          setGeneratingFeatures([]);
          setSuccessMessage(null);
          console.log('No ongoing test generation found in task-manager');
        }
      } catch (taskError) {
        console.error('Error checking task-manager status:', taskError);
        // If we get a 404, it means no task is running
        if (taskError.response && taskError.response.status === 404) {
          console.log('No task found in task-manager');
          setIsGeneratingTests(false);
          setGeneratingFeatures([]);
          setSuccessMessage(null);
        } else {
          // For other errors, we'll assume there might be a task running
          console.log('Assuming task might be running due to error');
          setIsGeneratingTests(true);
          // Don't set success message here - let the polling function handle it
          // Start polling with the feature ID
          startTestGenerationPolling(selectedFeature);
        }
      }
    } catch (error) {
      console.error('Error checking existing task ID:', error);
      setError('Error checking test generation status. Please try again.');
      setIsGeneratingTests(false);
      setGeneratingFeatures([]);
      setSuccessMessage(null);
    }
  };

  // Update the startTestGenerationPolling function
  const startTestGenerationPolling = async (featureId) => {
    if (!featureId) return;

    try {
      // Clear any existing polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Set initial states
      setIsGeneratingTests(true);
      setError(null);
      

      const checkStatus = async () => {
        try {
          const statusData = await getTestGenerationStatus(featureId);
          
          if (statusData.status === 'unknown' && testGenerationStatusRetryCount < MAX_RETRIES_TEST_GENERATION_STATUS) {
            testGenerationStatusRetryCount++;
            setTimeout(checkStatus, TEST_GENERATION_STATUS_RETRY_DELAY);
            return;
          }

          // If we've exhausted retries or got a valid status, start polling
          if (statusData.status === TEST_STATUS.PENDING) {
            setSuccessMessage('Test Generation in Progress.\n Status: pending');
            
            // Start the actual polling interval
            pollingIntervalRef.current = setInterval(async () => {
              try {
                const pollStatusData = await getTestGenerationStatus(featureId);
                
                // If status is unknown, stop polling and reset all states
                if (pollStatusData.status === 'unknown') {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                  setIsGeneratingTests(false);
                  setGeneratingFeatures([]);
                  setSuccessMessage(null);
                  return;
                }
                
                // Update status message for other statuses
                setSuccessMessage(`Test Generation In Progress. Status: ${pollStatusData.status}`);
                
                // If status is no longer pending, stop polling
                if (pollStatusData.status !== TEST_STATUS.PENDING) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                  setIsGeneratingTests(false);
                  setGeneratingFeatures([]);
                  
                  // Refresh tests list
                  await fetchTestsWithCurrentFilters();
                  
                  // Show appropriate message
                  if (pollStatusData.status === TEST_STATUS.PASSED) {
                    setSuccessMessage('Test generation completed successfully.');
                  } else if (pollStatusData.status === TEST_STATUS.FAILED || 
                            pollStatusData.status === TEST_STATUS.ERROR || 
                            pollStatusData.status === TEST_STATUS.BLOCKED_BY_CAPTCHA || 
                            pollStatusData.status === TEST_STATUS.AGENT_LIMITATION || 
                            pollStatusData.status === TEST_STATUS.UNEXISTING_FEATURE) {
                    setError(`Test generation failed: ${pollStatusData.status}. Please try again.`);
                    setSuccessMessage(null);
                  } else {
                    setSuccessMessage('Test generation status updated.');
                  }
                }
              } catch (error) {
                console.error('Error polling test generation status:', error);
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                setIsGeneratingTests(false);
                setGeneratingFeatures([]);
                setSuccessMessage(null);
                setError('Error checking test generation status. Please try again.');
              }
            }, 2000); // Poll every 2 seconds
          } else {
            // If we never get a PENDING status after retries, handle accordingly
            setIsGeneratingTests(false);
            setGeneratingFeatures([]);
            setSuccessMessage(null);
            if (statusData.status === 'error') {
              setError(`Test generation failed: ${statusData.status}. Please try again.`);
            }
          }
        } catch (error) {
          console.error('Error checking initial status:', error);
          if (testGenerationStatusRetryCount < MAX_RETRIES_TEST_GENERATION_STATUS) {
            testGenerationStatusRetryCount++;
            setTimeout(checkStatus, TEST_GENERATION_STATUS_RETRY_DELAY);
          } else {
            setIsGeneratingTests(false);
            setGeneratingFeatures([]);
            setSuccessMessage(null);
            setError('Error checking test generation status. Please try again.');
          }
        }
      };

      // Start the initial status check
      checkStatus();
    } catch (error) {
      console.error('Error starting test generation polling:', error);
      setIsGeneratingTests(false);
      setGeneratingFeatures([]);
      setSuccessMessage(null);
      setError('Error starting test generation status check. Please try again.');
    }
  };

  // Update the useEffect to use checkExistingTaskId
  useEffect(() => {
    let isMounted = true;
    let checkTimeout = null;

    const initialize = async () => {
      if (!isMounted) return;
      
      // Check for existing task ID when component mounts or feature changes
      await checkExistingTaskId();
    };

    // Use a small timeout to ensure the component is fully mounted
    checkTimeout = setTimeout(() => {
      initialize();
    }, 100);

    // Cleanup function
    return () => {
      isMounted = false;
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
      // Only clear polling interval if component is unmounting
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [selectedFeature]); // Keep selectedFeature dependency

  // Add a new useEffect for initial mount check
  useEffect(() => {
    let isMounted = true;
    let checkTimeout = null;
    let retryCount = 0;

    const initialize = async () => {
      if (!isMounted) return;
      
      // Wait for features to be loaded
      if (features.length === 0) {
        if (retryCount >= MAX_RETRIES_FEATURE_LOADING) {
          console.error('Failed to load features after maximum retries');
          setError('Failed to load features. Please refresh the page or try again later.');
          return;
        }
        
        retryCount++;
        // Try again in 500ms
        checkTimeout = setTimeout(initialize, 500);
        return;
      }
      
      // Run initial check regardless of feature selection
      await checkExistingTaskId();
    };

    // Start the initialization process
    initialize();

    return () => {
      isMounted = false;
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
    };
  }, [features]); // Add features as a dependency

  // Add a separate useEffect for handling visibility changes
  useEffect(() => {
    let visibilityTimeout;
    let isHandlingVisibility = false;

    const handleVisibilityChange = () => {
      if (isHandlingVisibility) return; // Prevent multiple simultaneous handlers
      isHandlingVisibility = true;

      try {
        // Clear any existing timeout
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }
        
        // Only restart polling if we were previously generating tests and have a task ID
        if (!document.hidden && isGeneratingTests && generatingFeatures.length > 0 && !pollingIntervalRef.current) {
          // Add a small delay before restarting polling to prevent rapid restarts
          visibilityTimeout = setTimeout(() => {
            try {
              startTestGenerationPolling(generatingFeatures[0].id);
            } finally {
              isHandlingVisibility = false;
            }
          }, 500);
        }
      } catch (error) {
        console.error('Error handling visibility change:', error);
      } finally {
        if (!visibilityTimeout) {
          isHandlingVisibility = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
    };
  }, [isGeneratingTests, generatingFeatures]); // Keep these dependencies as they're needed for the visibility handler

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

      {/* Confirmation Modal for Deletion */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteSelectedTests} // Call the actual delete logic on confirm
        title="Delete Selected Tests"
        message={`Are you sure you want to delete ${selectedTestIds.size} selected test(s)? This action cannot be undone.`}
        confirmButtonText="Delete"
        confirmButtonVariant="danger"
      />

      {/* Confirmation Modal for Feature Deletion */}
      <ConfirmationModal
        isOpen={isConfirmFeatureDeleteModalOpen}
        onClose={() => {
          setIsConfirmFeatureDeleteModalOpen(false);
          setFeatureToDeleteId(null);
        }}
        onConfirm={confirmDeleteFeature} // Call the actual feature delete logic on confirm
        title="Delete Feature"
        message={`Are you sure you want to delete this feature? This will also delete all associated tests. This action cannot be undone.`}
        confirmButtonText="Delete Feature"
        confirmButtonVariant="danger"
      />

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
      {successMessage && isBannerRelevant && (
        <div className={`mb-6 p-4 ${isGeneratingTests ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-green-100 border-green-200 text-green-700'} border rounded-lg flex items-start justify-between`}>
          <div className="flex-1 break-words overflow-hidden">
            {isGeneratingTests && (
              <div className="flex items-center mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <p className="font-medium">
                  Test Generation in Progress
                  {generatingFeatures.length > 0 && selectedFeature === 'all' && (
                    <span className="ml-2 text-blue-600">
                      for features: {generatingFeatures.map(f => `"${f.name}"`).join(', ')}
                    </span>
                  )}
                </p>
              </div>
            )}
            <p>{successMessage}</p>
          </div>
          {isGeneratingTests && generatingFeatures.length > 0 && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded ml-2 whitespace-nowrap">
              {generatingFeatures.length} feature{generatingFeatures.length > 1 ? 's' : ''} in progress
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
                {/* Update the message slightly for consistency */}
                You need to add test credentials before running or generating tests. Go to the{' '}
                <a href="/test-credentials" className="text-yellow-900 font-medium underline">
                  Test Credentials Management
                </a>{' '}
                section.
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
                {/* Dynamically generate status options */}
                {Object.entries(TEST_STATUS).map(([key, value]) => (
                  <option key={key} value={value}>
                    {formatStatus(value)}
                  </option>
                ))}
              </select>
            </div>

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
              disabled={isGeneratingTests || !secrets || secrets.length === 0 || selectedFeature === 'all'}
              className="flex items-center justify-center px-3 py-2 bg-purple-600 text-white rounded-md shadow hover:bg-purple-700 transition duration-150 disabled:bg-purple-300 disabled:cursor-not-allowed"
              title={
                !secrets || secrets.length === 0 ? "Test credentials required to generate tests" :
                selectedFeature === 'all' ? "Please select a specific feature first" :
                isGeneratingTests ? "Generation in progress..." :
                "Generate tests for selected feature using AI"
              }
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
                </>
              )}
            </button>

            {/* Add Test button */}
            <button
              onClick={handleCreateTestClick}
              disabled={selectedFeature === 'all'}
              className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition duration-150 disabled:bg-blue-300 disabled:cursor-not-allowed"
              title={selectedFeature === 'all' ? "Please select a specific feature first" : "Add new test to selected feature"}
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
            {selectedTestIds.size > 0
              ? `${selectedTestIds.size} test(s) selected`
              : `${filteredTests.length} tests showing`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRunSelectedTests}
              disabled={filteredTests.length === 0 || allFilteredTestsRunning() || !secrets || secrets.length === 0}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150 disabled:bg-green-300 disabled:cursor-not-allowed"
              title={
                !secrets || secrets.length === 0 ? "Test credentials required to run tests" :
                filteredTests.length === 0 ? "No tests to run" :
                allFilteredTestsRunning() ? "All visible tests are already running" :
                "Run all non-running visible tests"
              }
            >
              {allFilteredTestsRunning() ? ( // Show spinner and 'Running...' only if ALL are running
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Running...
                </>
              ) : (
                <>
                  <Play size={18} className="mr-2" />
                  Run Tests
                </>
              )}
            </button>
            {/* Delete Selected Tests button - Conditionally rendered */}
            {selectedTestIds.size > 0 && (
              <button
                onClick={handleDeleteSelectedTests} // This now opens the modal
                disabled={isDeleting || hasRunningTests()}
                className={`flex items-center px-3 py-1.5 text-sm bg-red-600 text-white rounded-md shadow hover:bg-red-700 transition duration-150 disabled:bg-red-300 disabled:cursor-not-allowed ${isDeleting ? 'cursor-wait' : ''}`}
                title={isDeleting ? "Deleting..." : hasRunningTests() ? "Cannot delete while tests are running" : "Delete selected tests"}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} className="mr-2" />
                    Delete ({selectedTestIds.size})
                  </>
                )}
              </button>
            )}
          </div>
        </div>

            <div className="overflow-x-auto">
              <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          onChange={handleSelectAll}
                          checked={filteredTests.length > 0 && selectedTestIds.size === filteredTests.length}
                          disabled={filteredTests.length === 0}
                          title={filteredTests.length > 0 ? "Select/deselect all visible tests" : "No tests to select"}
                        />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('latest_status')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon('latest_status')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Name
                          {getSortIcon('name')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('feature_name')}
                      >
                        <div className="flex items-center">
                          Feature
                          {getSortIcon('feature_name')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden sm:table-cell"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center">
                          Category
                          {getSortIcon('category')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden md:table-cell"
                        onClick={() => handleSort('latest_ended_at')}
                      >
                        <div className="flex items-center">
                          Last Run
                          {getSortIcon('latest_ended_at')}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTests.length > 0 ? (
                      filteredTests.map((test) => (
                        <tr
                          key={test.id}
                          className={`hover:bg-gray-50 cursor-pointer ${selectedTestIds.has(test.id) ? 'bg-blue-50' : ''}`}
                          onClick={() => handleTestSelect(test)}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              checked={selectedTestIds.has(test.id)}
                              onChange={(e) => handleSelectTest(e, test.id)}
                              onClick={(e) => e.stopPropagation()} // Prevent row click handler
                            />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                          {runningTests[test.id] ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                          ) : (
                            // Get status from the map
                            getStatusIconLarge(latestExecutionsMap[test.id]?.status)
                          )}
                          <span className={`ml-2 text-sm font-medium px-2 py-1 rounded-full ${runningTests[test.id] ? 'bg-blue-100 text-blue-800' : getStatusColorClasses(latestExecutionsMap[test.id]?.status)}`}>
                            {/* Get status from the map or show running */}
                            {runningTests[test.id] ? formatStatus(RUNNING_STATUS) : formatStatus(latestExecutionsMap[test.id]?.status) ?? 'Not Run'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{test.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-md">{test.description}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600 truncate">
                              {features.find(f => f.id === test.feature_id)?.name || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {test.category}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                            <div className="text-sm text-gray-500 flex items-center">
                              <Calendar size={14} className="mr-1" />
                              {/* Format ended_at from the map */}
                              {formatDate(latestExecutionsMap[test.id]?.ended_at) ?? '--'}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center items-center space-x-2">
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
                        <td colSpan="7" className="px-6 py-12 text-center text-lg text-gray-500">
                          {tests.length === 0 && selectedFeature === 'all' ? (
                            <div className="flex flex-col items-center">
                              <p>No features or tests found for this product.</p>
                              <p className="text-sm mt-2">Start by adding a Feature using the dropdown menu, then generate or add tests.</p>
                          </div>
                          ) : tests.length === 0 && selectedFeature !== 'all' ? (
                              <div className="flex flex-col items-center">
                                  <p>No tests found for the selected feature.</p>
                                  <p className="text-sm mt-2">Use "Generate Tests with AI" or "Add Test" to create some.</p>
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
                {/* Calculate total with executions for clarity (optional) */}
                {` (${Object.values(latestExecutionsMap).filter(exec => exec.status).length} with runs)`}
                {selectedTestIds.size > 0 && (
                  <span className="ml-2 text-gray-500 text-sm">({selectedTestIds.size} selected)</span>
                )}
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
