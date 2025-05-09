import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Server, AlertTriangle, Link } from 'lucide-react';
import TestExecutionHistory from '../test/TestExecutionHistory';
import TestExecutionDetail from '../test/TestExecutionDetail';
import { getTestExecutions } from '@/services/testExecutionService';
import { useSecret } from '@/context/SecretContext';
import usePendingStatusPolling from '@/hooks/usePendingStatusPolling';
import { getStatusInfo, getExecutorIcon, formatExecutionDate, formatStatus, TEST_STATUS } from '@/utils/testExecutionUtils';

// TODO Remove duplicate code with TestDetailsModal

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
const DemoTestDetailsModal = ({ test: initialTest, featureUrl, onClose, onTestUpdated }) => {
  const [testData, setTestData] = useState(initialTest);
  const [activeTab, setActiveTab] = useState('details');
  const [executions, setExecutions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const modalRef = useRef(null);

  // Update internal state when initialTest changes
  useEffect(() => {
    setTestData(initialTest);
  }, [initialTest]);

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
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleClose]);

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

  // Handle execution selection
  const handleExecutionSelect = (execution) => {
    setSelectedExecution(execution);
  };

  // Handle back to history
  const handleBackToHistory = () => {
    setSelectedExecution(null);
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
                <h3 className="text-lg font-semibold mb-2">Steps</h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-[200px] overflow-y-auto">
                  <p className="text-gray-800 whitespace-pre-line break-words">{testData.steps}</p>
                </div>
              </div>

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

export default DemoTestDetailsModal;
