import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Calendar, AlertCircle, Filter, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Chart component for visualizing test execution trends over time
 */
const TestExecutionTrendChart = ({ productId, timeRange = '30d' }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [environment, setEnvironment] = useState('all');
  const [availableEnvironments, setAvailableEnvironments] = useState(['all']);

  useEffect(() => {
    fetchData();
  }, [productId, timeRange, environment]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build the query parameters
      let url = `${API_URL}/dashboard/metrics/test-executions/trend?time_range=${timeRange}`;

      if (productId) {
        url += `&product_id=${productId}`;
      }

      if (environment && environment !== 'all') {
        url += `&environment=${environment}`;
      }

      const response = await axios.get(url, { withCredentials: true });
      const trendData = response.data;

      // Process the data for the chart
      // We need to transform the data from the API format to a format suitable for Recharts
      const processedData = processDataForChart(trendData);
      setData(processedData);

      // Fetch available environments for the filter
      if (productId) {
        const envResponse = await axios.get(
          `${API_URL}/dashboard/metrics/test-executions/environment-comparison?product_id=${productId}&time_range=${timeRange}`,
          { withCredentials: true }
        );

        // Extract environment names from the response
        const environments = ['all', ...Object.keys(envResponse.data)];
        setAvailableEnvironments(environments);
      }
    } catch (err) {
      console.error('Error fetching test execution trend data:', err);
      setError('Failed to load test execution trend data.');
    } finally {
      setLoading(false);
    }
  };

  // Transform the data from the API format to a format suitable for Recharts
  const processDataForChart = (trendData) => {
    // Group data by date
    const groupedByDate = {};

    trendData.forEach(dataPoint => {
      const date = new Date(dataPoint.date).toISOString().split('T')[0];

      if (!groupedByDate[date]) {
        groupedByDate[date] = {
          date,
          PASSED: 0,
          FAILED: 0,
          BLOCKED: 0,
          SKIPPED: 0,
          PENDING: 0,
        };
      }

      groupedByDate[date][dataPoint.category] = dataPoint.count;
    });

    // Convert the grouped data to an array and sort by date
    return Object.values(groupedByDate).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );
  };

  // Format date for display in the chart
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-60">
        <RefreshCw className="animate-spin h-6 w-6 text-blue-500 mr-2" />
        <span>Loading chart data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start p-4 bg-red-50 text-red-700 rounded-lg">
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Error loading chart data</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 border border-gray-200 rounded-md">
        <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 font-medium">No test execution data available</p>
        <p className="text-gray-400 text-sm mt-1">
          Run some tests to see execution trends over time
        </p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">Test Execution Results Over Time</h3>

        <div className="flex items-center">
          <Filter className="h-4 w-4 text-gray-500 mr-2" />
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {availableEnvironments.map(env => (
              <option key={env} value={env}>
                {env === 'all' ? 'All Environments' : env}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) => [value, name]}
            labelFormatter={(label) => formatDate(label)}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="PASSED"
            name="Passed"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ stroke: '#10b981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="FAILED"
            name="Failed"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ stroke: '#ef4444', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="BLOCKED"
            name="Blocked"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ stroke: '#f97316', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="SKIPPED"
            name="Skipped"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="PENDING"
            name="Pending"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ stroke: '#f59e0b', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TestExecutionTrendChart;
