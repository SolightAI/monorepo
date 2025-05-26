import React, { useState } from 'react';
import { Button, Card, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const AnalyticsDashboard = () => {
  // State management
  const [dateRange, setDateRange] = useState('last7Days');
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterValues, setFilterValues] = useState({
    channel: 'all',
    country: 'all',
    device: 'all'
  });
  const [showDataTable, setShowDataTable] = useState(false);

  // Sample data
  const metrics = {
    totalVisits: 248923,
    averageTimeOnSite: '3m 24s',
    bounceRate: '32.8%',
    conversionRate: '4.2%'
  };

  const weeklyData = [
    { date: 'Apr 1', visitors: 35421, conversions: 1524 },
    { date: 'Apr 2', visitors: 32567, conversions: 1398 },
    { date: 'Apr 3', visitors: 38452, conversions: 1612 },
    { date: 'Apr 4', visitors: 37812, conversions: 1589 },
    { date: 'Apr 5', visitors: 36745, conversions: 1523 },
    { date: 'Apr 6', visitors: 34512, conversions: 1422 },
    { date: 'Apr 7', visitors: 33414, conversions: 1345 }
  ];

  const trafficSources = [
    { source: 'Organic Search', percentage: 42.5, change: 2.3 },
    { source: 'Direct', percentage: 28.7, change: -1.2 },
    { source: 'Referral', percentage: 12.2, change: 4.5 },
    { source: 'Social Media', percentage: 10.8, change: 7.2 },
    { source: 'Email', percentage: 5.8, change: 1.1 }
  ];

  const topPages = [
    { path: '/products/category/electronics', visits: 24512, conversions: 1245 },
    { path: '/homepage', visits: 18975, conversions: 834 },
    { path: '/blog/top-10-gadgets', visits: 12543, conversions: 423 },
    { path: '/products/category/home', visits: 10254, conversions: 392 },
    { path: '/special-offers', visits: 8754, conversions: 548 }
  ];

  // Event handlers
  const handleDateRangeChange = (event) => {
    setDateRange(event.target.value);
  };

  const handleFilterChange = (filterName, value) => {
    setFilterValues({
      ...filterValues,
      [filterName]: value
    });
  };

  const toggleComparison = () => {
    setComparisonEnabled(!comparisonEnabled);
  };

  const toggleDataTable = () => {
    setShowDataTable(!showDataTable);
  };

  // Helper function to render chart bar in CSS
  const renderBarChart = (value, max, color) => {
    const percentage = (value / max) * 100;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
    );
  };

  // Render change indicator with appropriate color
  const renderChangeIndicator = (value) => {
    if (value > 0) {
      return <span className="text-green-600 ml-1">↑ {value}%</span>;
    } else if (value < 0) {
      return <span className="text-red-600 ml-1">↓ {Math.abs(value)}%</span>;
    } else {
      return <span className="text-gray-600 ml-1">–</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your website performance and user behavior</p>
          </div>

          <div className="flex space-x-4">
            <Button
              variant="outlined"
              color="primary"
              onClick={toggleDataTable}
            >
              {showDataTable ? 'Hide Data' : 'Show Data'}
            </Button>
            <Button
              variant="contained"
              color="primary"
            >
              Export Report
            </Button>
          </div>
        </header>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <FormControl fullWidth size="small">
                <InputLabel>Time Period</InputLabel>
                <Select
                  value={dateRange}
                  label="Time Period"
                  onChange={handleDateRangeChange}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="yesterday">Yesterday</MenuItem>
                  <MenuItem value="last7Days">Last 7 Days</MenuItem>
                  <MenuItem value="last30Days">Last 30 Days</MenuItem>
                  <MenuItem value="thisMonth">This Month</MenuItem>
                  <MenuItem value="lastMonth">Last Month</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div>
              <FormControl fullWidth size="small">
                <InputLabel>Channel</InputLabel>
                <Select
                  value={filterValues.channel}
                  label="Channel"
                  onChange={(e) => handleFilterChange('channel', e.target.value)}
                >
                  <MenuItem value="all">All Channels</MenuItem>
                  <MenuItem value="organic">Organic Search</MenuItem>
                  <MenuItem value="direct">Direct</MenuItem>
                  <MenuItem value="referral">Referral</MenuItem>
                  <MenuItem value="social">Social Media</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div>
              <FormControl fullWidth size="small">
                <InputLabel>Device</InputLabel>
                <Select
                  value={filterValues.device}
                  label="Device"
                  onChange={(e) => handleFilterChange('device', e.target.value)}
                >
                  <MenuItem value="all">All Devices</MenuItem>
                  <MenuItem value="desktop">Desktop</MenuItem>
                  <MenuItem value="mobile">Mobile</MenuItem>
                  <MenuItem value="tablet">Tablet</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div>
              <div className="flex items-center">
                <Button
                  variant={comparisonEnabled ? "contained" : "outlined"}
                  color="primary"
                  onClick={toggleComparison}
                  fullWidth
                >
                  {comparisonEnabled ? 'Remove Comparison' : 'Compare With Previous'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Total Visits</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold">{metrics.totalVisits.toLocaleString()}</span>
                {comparisonEnabled && (
                  <span className="text-green-600 text-sm ml-2">+12.4%</span>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Avg. Time on Site</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold">{metrics.averageTimeOnSite}</span>
                {comparisonEnabled && (
                  <span className="text-green-600 text-sm ml-2">+0.8%</span>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Bounce Rate</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold">{metrics.bounceRate}</span>
                {comparisonEnabled && (
                  <span className="text-red-600 text-sm ml-2">+1.2%</span>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Conversion Rate</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold">{metrics.conversionRate}</span>
                {comparisonEnabled && (
                  <span className="text-green-600 text-sm ml-2">+0.3%</span>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['overview', 'acquisition', 'behavior', 'conversions'].map((tab) => (
                <button
                  key={tab}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Traffic Trend Chart */}
          <div className="bg-white rounded-lg shadow-sm p-4 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Traffic Trend</h2>
              <div>
                <select className="text-sm border border-gray-300 rounded p-1">
                  <option value="visitors">Visitors</option>
                  <option value="pageviews">Pageviews</option>
                  <option value="conversions">Conversions</option>
                </select>
              </div>
            </div>

            <div className="h-64 flex items-end space-x-4 pb-8 pt-4 px-4 border-b border-gray-200">
              {weeklyData.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${(day.visitors / 40000) * 100}%` }}
                  ></div>
                  <div className="text-xs text-gray-500 mt-2">{day.date}</div>
                </div>
              ))}
            </div>

            {showDataTable && (
              <div className="mt-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left">Date</th>
                      <th className="py-2 text-right">Visitors</th>
                      <th className="py-2 text-right">Conversions</th>
                      <th className="py-2 text-right">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData.map((day, index) => {
                      const convRate = ((day.conversions / day.visitors) * 100).toFixed(1);
                      return (
                        <tr key={index} className="border-b">
                          <td className="py-2">{day.date}</td>
                          <td className="py-2 text-right">{day.visitors.toLocaleString()}</td>
                          <td className="py-2 text-right">{day.conversions.toLocaleString()}</td>
                          <td className="py-2 text-right">{convRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Traffic Sources */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Traffic Sources</h2>

            <div>
              {trafficSources.map((source, index) => (
                <div key={index} className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex-1 text-sm">{source.source}</div>
                    <div className="text-sm font-medium">{source.percentage}%</div>
                    <div className="w-20 text-right text-sm">
                      {renderChangeIndicator(source.change)}
                    </div>
                  </div>
                  {renderBarChart(
                    source.percentage,
                    Math.max(...trafficSources.map(s => s.percentage)),
                    'bg-blue-600'
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-white rounded-lg shadow-sm p-4 lg:col-span-2">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Top Pages</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">Page</th>
                    <th className="py-2 text-right">Visits</th>
                    <th className="py-2 text-right">Conversions</th>
                    <th className="py-2 text-right">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((page, index) => {
                    const convRate = ((page.conversions / page.visits) * 100).toFixed(1);
                    return (
                      <tr key={index} className="border-b">
                        <td className="py-2">
                          <div className="truncate max-w-sm">{page.path}</div>
                        </td>
                        <td className="py-2 text-right">{page.visits.toLocaleString()}</td>
                        <td className="py-2 text-right">{page.conversions.toLocaleString()}</td>
                        <td className="py-2 text-right">{convRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Device Breakdown</h2>

            <div className="space-y-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-32 h-32 rounded-full border-8 border-blue-500 flex items-center justify-center">
                    <div className="text-2xl font-bold">58%</div>
                  </div>
                </div>
                <div className="text-sm font-medium">Mobile</div>
                {comparisonEnabled && (
                  <div className="text-xs text-green-600 mt-1">+4.2% vs previous</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center">
                      <div className="text-lg font-bold">36%</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">Desktop</div>
                  {comparisonEnabled && (
                    <div className="text-xs text-red-600 mt-1">-3.8% vs previous</div>
                  )}
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-20 h-20 rounded-full border-4 border-purple-500 flex items-center justify-center">
                      <div className="text-lg font-bold">6%</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">Tablet</div>
                  {comparisonEnabled && (
                    <div className="text-xs text-red-600 mt-1">-0.4% vs previous</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
