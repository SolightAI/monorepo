import React from 'react';
import { X, CheckCircle, XCircle, Loader, TestTube, AlertCircle } from 'lucide-react';

/**
 * Modal component for displaying detailed test information
 */
const TestDetailsModal = ({ test, onClose }) => {
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

        {/* Modal body */}
        <div className="px-6 py-4">
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

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600">{test.description || 'No description provided'}</p>
          </div>

          {/* Test details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left column - general info */}
            <div className="space-y-4">
              {/* URL */}
              {test.url && (
                <div>
                  <h3 className="text-md font-semibold text-gray-700 mb-2">URL</h3>
                  <a
                    href={test.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 break-words"
                  >
                    {test.url}
                  </a>
                </div>
              )}

              {/* Timing information */}
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-2">Timing Information</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Started:</span>
                    <span className="text-gray-700">{formatDateTime(test.started_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ended:</span>
                    <span className="text-gray-700">{formatDateTime(test.ended_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration:</span>
                    <span className="text-gray-700">{getDuration(test.started_at, test.ended_at)}</span>
                  </div>
                </div>
              </div>

              {/* Secret information */}
              {test.secrets && test.secrets.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold text-gray-700 mb-2">Secrets</h3>
                  <div className="space-y-2">
                    {test.secrets.map((secret, index) => (
                      <div key={index} className="bg-blue-50 p-2 rounded-md">
                        <div className="flex justify-between">
                          <span className="font-medium">{secret.name}</span>
                          <span className="text-xs bg-blue-100 px-2 py-1 rounded-full">
                            {secret.type?.replace('_', ' ')}
                          </span>
                        </div>
                        {secret.description && (
                          <p className="text-sm mt-1">{secret.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column - test details */}
            <div className="space-y-4">
              {/* Preconditions */}
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-2">Preconditions</h3>
                <p className="text-gray-600 whitespace-pre-line">{test.preconditions || 'None specified'}</p>
              </div>

              {/* Bugs */}
              {test.bugs && test.bugs.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold text-gray-700 mb-2">
                    Bugs <span className="text-red-500">({test.bugs.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {test.bugs.map((bug, index) => (
                      <div key={index} className="bg-red-50 p-2 rounded-md">
                        <div className="flex justify-between">
                          <span className="font-medium">{bug.name}</span>
                          <span className="text-xs bg-red-100 px-2 py-1 rounded-full">
                            {bug.severity}
                          </span>
                        </div>
                        {bug.description && (
                          <p className="text-sm mt-1">{bug.description}</p>
                        )}
                        {bug.url && (
                          <a
                            href={bug.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1 block"
                          >
                            {bug.url}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Steps, expected results and assertions */}
          <div className="space-y-6 mb-6">
            {/* Test steps */}
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-2">Test Steps</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="whitespace-pre-line">{test.steps || 'No steps defined'}</p>
              </div>
            </div>

            {/* Expected results */}
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-2">Expected Results</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="whitespace-pre-line">{test.expected_results || 'No expected results defined'}</p>
              </div>
            </div>

            {/* Assertions */}
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-2">Assertions</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="whitespace-pre-line">{test.assertions || 'No assertions defined'}</p>
              </div>
            </div>
          </div>

          {/* Test code if available */}
          {test.code && (
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-2">Test Code</h3>
              <pre className="p-4 bg-gray-50 rounded-lg overflow-x-auto text-sm">
                <code>{test.code}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestDetailsModal;
