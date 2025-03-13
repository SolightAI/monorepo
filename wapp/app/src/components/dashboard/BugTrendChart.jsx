import React from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

/**
 * Visualizes bug trend data using a line chart.
 * Shows the count of bugs by severity over time.
 */
function BugTrendChart({ data }) {
  // Colors for different bug severities
  const severityColors = {
    'Critical': '#DC2626', // red-600
    'High': '#EA580C',     // orange-600
    'Medium': '#D97706',   // amber-600
    'Low': '#65A30D'       // lime-600
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
        <p className="text-gray-500">No bug data available for the selected time range</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
            allowDecimals={false}
            tickFormatter={(value) => value || ''}
          />
          <Tooltip
            formatter={(value, name) => [value, name]}
            labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
          />
          <Legend />

          {/* Create Line components for each bug severity */}
          {categories.map(category => (
            <Line
              key={category}
              type="monotone"
              dataKey={category}
              name={category}
              stroke={severityColors[category] || '#8884d8'}
              strokeWidth={2}
              dot={{ strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

BugTrendChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
      count: PropTypes.number.isRequired,
      category: PropTypes.string.isRequired
    })
  ).isRequired
};

export default BugTrendChart;
