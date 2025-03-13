import React from 'react';
import PropTypes from 'prop-types';

/**
 * Displays organization health metrics in a card format.
 * Shows overall health score, test coverage, bug resolution time, and other metrics.
 */
function OrganizationHealthCard({ data }) {
  const {
    avg_test_coverage,
    avg_bug_resolution_time,
    overall_health_score,
    total_products,
    total_features,
    total_tests,
    total_bugs
  } = data;

  // Get health score color based on value
  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Format bug resolution time in a human-readable format
  const formatResolutionTime = (hours) => {
    if (hours < 24) {
      return `${Math.round(hours)} hours`;
    }
    const days = Math.round(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Organization Health</h3>

      {/* Health Score */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Overall Health Score</span>
          <span className={`text-2xl font-bold ${getHealthScoreColor(overall_health_score)}`}>
            {overall_health_score.toFixed(1)}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              overall_health_score >= 80 ? 'bg-green-500' :
              overall_health_score >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${overall_health_score}%` }}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <span className="text-sm text-gray-600">Average Test Coverage</span>
          <span className="font-medium">{avg_test_coverage.toFixed(1)}%</span>
        </div>

        <div className="flex justify-between items-center border-b pb-2">
          <span className="text-sm text-gray-600">Avg. Bug Resolution Time</span>
          <span className="font-medium">{formatResolutionTime(avg_bug_resolution_time)}</span>
        </div>

        <div className="flex justify-between items-center border-b pb-2">
          <span className="text-sm text-gray-600">Total Products</span>
          <span className="font-medium">{total_products}</span>
        </div>

        <div className="flex justify-between items-center border-b pb-2">
          <span className="text-sm text-gray-600">Total Features</span>
          <span className="font-medium">{total_features}</span>
        </div>

        <div className="flex justify-between items-center border-b pb-2">
          <span className="text-sm text-gray-600">Total Tests</span>
          <span className="font-medium">{total_tests}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Bugs</span>
          <span className="font-medium">{total_bugs}</span>
        </div>
      </div>

      {/* Health Status */}
      <div className="mt-6 text-center">
        <span
          className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
            overall_health_score >= 80 ? 'bg-green-100 text-green-800' :
            overall_health_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}
        >
          {overall_health_score >= 80 ? 'Healthy' :
           overall_health_score >= 60 ? 'Needs Attention' :
           'At Risk'}
        </span>
      </div>
    </div>
  );
}

OrganizationHealthCard.propTypes = {
  data: PropTypes.shape({
    avg_test_coverage: PropTypes.number.isRequired,
    avg_bug_resolution_time: PropTypes.number.isRequired,
    overall_health_score: PropTypes.number.isRequired,
    total_products: PropTypes.number.isRequired,
    total_features: PropTypes.number.isRequired,
    total_tests: PropTypes.number.isRequired,
    total_bugs: PropTypes.number.isRequired
  }).isRequired
};

export default OrganizationHealthCard;
