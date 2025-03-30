import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Loader, TestTube, AlertCircle, Play, Trash2, Edit } from 'lucide-react';
import TestExecutionHistory from '../test/TestExecutionHistory';
import TestExecutionDetail from '../test/TestExecutionDetail';
import { getTestExecutions, createTestExecution } from '@/services/testExecutionService';
import { deleteTest } from '@/services/testService';
import EditTestModal from './EditTestModal';

/**
 * Modal component for displaying detailed test information
 */
const TestDetailsModal = ({ test, onClose, onTestUpdated }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [runningTest, setRunningTest] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [testData, setTestData] = useState(test);

  useEffect(() => {
    // Load test executions when the modal opens or when a new execution is created
    fetchTestExecutions();
  }, [testData.id]);

  // Update testData if the passed test prop changes
  useEffect(() => {
    setTestData(test);
  }, [test]);

  const fetchTestExecutions = async () => {
    try {
      setLoadingExecutions(true);
      const data = await getTestExecutions(testData.id);
      setExecutions(data);
    } catch (err) {
      console.error('Error fetching test executions:', err);
    } finally {
      setLoadingExecutions(false);
    }
  };

  // Format date and time display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleString();
  };

  // Calculate duration between start and end dates
  const getDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Not available';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get status icon based on test status
  const getTestStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'FAILED':
        return <XCircle size={20} className="text-red-500" />;
      case 'ERROR':
        return <XCircle size={20} className="text-red-500" />;
      case 'PENDING':
        return <Loader size={20} className="text-yellow-500" />;
      case 'IN_PROGRESS':
        return <Loader size={20} className="text-blue-500" />;
      case 'BLOCKED':
        return <AlertCircle size={20} className="text-orange-500" />;
      case 'SKIPPED':
        return <TestTube size={20} className="text-blue-500" />;
      case 'NOT_STARTED':
      default:
        return <TestTube size={20} className="text-gray-400" />;
    }
  };

  // Get background and text color based on test status
  const getTestStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'BLOCKED':
        return 'bg-orange-100 text-orange-800';
      case 'SKIPPED':
        return 'bg-blue-100 text-blue-800';
      case 'NOT_STARTED':
      default:
        return 'bg-gray-100 text-gray-600';
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            {getTestStatusIcon(testData.status)}
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

        {/* Edit Test Modal */}
        {isEditModalOpen && (
          <EditTestModal
            test={testData}
            onClose={() => setIsEditModalOpen(false)}
            onTestUpdated={handleTestEdited}
          />
        )}

        {/* Tabs navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm mr-8 ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Test Details
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setSelectedExecution(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Execution History
            </button>
          </nav>
        </div>

        {/* Modal body */}
        <div className="px-6 py-4">
          {activeTab === 'details' && (
            <>
              {/* Status and category section */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTestStatusColor(testData.status)}`}>
                  {testData.status || 'Not Started'}
                </span>
                {testData.category && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
                    {testData.category}
                  </span>
                )}
              </div>

              {/* Basic details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">URL</div>
                  <div className="text-gray-800">{testData.url || 'Not specified'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Last Run</div>
                  <div className="text-gray-800">{testData.started_at ? formatDateTime(testData.started_at) : 'Not run yet'}</div>
                </div>
              </div>

              {/* Description section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{testData.description}</p>
                </div>
              </div>

              {/* Preconditions section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Preconditions</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{testData.preconditions}</p>
                </div>
              </div>

              {/* Steps section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Steps</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{testData.steps}</p>
                </div>
              </div>

              {/* Expected results section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Expected Results</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{testData.expected_results}</p>
                </div>
              </div>

              {/* Assertions section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Assertions</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{testData.assertions}</p>
                </div>
              </div>

              {/* Bugs section */}
              {testData.bugs && testData.bugs.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Bugs ({testData.bugs.length})</h3>
                  <div className="space-y-3">
                    {testData.bugs.map(bug => (
                      <div key={bug.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-red-800">{bug.name}</h4>
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                            {bug.severity}
                          </span>
                        </div>
                        <p className="text-gray-700">{bug.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && !selectedExecution && (
            <TestExecutionHistory
              testId={testData.id}
              onExecutionSelect={handleExecutionSelect}
            />
          )}

          {activeTab === 'history' && selectedExecution && (
            <TestExecutionDetail
              execution={selectedExecution}
              onBack={handleBackToHistory}
            />
          )}
        </div>

        {/* Modal footer with action buttons */}
        {!(activeTab === 'history' && selectedExecution) && <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
          <div className="flex space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 flex items-center"
            >
              <Trash2 size={18} className="mr-2" />
              Delete Test
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 flex items-center"
            >
              <Edit size={18} className="mr-2" />
              Edit Test
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Close
            </button>

            <button
              onClick={handleRunTest}
              disabled={runningTest}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              {runningTest ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Running...
                </>
              ) : (
                <>
                  <Play size={18} className="mr-2" />
                  Run Test
                </>
              )}
            </button>
          </div>
        </div>}
      </div>
    </div>
  );
};

export default TestDetailsModal;
