import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Server, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Component for visualizing test execution comparisons across different environments
 */
const EnvironmentComparisonChart = ({ productId, timeRange = '30d' }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [productId, timeRange]);

  const fetchData = async () => {
    if (!productId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_URL}/dashboard/metrics/test-executions/environment-comparison?product_id=${productId}&time_range=${timeRange}`,
        { withCredentials: true }
      );

      // Transform the data for the chart
      const chartData = processDataForChart(response.data);
      setData(chartData);
    } catch (err) {
      console.error('Error fetching environment comparison data:', err);
      setError('Failed to load environment comparison data.');
    } finally {
      setLoading(false);
    }
  };

  // Transform the data from the API format to a format suitable for Recharts
  const processDataForChart = (apiData) => {
    // Convert the API data structure to an array format for Recharts
    return Object.entries(apiData).map(([environment, statusCounts]) => ({
      environment,
      PASSED: statusCounts.PASSED || 0,
      FAILED: statusCounts.FAILED || 0,
      BLOCKED: statusCounts.BLOCKED || 0,
      SKIPPED: statusCounts.SKIPPED || 0,
      PENDING: statusCounts.PENDING || 0,
      // Calculate the total for sorting
      total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
    })).sort((a, b) => b.total - a.total); // Sort by total executions, most first
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-60">
        <RefreshCw className="animate-spin h-6 w-6 text-blue-500 mr-2" />
        <span>Loading environment comparison data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start p-4 bg-red-50 text-red-700 rounded-lg">
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Error loading environment data</p>
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
        <Server className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 font-medium">No environment comparison data available</p>
        <p className="text-gray-400 text-sm mt-1">
          Run tests in different environments to see comparisons
        </p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 flex items-center">
          <Server className="h-4 w-4 mr-2 text-gray-500" />
          Test Execution Results by Environment
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Compare how tests perform across different environments
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="environment"
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="PASSED"
            name="Passed"
            fill="#10b981"
            stackId="a"
          />
          <Bar
            dataKey="FAILED"
            name="Failed"
            fill="#ef4444"
            stackId="a"
          />
          <Bar
            dataKey="BLOCKED"
            name="Blocked"
            fill="#f97316"
            stackId="a"
          />
          <Bar
            dataKey="SKIPPED"
            name="Skipped"
            fill="#3b82f6"
            stackId="a"
          />
          <Bar
            dataKey="PENDING"
            name="Pending"
            fill="#f59e0b"
            stackId="a"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EnvironmentComparisonChart;
