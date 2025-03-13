import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
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

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Component that displays test pass rates by epic in a horizontal bar chart
 */
function EpicPassRateChart({ productId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!productId) {
        setLoading(false);
        setData([]);
        return;
      }

      try {
        setLoading(true);

        // First, fetch all epics for the selected product
        const epicsResponse = await axios.get(`${API_URL}/products/${productId}/epics`, {
          withCredentials: true
        });

        // For each epic, fetch its test data
        const epicData = await Promise.all(
          epicsResponse.data.map(async (epic) => {
            try {
              // This would usually be a dedicated endpoint, but for now we'll use test-by-product-path
              // and filter for the specific epic
              const testsResponse = await axios.get(`${API_URL}/tests/by-product-path`, {
                params: { product_path: epic.product_path },
                withCredentials: true
              });

              // Calculate pass rate
              const tests = testsResponse.data || [];
              const totalTests = tests.length;
              const passedTests = tests.filter(test => test.status === 'PASSED').length;
              const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

              return {
                epicId: epic.id,
                epicName: epic.name,
                passRate: parseFloat(passRate.toFixed(1)),
                totalTests,
                passedTests
              };
            } catch (err) {
              console.error(`Error fetching tests for epic ${epic.id}:`, err);
              return {
                epicId: epic.id,
                epicName: epic.name,
                passRate: 0,
                totalTests: 0,
                passedTests: 0
              };
            }
          })
        );

        // Sort by pass rate descending
        const sortedData = epicData.sort((a, b) => b.passRate - a.passRate);
        setData(sortedData);
      } catch (err) {
        console.error('Error fetching epic pass rate data:', err);
        setError('Failed to load epic pass rate data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        {error}
      </div>
    );
  }

  if (!productId) {
    return (
      <div className="p-4 bg-gray-50 text-gray-500 rounded-md text-center">
        Please select a product to view epic pass rates
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-4 bg-gray-50 text-gray-500 rounded-md text-center">
        No epics found for this product
      </div>
    );
  }

  // Custom tooltip to show more detailed information
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const epicData = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-bold text-gray-700">{epicData.epicName}</p>
          <p className="text-green-600">Pass Rate: {epicData.passRate}%</p>
          <p className="text-sm text-gray-600">
            {epicData.passedTests} passed / {epicData.totalTests} total tests
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="epicName"
            width={120}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="passRate"
            name="Pass Rate"
            fill={(data) => {
              // Color based on pass rate
              if (data.passRate >= 80) return '#10B981'; // green
              if (data.passRate >= 60) return '#FBBF24'; // yellow
              return '#EF4444'; // red
            }}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

EpicPassRateChart.propTypes = {
  productId: PropTypes.string
};

export default EpicPassRateChart;
