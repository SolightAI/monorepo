import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Loader, TestTube, AlertCircle, Play } from 'lucide-react';
import TestExecutionHistory from '../test/TestExecutionHistory';
import TestExecutionDetail from '../test/TestExecutionDetail';
import RunTestModal from './RunTestModal';
import { getTestExecutions } from '@/services/testExecutionService';

/**
 * Modal component for displaying detailed test information
 */
const TestDetailsModal = ({ test, onClose }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [isRunTestModalOpen, setIsRunTestModalOpen] = useState(false);
  const [executions, setExecutions] = useState([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);

  useEffect(() => {
    // Load test executions when the modal opens or when a new execution is created
    fetchTestExecutions();
  }, [test.id]);

  const fetchTestExecutions = async () => {
    try {
      setLoadingExecutions(true);
      const data = await getTestExecutions(test.id);
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
      case 'PENDING':
      case 'IN_PROGRESS':
        return <Loader size={20} className="text-yellow-500" />;
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
      case 'PENDING':
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
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
  };

  // Handle execution selection
  const handleExecutionSelect = (execution) => {
    setSelectedExecution(execution);
  };

  // Handle back to history
  const handleBackToHistory = () => {
    setSelectedExecution(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            {getTestStatusIcon(test.status)}
            <h2 className="text-xl font-semibold text-gray-800 ml-3">{test.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>

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
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTestStatusColor(test.status)}`}>
                  {test.status || 'Not Started'}
                </span>
                {test.category && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
                    {test.category}
                  </span>
                )}
              </div>

              {/* Basic details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">URL</div>
                  <div className="text-gray-800">{test.url || 'Not specified'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Last Run</div>
                  <div className="text-gray-800">{test.started_at ? formatDateTime(test.started_at) : 'Not run yet'}</div>
                </div>
              </div>

              {/* Description section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{test.description}</p>
                </div>
              </div>

              {/* Preconditions section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Preconditions</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{test.preconditions}</p>
                </div>
              </div>

              {/* Steps section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Steps</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{test.steps}</p>
                </div>
              </div>

              {/* Expected results section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Expected Results</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{test.expected_results}</p>
                </div>
              </div>

              {/* Assertions section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Assertions</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-line">{test.assertions}</p>
                </div>
              </div>

              {/* Bugs section */}
              {test.bugs && test.bugs.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Bugs ({test.bugs.length})</h3>
                  <div className="space-y-3">
                    {test.bugs.map(bug => (
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
              testId={test.id}
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
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 mr-3"
          >
            Close
          </button>

          <button
            onClick={() => setIsRunTestModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Play size={18} className="mr-2" />
            Run Test
          </button>
        </div>
      </div>

      {/* Run Test Modal */}
      {isRunTestModalOpen && (
        <RunTestModal
          test={test}
          onClose={() => setIsRunTestModalOpen(false)}
          onTestExecutionCreated={handleTestExecutionCreated}
        />
      )}
    </div>
  );
};

export default TestDetailsModal;
