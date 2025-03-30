import React from 'react';
import PropTypes from 'prop-types';

/**
 * Displays summary metrics in a row of cards.
 * Shows total tests, test status breakdown, bugs by severity, and pass rate.
 */
function SummaryMetrics({ metrics }) {
  const { tests_total, tests_by_status, bugs_total, bugs_by_severity, test_pass_rate } = metrics;

  // Status colors mapping
  const statusColors = {
    'PASSED': 'text-green-600 bg-green-50 border-green-100',
    'FAILED': 'text-red-600 bg-red-50 border-red-100',
    'ERROR': 'text-red-600 bg-red-50 border-red-100',
    'PENDING': 'text-orange-600 bg-orange-50 border-orange-100',
    'NOT_STARTED': 'text-gray-600 bg-gray-50 border-gray-100',
    'BLOCKED': 'text-purple-600 bg-purple-50 border-purple-100',
    'SKIPPED': 'text-blue-600 bg-blue-50 border-blue-100',
    'AGENT_LIMITATION': 'text-purple-600 bg-purple-50 border-purple-100',
    'UNEXISTING_FEATURE': 'text-amber-600 bg-amber-50 border-amber-100'
  };

  // Severity colors mapping
  const severityColors = {
    'Critical': 'text-red-700 bg-red-50 border-red-100',
    'High': 'text-orange-700 bg-orange-50 border-orange-100',
    'Medium': 'text-yellow-700 bg-yellow-50 border-yellow-100',
    'Low': 'text-green-700 bg-green-50 border-green-100'
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-medium mb-4">Summary Metrics</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Total Tests Card */}
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tests</p>
              <p className="text-3xl font-bold text-blue-600">{tests_total}</p>
            </div>
            <div className="text-blue-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Bugs Card */}
        <div className="bg-amber-50 p-4 rounded-md border border-amber-100">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bugs</p>
              <p className="text-3xl font-bold text-amber-600">{bugs_total}</p>
            </div>
            <div className="text-amber-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Passed Tests Card */}
        <div className="bg-green-50 p-4 rounded-md border border-green-100">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Passed Tests</p>
              <p className="text-3xl font-bold text-green-600">
                {tests_by_status?.PASSED || 0}
              </p>
            </div>
            <div className="text-green-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Failed Tests Card */}
        <div className="bg-red-50 p-4 rounded-md border border-red-100">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Failed Tests</p>
              <p className="text-3xl font-bold text-red-600">
                {tests_by_status?.FAILED || 0}
              </p>
            </div>
            <div className="text-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Pass Rate Card */}
      <div className="bg-green-50 p-4 rounded-md border border-green-100 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Pass Rate</p>
            <p className="text-3xl font-bold">{test_pass_rate.toFixed(1)}%</p>
          </div>
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16" viewBox="0 0 36 36">
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="3"
                strokeDasharray="100, 100"
              />
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeDasharray={`${test_pass_rate}, 100`}
              />
            </svg>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-medium text-green-600">
              {test_pass_rate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Test Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-md font-medium mb-2">Tests by Status</h4>
          <div className="space-y-2">
            {Object.entries(tests_by_status || {}).map(([status, count]) => (
              <div key={status} className={`flex justify-between p-2 rounded ${statusColors[status] || 'bg-gray-50'}`}>
                <span>{status.replace('_', ' ')}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bug Severity Breakdown */}
        <div>
          <h4 className="text-md font-medium mb-2">Bugs by Severity</h4>
          <div className="space-y-2">
            {Object.entries(bugs_by_severity || {}).map(([severity, count]) => (
              <div key={severity} className={`flex justify-between p-2 rounded ${severityColors[severity] || 'bg-gray-50'}`}>
                <span>{severity}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

SummaryMetrics.propTypes = {
  metrics: PropTypes.shape({
    tests_total: PropTypes.number.isRequired,
    tests_by_status: PropTypes.object.isRequired,
    bugs_total: PropTypes.number.isRequired,
    bugs_by_severity: PropTypes.object.isRequired,
    test_pass_rate: PropTypes.number.isRequired
  }).isRequired
};

export default SummaryMetrics;
