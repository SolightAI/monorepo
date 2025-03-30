import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader, Play, Trash2, Edit, Server } from 'lucide-react';
import TestExecutionHistory from '../test/TestExecutionHistory';
import TestExecutionDetail from '../test/TestExecutionDetail';
import { getTestExecutions, createTestExecution } from '@/services/testExecutionService';
import { deleteTest } from '@/services/testService';
import EditTestModal from './EditTestModal';
import usePendingStatusPolling from '@/hooks/usePendingStatusPolling';
import { getStatusInfo, getExecutorIcon, formatExecutionDate, formatStatus, getStatusIconLarge } from '@/utils/testExecutionUtils';

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

  const { icon, color } = getStatusInfo(execution.status);

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
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${color}`}>
                  {icon}
                  <span className="ml-1.5 text-xs">{formatStatus(execution.status)}</span>
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
                {execution.duration_ms
                  ? `${(execution.duration_ms / 1000).toFixed(1)}s`
                  : execution.ended_at
                    ? 'Completed'
                    : 'In progress'
                }
              </td>
              <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                {execution.bugs_count > 0 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                    {execution.bugs_count} {execution.bugs_count === 1 ? 'bug' : 'bugs'}
                  </span>
                ) : (
                  <span className="text-gray-500">None</span>
                )}
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
const TestDetailsModal = ({ test: initialTest, onClose, onTestUpdated }) => {
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
  const modalRef = useRef(null);

  // If there's an execution that's in the pending state, poll for updates
  const { needsPolling } = usePendingStatusPolling(executions, setExecutions);

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

  useEffect(() => {
    fetchTestExecutions();
  }, [fetchTestExecutions]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Handle click outside of modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Format date for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not yet';

    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Calculate duration between dates
  const getDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'N/A';

    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end - start;

    // Format duration
    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

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
  const handleRunTest = async () => {
    try {
      setRunningTest(true);

      const executionData = {
        test_id: testData.id,
        status: 'PENDING',
        environment: 'development', // Default to development environment
        executor_type: 'MANUAL',
        notes: null
      };

      const execution = await createTestExecution(executionData);
      handleTestExecutionCreated(execution);

      // Add this to notify the parent component that a test was run
      if (typeof onTestUpdated === 'function') {
        onTestUpdated();
      }
    } catch (err) {
      console.error('Error starting test execution:', err);
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
      onClose();
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
      // Update the local test data with the edited values
      if (updatedTest && typeof updatedTest === 'object') {
        // Create a new object to update the state rather than mutating props
        setTestData({...testData, ...updatedTest});
      }

      // Refresh executions if test properties that affect executions changed
      fetchTestExecutions();

      // Call onTestUpdated to notify parent component that test was edited
      if (typeof onTestUpdated === 'function') {
        onTestUpdated(testData);
      }
    } catch (err) {
      console.error('Error updating test data in modal:', err);
    }
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
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            {getStatusIconLarge(testData.status)}
            <h2 className="text-xl font-semibold text-gray-800 ml-3">{testData.name}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
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
            onSave={handleTestEdited}
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

              {/* Basic details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">URL</div>
                  <div className="text-gray-800">{testData.url || 'Not specified'}</div>
                </div>
              </div>

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
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{testData.description}</p>
                </div>
              </div>

              {/* Steps and Expected Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Steps</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-line">{testData.steps}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Expected Results</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-line">{testData.expected_results}</p>
                  </div>
                </div>
              </div>

              {/* Assertions section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Assertions</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{testData.assertions}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition duration-150 flex items-center"
                >
                  <Edit size={16} className="mr-1" />
                  Edit Test
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition duration-150 flex items-center"
                >
                  <Trash2 size={16} className="mr-1" />
                  Delete
                </button>
                <button
                  onClick={handleRunTest}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-150 flex items-center"
                  disabled={runningTest}
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
