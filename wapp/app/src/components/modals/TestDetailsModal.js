import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader, Play, Trash2, Edit, Server, AlertTriangle, Copy, Link, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TestExecutionHistory from '../test/TestExecutionHistory';
import TestExecutionDetail from '../test/TestExecutionDetail';
import { getTestExecutions, createTestExecution } from '@/services/testExecutionService';
import { deleteTest, duplicateTest, improveTestSteps, getImproveTestStepsStatus } from '@/services/testService';
import { useSecret } from '@/context/SecretContext';
import EditTestModal from './EditTestModal';
import usePendingStatusPolling from '@/hooks/usePendingStatusPolling';
import { getStatusInfo, getExecutorIcon, formatExecutionDate, formatStatus, TEST_STATUS } from '@/utils/testExecutionUtils';

/**
 * Component to display the last test execution in a table format
 */
const LastTestExecution = ({ execution, onExecutionSelect }) => {
  if (!execution) {
    return (
      <div className="bg-gray-50 p-5 rounded-lg text-gray-500 text-center my-5">
        No execution history available for this test.
      </div>
    );
  }

  // Determine if the execution is currently running
  const isRunning = execution.status === TEST_STATUS.PENDING;

  // Determine icon and color based on running status
  const { icon: statusIcon, color: statusColor } = !isRunning ? getStatusInfo(execution.status) : { icon: null, color: null };

  return (
    <div className="mb-8 mt-2">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        Last Execution
      </h3>
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            <tr
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onExecutionSelect && onExecutionSelect(execution)}
            >
              <td className="px-5 py-4 whitespace-nowrap">
                {/* Conditional rendering for status/running state */}
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${isRunning ? 'bg-blue-100 text-blue-600' : statusColor}`}>
                  {isRunning ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-1.5"></div>
                  ) : (
                    statusIcon // Use the determined status icon
                  )}
                  <span className="ml-1.5 text-xs">
                    {isRunning ? 'Running' : formatStatus(execution.status)}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                {formatExecutionDate(execution.started_at)}
              </td>
              <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                <div className="inline-flex items-center">
                  <Server size={14} className="mr-1 text-gray-500" />
                  {execution.environment}
                </div>
              </td>
              <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                <div className="inline-flex items-center">
                  {getExecutorIcon(execution.executor_type)}
                  <span className="ml-1.5">
                    {execution.executor_name || execution.executor_type}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                {/* Display 'Running' or duration */}
                {isRunning
                  ? <span className="text-blue-600 font-medium">Running</span>
                  : execution.duration_ms
                    ? `${(execution.duration_ms / 1000).toFixed(1)}s`
                    : execution.ended_at
                      ? 'Completed'
                      : '--' // Fallback if not running, no duration, not ended
                }
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Modal component for displaying detailed test information
 */
const TestDetailsModal = ({ test: initialTest, featureUrl, onClose, onTestUpdated }) => {
  const [testData, setTestData] = useState(initialTest);
  const [activeTab, setActiveTab] = useState('details');
  const [executions, setExecutions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [runningTest, setRunningTest] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isImprovingSteps, setIsImprovingSteps] = useState(false);
  const improveStepsIntervalRef = useRef(null);
  const modalRef = useRef(null);
  const [isStepsExpanded, setIsStepsExpanded] = useState(false); // State for steps expansion

  // Toggle steps expansion
  const toggleStepsExpansion = useCallback(() => {
    setIsStepsExpanded(prev => !prev);
  }, []);

  // Get secrets/credentials from the context
  const { secrets, fetchSecrets } = useSecret();

  // Fetch secrets when component mounts
  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  // Function to fetch test data (can be used for refresh after improvement)
  const fetchTestData = useCallback(async () => {
    if (!testData || !testData.id) return; // Guard against missing ID
    try {
      if (typeof onTestUpdated === 'function') {
          onTestUpdated();
      }
    } catch (err) {
      console.error('Error refetching test data:', err);
      // Handle error appropriately
    }
  }, [testData, onTestUpdated]);

  // Function to start and manage polling for step improvement status
  const pollImprovementStatus = useCallback((currentTestId) => {
    // Clear existing interval just in case
    if (improveStepsIntervalRef.current) {
      clearInterval(improveStepsIntervalRef.current);
    }

    improveStepsIntervalRef.current = setInterval(async () => {
      try {
        const pollResponse = await getImproveTestStepsStatus(currentTestId);
        const stillPending = pollResponse && pollResponse.status === TEST_STATUS.PENDING;

        if (!stillPending) {
          // Stop polling
          clearInterval(improveStepsIntervalRef.current);
          improveStepsIntervalRef.current = null;
          setIsImprovingSteps(false);
          setError(null); // Clear any previous status message
          // Show final status message
          if (pollResponse.status === TEST_STATUS.PASSED) {
            fetchTestData(); // Refresh test data
          } else if (pollResponse.status === TEST_STATUS.ERROR || pollResponse.status === TEST_STATUS.FAILED) {
            setError('Failed to improve test steps. Please try again.');
          }
          setTimeout(() => setError(null), 5000);
        }
        // Keep isImprovingSteps true while pending
      } catch (pollErr) {
        console.error('Error during step improvement polling:', pollErr);
        // Stop polling on error
        clearInterval(improveStepsIntervalRef.current);
        improveStepsIntervalRef.current = null;
        setIsImprovingSteps(false);
        setError('Error checking improvement status. Polling stopped.');
        setTimeout(() => setError(null), 5000);
      }
    }, 5000); // Poll every 5 seconds
  }, [fetchTestData]);

  // Check Status on Load/Change
  useEffect(() => {
    setTestData(initialTest); // Update internal test data state

    // Clear any previous interval when test changes
    if (improveStepsIntervalRef.current) {
      clearInterval(improveStepsIntervalRef.current);
      improveStepsIntervalRef.current = null;
    }

    if (initialTest && initialTest.id) {
      const checkInitialStatus = async () => {
        try {
          const statusResponse = await getImproveTestStepsStatus(initialTest.id);
          const isPending = statusResponse && (statusResponse.status === TEST_STATUS.PENDING);

          setIsImprovingSteps(isPending);

          if (isPending) {
            // Start polling if initially pending
            pollImprovementStatus(initialTest.id);
          }
        } catch (err) {
          console.error('Failed to check initial step improvement status:', err);
          setIsImprovingSteps(false); // Ensure button is enabled on error
        }
      };
      checkInitialStatus();
    }

    // Cleanup function to clear interval when component unmounts or initialTest changes
    return () => {
      if (improveStepsIntervalRef.current) {
        clearInterval(improveStepsIntervalRef.current);
      }
    };
  }, [initialTest, fetchTestData, pollImprovementStatus]);

  // Function to close modal and ensure updated test data is passed back
  const handleClose = useCallback(() => {
    // If onTestUpdated is provided, call it with the latest test data
    if (typeof onTestUpdated === 'function') {
      onTestUpdated(testData);
    }
    // Call the original onClose function
    onClose();
  }, [testData, onClose, onTestUpdated]);

  // Fetch executions when component mounts
  const fetchTestExecutions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTestExecutions(testData.id);

      // Sort executions by started_at date descending (newest first)
      const sortedExecutions = data.sort((a, b) =>
        new Date(b.started_at) - new Date(a.started_at)
      );

      setExecutions(sortedExecutions);
    } catch (err) {
      console.error('Error fetching test executions:', err);
      setError('Failed to load test executions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [testData.id]);

  // If there's an execution that's in the pending state, poll for updates
  const needsPolling = usePendingStatusPolling(
    fetchTestExecutions,
    () => executions.some(exec => exec.status === TEST_STATUS.PENDING),
    [executions]
  );

  useEffect(() => {
    fetchTestExecutions();
  }, [fetchTestExecutions]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isStepsExpanded) {
          toggleStepsExpansion();
        } else {
          handleClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleClose, isStepsExpanded, toggleStepsExpansion]);

  // Handle click outside of modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClose]);

  // Handle test execution created
  const handleTestExecutionCreated = (execution) => {
    // Add the new execution to the list
    setExecutions([execution, ...executions]);
    // Switch to the history tab
    setActiveTab('history');
    // Automatically select the new execution to show its details
    setSelectedExecution(execution);
  };

  // New function to directly run the test
  const handleRunTest = async (forceNoCache = false) => {
    // Check if credentials are available
    if (!secrets || secrets.length === 0) {
      setError('Cannot run test: No test credentials found. Please add credentials in the Test Credentials Management section.');
      return;
    }

    try {
      setRunningTest(true);
      setError(null);

      const executionData = {
        test_id: testData.id,
        status: TEST_STATUS.PENDING,
        environment: 'development', // Default to development environment
        executor_type: 'MANUAL',
        notes: null,
        run_without_cache: forceNoCache,
      };

      const execution = await createTestExecution(executionData);
      handleTestExecutionCreated(execution);

      // Add this to notify the parent component that a test was run
      if (typeof onTestUpdated === 'function') {
        onTestUpdated();
      }
    } catch (err) {
      console.error('Error starting test execution:', err);
      setError('Failed to start test execution. Please try again.');
    } finally {
      setRunningTest(false);
    }
  };

  // Handle execution selection
  const handleExecutionSelect = (execution) => {
    setSelectedExecution(execution);
  };

  // Handle back to history
  const handleBackToHistory = () => {
    setSelectedExecution(null);
  };

  // Handle test deletion
  const handleDeleteTest = async () => {
    try {
      setIsDeleting(true);
      await deleteTest(testData.id);
      // Call onTestUpdated to notify parent component that test was deleted
      if (typeof onTestUpdated === 'function') {
        onTestUpdated();
      }
      // Close the modal
      handleClose();
    } catch (err) {
      console.error('Error deleting test:', err);
      setIsDeleting(false);
      // Close delete confirmation dialog but keep modal open
      setShowDeleteConfirm(false);
    }
  };

  // Handle test edit
  const handleTestEdited = (updatedTest) => {
    try {
      if (updatedTest && typeof updatedTest === 'object') {
        // Create a fresh object with updated test data
        const newTestData = {
          ...testData,  // Keep existing properties
          ...updatedTest, // Override with updated properties
        };

        // Update state with new test data
        setTestData(newTestData);

        // Close the edit modal
        setShowEditModal(false);

        // Refresh executions if test properties that affect executions changed
        fetchTestExecutions();
      }
    } catch (err) {
      console.error('Error updating test data in modal:', err);
    }
  };

  // Function to handle duplicating the current test
  const handleDuplicateTest = async () => {
    try {
      setIsDuplicating(true);
      setError(null);

      const { id, name, feature_name, status, last_execution_id, started_at, ended_at, ...restOfTest } = testData;

      const duplicatedTest = {
        ...restOfTest,
        name: `${name} (Copy)`,
        // Ensure feature_id or epic_id is correctly assigned if needed (it should be in restOfTest)
      };

      // Call the service function
      await duplicateTest(duplicatedTest);

      // Notify the parent component (TestsTable) to refresh the list
      if (typeof onTestUpdated === 'function') {
        onTestUpdated(); // No specific data needed, just signal update
      }

      // Close the modal after successful duplication
      handleClose();

    } catch (err) {
      console.error('Error duplicating test:', err);
      setError(`Failed to duplicate test: ${err.response?.data?.detail || err.message || 'Please try again.'}`);
    } finally {
      setIsDuplicating(false);
    }
  };

  // Function to handle improving the test steps
  const handleImproveSteps = async () => {
    if (!testData || !testData.id) return;
    const currentTestId = testData.id;

    setIsImprovingSteps(true);
    setError(null); // Clear previous errors
    try {
      await improveTestSteps(currentTestId);
      pollImprovementStatus(currentTestId);
    } catch (err) {
      console.error('Error triggering step improvement:', err);
      setError(`Failed to trigger step improvement: ${err.response?.data?.detail || err.message || 'Please try again.'}`);
      setIsImprovingSteps(false); // Re-enable button on trigger error
      // Ensure polling is stopped if the trigger failed
      if (improveStepsIntervalRef.current) {
         clearInterval(improveStepsIntervalRef.current);
         improveStepsIntervalRef.current = null;
      }
    }
    // Polling function now handles setting isImprovingSteps to false
  };

  // Find the latest execution for the Last Execution component
  const latestExecution = executions.length > 0
    ? executions.sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0]
    : null;

  // Handle view details for last execution
  const handleViewLastExecutionDetails = (execution) => {
    setSelectedExecution(execution);
    setActiveTab('history');
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-auto"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        {/* Modal header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center flex-grow overflow-hidden">
            {/* Add clickable link icon if featureUrl exists - Moved to the left */}
            {featureUrl && (
              <a
                href={featureUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open Feature URL"
                className="mr-2 text-blue-600 hover:text-blue-800 transition-colors duration-150 flex-shrink-0"
              >
                <Link size={18} />
              </a>
            )}
            <h2 className="text-xl font-semibold text-gray-800 truncate">{testData.name}</h2>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this test: <span className="font-medium">{testData.name}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-150"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTest}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-150 flex items-center"
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader size={16} className="mr-2 animate-spin" /> : <Trash2 size={16} className="mr-2" />}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && (
          <EditTestModal
            test={testData}
            onClose={() => setShowEditModal(false)}
            onTestUpdated={handleTestEdited}
          />
        )}

        {/* Modal tabs */}
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            } flex items-center`}
            onClick={() => {
              setActiveTab('history');
              setSelectedExecution(null); // Reset selected execution when switching to history tab
            }}
          >
            Execution History
            {needsPolling && (
              <span className="ml-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
              </span>
            )}
          </button>
        </div>

        {/* Modal body */}
        <div className="px-6 py-4">
          {activeTab === 'details' && (
            <>
              {/* Last Execution section - new component */}
              <LastTestExecution
                execution={latestExecution}
                onExecutionSelect={handleViewLastExecutionDetails}
              />

              {/* Display error message if any */}
              {error && (
                <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-center">
                  <AlertTriangle size={20} className="mr-2 text-red-600" />
                  <p>{error}</p>
                </div>
              )}

              {/* Display credentials warning if none available */}
              {(!secrets || secrets.length === 0) && (
                <div className="mb-6 p-4 bg-yellow-100 border border-yellow-200 text-yellow-800 rounded-lg flex items-center">
                  <AlertTriangle size={20} className="mr-2 text-yellow-600" />
                  <div>
                    <p className="font-medium">Test credentials required</p>
                    <p className="text-sm mt-1">You need to add test credentials before running tests. Go to Test Credentials to add credentials.</p>
                  </div>
                </div>
              )}

              {/* Description section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  Description
                  {testData.category && (
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800 ml-3">
                      {testData.category}
                    </span>
                  )}
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-[200px] overflow-y-auto">
                  <p className="text-gray-800 whitespace-pre-line break-words">{testData.description}</p>
                </div>
              </div>

              {/* Steps and Expected Results */}
              <div className="mb-6">
                {/* Make the heading a flex container, align items to center */}
                <div className="flex items-center mb-2">
                  <h3 className="text-lg font-semibold">Steps</h3>
                  {/* Move the button here, add left margin */}
                  <button
                    onClick={handleImproveSteps}
                    className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition duration-150 flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-sm ml-3"
                    disabled={isImprovingSteps}
                    title="Automatically improve the test steps using AI"
                  >
                    {isImprovingSteps ? <Loader size={14} className="mr-1 animate-spin" /> : <Sparkles size={14} className="mr-1" />}
                    {isImprovingSteps ? 'Improving...' : 'Improve Steps'}
                  </button>
                </div>
                <div
                  className={`bg-gray-50 p-4 rounded-lg max-h-[200px] overflow-y-auto prose prose-sm max-w-none text-gray-800 whitespace-pre-line break-words ${!isStepsExpanded ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
                  onClick={!isStepsExpanded ? toggleStepsExpansion : undefined} // Only allow expanding
                  title={!isStepsExpanded ? "Click to expand steps" : ""}
                >
                  <ReactMarkdown>
                    {testData.steps}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Expanded Steps View */}
              {isStepsExpanded && (
                <div className="fixed inset-10 bg-white z-[60] p-8 overflow-y-auto rounded-lg shadow-xl">
                   <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xl font-semibold">Test Steps</h3>
                     <button
                        onClick={toggleStepsExpansion} // Close button
                        className="text-gray-500 hover:text-gray-700"
                     >
                       <X size={24} />
                     </button>
                   </div>
                   <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-line break-words">
                     <ReactMarkdown>
                       {testData.steps}
                     </ReactMarkdown>
                   </div>
                </div>
              )}

              {/* Preconditions section */}
              {testData.preconditions && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Preconditions</h3>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-[200px] overflow-y-auto">
                    <p className="text-gray-800 whitespace-pre-line break-words">{testData.preconditions}</p>
                  </div>
                </div>
              )}

              {/* Assertions section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Assertions</h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-[200px] overflow-y-auto">
                  <p className="text-gray-800 whitespace-pre-line break-words">{testData.assertions}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition duration-150 flex items-center"
                >
                  <Trash2 size={16} className="mr-1" />
                  Delete
                </button>
                <button
                  onClick={handleDuplicateTest}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition duration-150 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDuplicating}
                >
                  {isDuplicating ? <Loader size={16} className="mr-1 animate-spin" /> : <Copy size={16} className="mr-1" />}
                  {isDuplicating ? 'Duplicating...' : 'Duplicate'}
                </button>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition duration-150 flex items-center"
                >
                  <Edit size={16} className="mr-1" />
                  Edit Test
                </button>
                <button
                  onClick={() => handleRunTest(true)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition duration-150 flex items-center disabled:bg-yellow-300 disabled:cursor-not-allowed"
                  disabled={runningTest || !secrets || secrets.length === 0}
                  title={!secrets || secrets.length === 0 ? "Test credentials required to run tests" : "Force run this test (bypasses cache)"}
                >
                  <Play size={16} className="mr-1" />
                  Run without cache
                </button>
                <button
                  onClick={() => handleRunTest(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-150 flex items-center disabled:bg-green-300 disabled:cursor-not-allowed"
                  disabled={runningTest || !secrets || secrets.length === 0}
                  title={!secrets || secrets.length === 0 ? "Test credentials required to run tests" : "Run this test (uses cache if available)"}
                >
                  {runningTest ? (
                    <Loader size={16} className="mr-1 animate-spin" />
                  ) : (
                    <Play size={16} className="mr-1" />
                  )}
                  {runningTest ? 'Starting...' : 'Run Test'}
                </button>
              </div>
            </>
          )}

          {activeTab === 'history' && !selectedExecution && (
            <TestExecutionHistory
              executions={executions}
              isLoading={isLoading}
              error={error}
              onSelect={handleExecutionSelect}
              onRefresh={fetchTestExecutions}
            />
          )}

          {activeTab === 'history' && selectedExecution && (
            <TestExecutionDetail
              execution={selectedExecution}
              onBack={handleBackToHistory}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TestDetailsModal;
