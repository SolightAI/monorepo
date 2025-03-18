import React from 'react';
import PropTypes from 'prop-types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

/**
 * Visualizes test execution trend data using a stacked area chart.
 * Shows the count of tests by status over time.
 */
function TestTrendChart({ data }) {
  // Colors for different test statuses
  const statusColors = {
    'PASSED': '#10B981', // green
    'FAILED': '#EF4444', // red
    'ERROR': '#EF4444', // red
    'PENDING': '#F59E0B', // amber
    'NOT_STARTED': '#6B7280', // gray
    'BLOCKED': '#8B5CF6', // purple
    'SKIPPED': '#3B82F6'  // blue
  };

  // Group data by date
  const groupedData = data.reduce((result, item) => {
    const { date, count, category } = item;
    const dateStr = new Date(date).toISOString().split('T')[0];

    if (!result[dateStr]) {
      result[dateStr] = { date: dateStr };
    }

    result[dateStr][category] = count;
    return result;
  }, {});

  // Convert grouped data to array for Recharts
  const chartData = Object.values(groupedData).sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  );

  // Extract unique categories from data
  const categories = [...new Set(data.map(item => item.category))];

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No test data available for the selected time range</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value || ''}
          />
          <Tooltip
            formatter={(value, name) => [value, name.replace('_', ' ')]}
            labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
          />
          <Legend formatter={(value) => value.replace('_', ' ')} />

          {/* Create Area components for each test status */}
          {categories.map(category => (
            <Area
              key={category}
              type="monotone"
              dataKey={category}
              name={category}
              stackId="1"
              stroke={statusColors[category] || '#8884d8'}
              fill={statusColors[category] || '#8884d8'}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

TestTrendChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
      count: PropTypes.number.isRequired,
      category: PropTypes.string.isRequired
    })
  ).isRequired
};

export default TestTrendChart;
