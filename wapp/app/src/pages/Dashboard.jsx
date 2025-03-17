import React, { useState } from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import SummaryMetrics from '../components/dashboard/SummaryMetrics';
import TestTrendChart from '../components/dashboard/TestTrendChart';
import BugTrendChart from '../components/dashboard/BugTrendChart';
import FeatureHealthTable from '../components/dashboard/FeatureHealthTable';
import OrganizationHealthCard from '../components/dashboard/OrganizationHealthCard';
import EpicPassRateChart from '../components/dashboard/EpicPassRateChart';
import TestExecutionTrendChart from '../components/dashboard/TestExecutionTrendChart';
import EnvironmentComparisonChart from '../components/dashboard/EnvironmentComparisonChart';
import { useDashboard } from '../context/DashboardContext';

const timeRangeOptions = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'All time', value: 'all' },
];

function Dashboard() {
  const {
    timeRange,
    setTimeRange,
    productId,
    isLoading,
    error,
    summaryMetrics,
    testTrendData,
    bugTrendData,
    featureHealthData,
    orgHealthData,
    widgetConfig,
    toggleWidgetVisibility,
    resetWidgetConfig,
    refreshData
  } = useDashboard();

  const [showSettings, setShowSettings] = useState(false);

  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
  };

  if (isLoading && !summaryMetrics) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {productId ? 'Product Dashboard' : 'Organization Dashboard'}
        </h1>

        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex items-center">
            <label htmlFor="timeRange" className="mr-2 text-sm font-medium text-gray-700">
              Time Range
            </label>
            <select
              id="timeRange"
              value={timeRange}
              onChange={handleTimeRangeChange}
              className="block w-36 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {timeRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dashboard Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshData}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Refresh dashboard data"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`inline-flex items-center px-3 py-2 border text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                showSettings
                  ? 'border-blue-500 text-blue-700 bg-blue-50'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
              title="Configure dashboard"
            >
              <Settings className="h-4 w-4 mr-1" />
              {showSettings ? 'Hide Settings' : 'Settings'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Dashboard Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 p-4 rounded-lg shadow mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Dashboard Settings</h2>
            <button
              onClick={resetWidgetConfig}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Reset to Default Layout
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(widgetConfig).map(([widgetId, config]) => (
              <div key={widgetId} className="flex items-center">
                <input
                  type="checkbox"
                  id={`widget-${widgetId}`}
                  checked={config.visible}
                  onChange={() => toggleWidgetVisibility(widgetId)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor={`widget-${widgetId}`}
                  className="ml-2 block text-sm text-gray-900"
                >
                  {widgetId === 'summaryMetrics' && 'Summary Metrics'}
                  {widgetId === 'testTrend' && 'Test Execution Trend'}
                  {widgetId === 'bugTrend' && 'Bug Trend'}
                  {widgetId === 'organizationHealth' && 'Organization Health'}
                  {widgetId === 'featureHealth' && 'Feature Health'}
                  {widgetId === 'epicPassRate' && 'Epic Pass Rate'}
                  {widgetId === 'testExecutionTrend' && 'Test Execution Trend'}
                  {widgetId === 'environmentComparison' && 'Environment Comparison'}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p>
              Note: You can also hide or minimize individual widgets using the controls in the widget headers.
              Settings are saved automatically and will persist on page refresh.
            </p>
          </div>
        </div>
      )}

      <DashboardLayout>
        {/* Summary Metrics */}
        {summaryMetrics && (
          <DashboardWidget
            id="summaryMetrics"
            title="Summary Metrics"
            colSpan="col-span-12"
            allowExport
            exportData={summaryMetrics}
            exportFilename="summary-metrics"
          >
            <SummaryMetrics metrics={summaryMetrics} />
          </DashboardWidget>
        )}

        {/* Test Execution Trend Chart */}
        <DashboardWidget
          id="testExecutionTrend"
          title="Test Execution Trend"
          colSpan="col-span-12"
          allowExport
          exportFilename="test-execution-trend-data"
        >
          <TestExecutionTrendChart productId={productId} timeRange={timeRange} />
        </DashboardWidget>

        <DashboardWidget
          id="environmentComparison"
          title="Test Results by Environment"
          colSpan="col-span-12 md:col-span-6"
          allowExport
          exportFilename="environment-comparison-data"
        >
          <EnvironmentComparisonChart productId={productId} timeRange={timeRange} />
        </DashboardWidget>

        {/* Test Trend Chart */}
        <DashboardWidget
          id="testTrend"
          title="Test Execution Trend"
          allowExport
          exportData={testTrendData}
          exportFilename="test-trend-data"
        >
          <TestTrendChart data={testTrendData} />
        </DashboardWidget>

        {/* Bug Trend Chart */}
        <DashboardWidget
          id="bugTrend"
          title="Bug Trend"
          allowExport
          exportData={bugTrendData}
          exportFilename="bug-trend-data"
        >
          <BugTrendChart data={bugTrendData} />
        </DashboardWidget>

        {/* Epic Pass Rate Chart - Only show if productId is present */}
        {productId && (
          <DashboardWidget
            id="epicPassRate"
            title="Test Pass Rate by Epic"
            colSpan="col-span-12 md:col-span-8"
          >
            <EpicPassRateChart productId={productId} />
          </DashboardWidget>
        )}

        {/* Organization Health */}
        {orgHealthData && (
          <DashboardWidget
            id="organizationHealth"
            title="Organization Health"
            colSpan="col-span-12 md:col-span-4"
            allowExport
            exportData={orgHealthData}
            exportFilename="organization-health"
          >
            <OrganizationHealthCard data={orgHealthData} />
          </DashboardWidget>
        )}

        {/* Feature Health Table - Only show if productId is present */}
        {productId && featureHealthData.length > 0 && (
          <DashboardWidget
            id="featureHealth"
            title="Feature Health"
            colSpan="col-span-12"
            allowExport
            exportData={featureHealthData}
            exportFilename="feature-health-data"
          >
            <FeatureHealthTable features={featureHealthData} />
          </DashboardWidget>
        )}
      </DashboardLayout>
    </div>
  );
}

export default Dashboard;
