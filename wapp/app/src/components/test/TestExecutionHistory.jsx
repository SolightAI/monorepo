import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, SkipForward, Server, User, Calendar, RefreshCw } from 'lucide-react';
import { getTestExecutions } from '@/services/testExecutionService';

/**
 * Component to display a history of test executions
 */
const TestExecutionHistory = ({ testId, onExecutionSelect }) => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchTestExecutions();
  }, [testId]);

  const fetchTestExecutions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTestExecutions(testId);
      // Sort executions by date, newest first
      const sortedExecutions = data.sort((a, b) =>
        new Date(b.started_at) - new Date(a.started_at)
      );
      setExecutions(sortedExecutions);
    } catch (err) {
      console.error('Error fetching test executions:', err);
      setError('Failed to load test execution history.');
    } finally {
      setLoading(false);
    }
  };

  // Get icon and color based on execution status
  const getStatusInfo = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
        return { icon: <CheckCircle size={16} />, color: 'text-green-500 bg-green-50' };
      case 'FAILED':
        return { icon: <XCircle size={16} />, color: 'text-red-500 bg-red-50' };
      case 'PENDING':
        return { icon: <Clock size={16} />, color: 'text-yellow-500 bg-yellow-50' };
      case 'ERROR':
        return { icon: <XCircle size={16} />, color: 'text-red-500 bg-red-50' };
      case 'BLOCKED':
        return { icon: <AlertCircle size={16} />, color: 'text-orange-500 bg-orange-50' };
      case 'SKIPPED':
        return { icon: <SkipForward size={16} />, color: 'text-blue-500 bg-blue-50' };
      default:
        return { icon: <Clock size={16} />, color: 'text-gray-500 bg-gray-50' };
    }
  };

  // Get executor icon based on executor type
  const getExecutorIcon = (executorType) => {
    switch (executorType?.toUpperCase()) {
      case 'MANUAL':
        return <User size={16} className="text-gray-600" />;
      case 'AUTOMATED':
        return <RefreshCw size={16} className="text-blue-600" />;
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

  // Get all available environments for filtering
  const environments = ['all', ...new Set(executions.map(exec => exec.environment))];

  // Get all available statuses for filtering
  const statuses = ['all', ...new Set(executions.map(exec => exec.status))];

  // Filter executions
  const filteredExecutions = executions.filter(exec =>
    (selectedEnvironment === 'all' || exec.environment === selectedEnvironment) &&
    (selectedStatus === 'all' || exec.status === selectedStatus)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading execution history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        <p>{error}</p>
        <button
          onClick={fetchTestExecutions}
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded-md text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-gray-600">No execution history available for this test.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Calendar size={20} className="mr-2 text-gray-600" />
          Execution History
        </h3>

        <div className="flex flex-wrap gap-2">
          {/* Environment filter */}
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            {environments.map(env => (
              <option key={env} value={env}>
                {env === 'all' ? 'All Environments' : env}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Environment</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Executor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bugs</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExecutions.map((execution) => {
              const { icon, color } = getStatusInfo(execution.status);
              return (
                <tr
                  key={execution.id}
                  onClick={() => onExecutionSelect(execution)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${color}`}>
                      {icon}
                      <span className="ml-1.5 text-xs">{execution.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(execution.started_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    <div className="inline-flex items-center">
                      <Server size={14} className="mr-1 text-gray-500" />
                      {execution.environment}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    <div className="inline-flex items-center">
                      {getExecutorIcon(execution.executor_type)}
                      <span className="ml-1.5">
                        {execution.executor_name || execution.executor_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {execution.duration_ms
                      ? `${(execution.duration_ms / 1000).toFixed(1)}s`
                      : execution.ended_at
                        ? 'Completed'
                        : 'In progress'
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                    {execution.bugs_count > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        {execution.bugs_count} {execution.bugs_count === 1 ? 'bug' : 'bugs'}
                      </span>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TestExecutionHistory;
