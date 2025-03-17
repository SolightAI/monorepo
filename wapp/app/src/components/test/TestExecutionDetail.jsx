import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, SkipForward, Server, User, Calendar, File, Image, Link2, ArrowLeft } from 'lucide-react';
import { getBugsByTestExecution } from '@/services/testExecutionService';

/**
 * Component to display detailed information about a test execution
 */
const TestExecutionDetail = ({ execution, onBack }) => {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (execution?.id) {
      fetchBugs();
    }
  }, [execution?.id]);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      const data = await getBugsByTestExecution(execution.id);
      setBugs(data);
    } catch (err) {
      console.error('Error fetching bugs:', err);
      setError('Failed to load bugs for this execution.');
    } finally {
      setLoading(false);
    }
  };

  // Get status icon based on execution status
  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'FAILED':
        return <XCircle size={20} className="text-red-500" />;
      case 'PENDING':
        return <Clock size={20} className="text-yellow-500" />;
      case 'BLOCKED':
        return <AlertCircle size={20} className="text-orange-500" />;
      case 'SKIPPED':
        return <SkipForward size={20} className="text-blue-500" />;
      default:
        return <Clock size={20} className="text-gray-400" />;
    }
  };

  // Get background color based on execution status
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
        return 'bg-green-50 border-green-200';
      case 'FAILED':
        return 'bg-red-50 border-red-200';
      case 'PENDING':
        return 'bg-yellow-50 border-yellow-200';
      case 'BLOCKED':
        return 'bg-orange-50 border-orange-200';
      case 'SKIPPED':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Get executor icon based on executor type
  const getExecutorIcon = (executorType) => {
    switch (executorType?.toUpperCase()) {
      case 'MANUAL':
        return <User size={16} className="text-gray-600" />;
      case 'AUTOMATED':
        return <Clock size={16} className="text-blue-600" />;
      case 'CI_PIPELINE':
        return <Server size={16} className="text-purple-600" />;
      default:
        return <User size={16} className="text-gray-600" />;
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Format duration
  const formatDuration = (ms) => {
    if (!ms) return 'N/A';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (!execution) {
    return <div>No execution data available</div>;
  }

  return (
    <div className="bg-white rounded-lg">
      {/* Back button */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to history
        </button>
      </div>

      {/* Header with status */}
      <div className={`p-4 rounded-lg mb-4 ${getStatusColor(execution.status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getStatusIcon(execution.status)}
            <h2 className="text-xl font-semibold ml-2">
              Test Execution {execution.status}
            </h2>
          </div>
          <div className="text-sm text-gray-600">
            ID: {execution.id}
          </div>
        </div>
      </div>

      {/* Execution details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Started</span>
          <div className="font-medium">
            <Calendar size={14} className="inline mr-1" />
            {formatDate(execution.started_at)}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Ended</span>
          <div className="font-medium">
            {execution.ended_at ? (
              <>
                <Calendar size={14} className="inline mr-1" />
                {formatDate(execution.ended_at)}
              </>
            ) : (
              <span className="text-yellow-600">In progress</span>
            )}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Duration</span>
          <div className="font-medium">
            <Clock size={14} className="inline mr-1" />
            {execution.duration_ms ? formatDuration(execution.duration_ms) : 'In progress'}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Environment</span>
          <div className="font-medium">
            <Server size={14} className="inline mr-1" />
            {execution.environment}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Executor</span>
          <div className="font-medium flex items-center">
            {getExecutorIcon(execution.executor_type)}
            <span className="ml-1">
              {execution.executor_name || 'Unknown'} ({execution.executor_type})
            </span>
          </div>
        </div>

        {execution.metadata && Object.keys(execution.metadata).length > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-500">Metadata</span>
            <div className="font-medium">
              {Object.entries(execution.metadata).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="font-medium">{key}: </span>
                  <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes section */}
      {execution.notes && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <File size={18} className="mr-2" />
            Notes
          </h3>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="whitespace-pre-line">{execution.notes}</p>
          </div>
        </div>
      )}

      {/* Evidence section */}
      {execution.evidence && execution.evidence.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Image size={18} className="mr-2" />
            Evidence
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {execution.evidence.map((item, index) => (
              <div key={index} className="p-2 border border-gray-200 rounded-lg">
                {item.endsWith('.jpg') || item.endsWith('.png') || item.endsWith('.gif') ? (
                  <img
                    src={item}
                    alt={`Evidence ${index + 1}`}
                    className="w-full h-auto rounded"
                  />
                ) : (
                  <a
                    href={item}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Link2 size={14} className="mr-1" />
                    {item.split('/').pop() || `Evidence ${index + 1}`}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bugs section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          Bugs Found ({bugs.length})
        </h3>

        {loading ? (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading bugs...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p>{error}</p>
          </div>
        ) : bugs.length === 0 ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <p>No bugs were found during this test execution.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bugs.map((bug) => (
              <div key={bug.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between">
                  <h4 className="font-semibold text-red-800">{bug.name}</h4>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">
                    {bug.severity}
                  </span>
                </div>
                <p className="mt-2 text-gray-700">{bug.description}</p>
                {bug.screenshots && bug.screenshots.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {bug.screenshots.map((screenshot, idx) => (
                      <a
                        key={idx}
                        href={screenshot}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={screenshot}
                          alt={`Bug ${bug.id} screenshot ${idx}`}
                          className="border border-red-200 rounded w-full h-auto"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestExecutionDetail;
