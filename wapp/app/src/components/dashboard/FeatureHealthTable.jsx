import React from 'react';
import PropTypes from 'prop-types';

/**
 * Displays feature health metrics in a table format.
 * Shows feature name, test coverage, bug count, and pass rate.
 */
function FeatureHealthTable({ features }) {
  // Function to determine health indicator color based on values
  const getHealthColor = (coverage, passRate, bugCount) => {
    if (coverage < 30 || passRate < 50 || bugCount > 10) {
      return 'bg-red-100 text-red-800';
    } else if (coverage < 70 || passRate < 80 || bugCount > 5) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  // Sort features by test coverage (highest first)
  const sortedFeatures = [...features].sort((a, b) => b.test_coverage - a.test_coverage);

  if (features.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
        No feature health data available for this product
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Feature
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Test Coverage
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Bug Count
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Pass Rate
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Health
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedFeatures.map((feature) => {
            const healthClass = getHealthColor(
              feature.test_coverage,
              feature.test_pass_rate,
              feature.bug_count
            );

            return (
              <tr key={feature.feature_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {feature.feature_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <span className="mr-2">{feature.test_coverage.toFixed(1)}%</span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${feature.test_coverage}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                      feature.bug_count > 5 ? 'bg-red-100 text-red-800' :
                      feature.bug_count > 2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}
                  >
                    {feature.bug_count}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <span className="mr-2">{feature.test_pass_rate.toFixed(1)}%</span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          feature.test_pass_rate >= 80 ? 'bg-green-500' :
                          feature.test_pass_rate >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${feature.test_pass_rate}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${healthClass}`}
                  >
                    {feature.test_coverage >= 70 && feature.test_pass_rate >= 80 && feature.bug_count <= 5
                      ? 'Healthy'
                      : feature.test_coverage >= 30 && feature.test_pass_rate >= 50 && feature.bug_count <= 10
                      ? 'Moderate'
                      : 'At Risk'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

FeatureHealthTable.propTypes = {
  features: PropTypes.arrayOf(
    PropTypes.shape({
      feature_id: PropTypes.string.isRequired,
      feature_name: PropTypes.string.isRequired,
      test_coverage: PropTypes.number.isRequired,
      bug_count: PropTypes.number.isRequired,
      test_pass_rate: PropTypes.number.isRequired
    })
  ).isRequired
};

export default FeatureHealthTable;
