import React, { useState } from 'react';
import { Server, Calendar } from 'lucide-react';
import { getStatusInfo, getExecutorIcon, formatExecutionDate, formatStatus, TEST_STATUS } from '@/utils/testExecutionUtils';

/**
 * Component to display a history of test executions
 */
const TestExecutionHistory = ({ executions = [], isLoading = false, error = null, onSelect, onRefresh }) => {
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Get all available environments for filtering
  const environments = ['all', ...new Set(executions.map(exec => exec.environment))];

  // Get all available statuses for filtering
  const statuses = ['all', ...new Set(executions.map(exec => exec.status))];

  // Filter executions
  const filteredExecutions = executions.filter(exec =>
    (selectedEnvironment === 'all' || exec.environment === selectedEnvironment) &&
    (selectedStatus === 'all' || exec.status === selectedStatus)
  );

  if (isLoading) {
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
          onClick={onRefresh}
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExecutions.map((execution) => {
              // Determine if the execution is running
              const isRunning = execution.status === TEST_STATUS.PENDING;
              // Get status info only if not running
              const { icon: statusIcon, color: statusColor } = !isRunning ? getStatusInfo(execution.status) : { icon: null, color: null };

              return (
                <tr
                  key={execution.id}
                  onClick={() => onSelect(execution)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {/* Conditional rendering for status/running state */}
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${isRunning ? 'bg-blue-100 text-blue-600' : statusColor}`}>
                      {isRunning ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-1.5"></div>
                      ) : (
                        statusIcon
                      )}
                      <span className="ml-1.5 text-xs">
                        {isRunning ? 'Running' : formatStatus(execution.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {formatExecutionDate(execution.started_at)}
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
