import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useOrganization } from './OrganizationContext';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Default dashboard configuration
const defaultWidgets = {
  summaryMetrics: { visible: true, minimized: false, position: 0 },
  testTrend: { visible: true, minimized: false, position: 1 },
  bugTrend: { visible: true, minimized: false, position: 2 },
  organizationHealth: { visible: true, minimized: false, position: 3 },
  featureHealth: { visible: true, minimized: false, position: 4 }
};

// Create the context
const DashboardContext = createContext({});

/**
 * DashboardProvider component that manages dashboard state
 */
export function DashboardProvider({ children }) {
  const { selectedOrganization } = useOrganization();
  const navigate = useNavigate();

  // Dashboard state
  const [timeRange, setTimeRange] = useState('30d');
  const [productId, setProductId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Widget data state
  const [summaryMetrics, setSummaryMetrics] = useState(null);
  const [testTrendData, setTestTrendData] = useState([]);
  const [bugTrendData, setBugTrendData] = useState([]);
  const [featureHealthData, setFeatureHealthData] = useState([]);
  const [orgHealthData, setOrgHealthData] = useState(null);
  const [epicPassRateData, setEpicPassRateData] = useState([]);

  // Widget configuration state
  const [widgetConfig, setWidgetConfig] = useState(() => {
    const savedConfig = localStorage.getItem('dashboardWidgetConfig');
    return savedConfig ? JSON.parse(savedConfig) : defaultWidgets;
  });

  // Save widget configuration to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboardWidgetConfig', JSON.stringify(widgetConfig));
  }, [widgetConfig]);

  // Effect to verify user has an organization selected
  useEffect(() => {
    if (!selectedOrganization && !isLoading) {
      navigate('/organization/create');
    }
  }, [selectedOrganization, navigate, isLoading]);

  // Fetch all dashboard data when dependencies change
  useEffect(() => {
    if (selectedOrganization) {
      fetchAllDashboardData();
    }
  }, [selectedOrganization, timeRange, productId]);

  // Function to fetch all dashboard data
  const fetchAllDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchSummaryMetrics(),
        fetchTrendData(),
        fetchOrganizationHealth(),
        ...(productId ? [fetchFeatureHealth()] : [])
      ]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load some dashboard components');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch summary metrics data
  const fetchSummaryMetrics = async () => {
    try {
      const url = `${API_URL}/dashboard/metrics/summary`;
      const params = productId ? { product_id: productId } : {};

      const response = await axios.get(url, {
        params,
        withCredentials: true
      });

      setSummaryMetrics(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching summary metrics:', err);
      setError('Failed to load summary metrics');
      throw err;
    }
  };

  // Fetch trend data for tests and bugs
  const fetchTrendData = async () => {
    try {
      // Fetch test trend data
      const testUrl = `${API_URL}/dashboard/metrics/tests/trend`;
      const testParams = {
        time_range: timeRange,
        ...(productId && { product_id: productId })
      };

      const testResponse = await axios.get(testUrl, {
        params: testParams,
        withCredentials: true
      });

      // Fetch bug trend data
      const bugUrl = `${API_URL}/dashboard/metrics/bugs/trend`;
      const bugParams = {
        time_range: timeRange,
        ...(productId && { product_id: productId })
      };

      const bugResponse = await axios.get(bugUrl, {
        params: bugParams,
        withCredentials: true
      });

      setTestTrendData(testResponse.data);
      setBugTrendData(bugResponse.data);

      return {
        testTrend: testResponse.data,
        bugTrend: bugResponse.data
      };
    } catch (err) {
      console.error('Error fetching trend data:', err);
      setError('Failed to load trend data');
      throw err;
    }
  };

  // Fetch feature health data if product is selected
  const fetchFeatureHealth = async () => {
    if (!productId) return null;

    try {
      const url = `${API_URL}/dashboard/metrics/features/health`;
      const response = await axios.get(url, {
        params: { product_id: productId },
        withCredentials: true
      });

      setFeatureHealthData(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching feature health data:', err);
      setError('Failed to load feature health data');
      throw err;
    }
  };

  // Fetch organization health data
  const fetchOrganizationHealth = async () => {
    try {
      const url = `${API_URL}/dashboard/metrics/organization/health`;
      const response = await axios.get(url, { withCredentials: true });

      setOrgHealthData(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching organization health data:', err);
      setError('Failed to load organization health data');
      throw err;
    }
  };

  // Function to update widget configuration
  const updateWidgetConfig = useCallback((widgetId, config) => {
    setWidgetConfig(prevConfig => ({
      ...prevConfig,
      [widgetId]: {
        ...prevConfig[widgetId],
        ...config
      }
    }));
  }, []);

  // Function to toggle widget visibility
  const toggleWidgetVisibility = useCallback((widgetId) => {
    updateWidgetConfig(widgetId, {
      visible: !widgetConfig[widgetId].visible
    });
  }, [widgetConfig, updateWidgetConfig]);

  // Function to toggle widget minimized state
  const toggleWidgetMinimized = useCallback((widgetId) => {
    updateWidgetConfig(widgetId, {
      minimized: !widgetConfig[widgetId].minimized
    });
  }, [widgetConfig, updateWidgetConfig]);

  // Function to reset widget configuration to defaults
  const resetWidgetConfig = useCallback(() => {
    setWidgetConfig(defaultWidgets);
  }, []);

  // Function to handle time range change
  const handleTimeRangeChange = useCallback((newTimeRange) => {
    setTimeRange(newTimeRange);
  }, []);

  // Function to handle product selection
  const handleProductChange = useCallback((newProductId) => {
    setProductId(newProductId);

    // If product changed, navigate to the appropriate URL
    if (newProductId) {
      navigate(`/dashboard/product/${newProductId}`);
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Create the context value
  const contextValue = {
    // State
    timeRange,
    productId,
    isLoading,
    error,
    summaryMetrics,
    testTrendData,
    bugTrendData,
    featureHealthData,
    orgHealthData,
    epicPassRateData,
    widgetConfig,

    // Actions
    setTimeRange: handleTimeRangeChange,
    setProductId: handleProductChange,
    updateWidgetConfig,
    toggleWidgetVisibility,
    toggleWidgetMinimized,
    resetWidgetConfig,
    refreshData: fetchAllDashboardData
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

// Custom hook to use the dashboard context
export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }

  return context;
}

export default DashboardContext;
