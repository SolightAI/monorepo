import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  Search,
  ChevronUp,
  ChevronDown,
  Calendar,
  Bug,
  Layers,
  FileText,
  Link as LinkIcon,
  Beaker
} from 'lucide-react';
import { getAllBugs, getBugsByProductId } from '@/services/bugService';
import { getAllTests } from '@/services/testService';
import { useProduct } from '@/context/ProductContext';
import BugDetailsModal from '@/components/modals/BugDetailsModal';

/**
 * Displays all bugs in a tabular format with sorting and filtering capabilities
 */
const BugsTable = () => {
  const [bugs, setBugs] = useState([]);
  const [filteredBugs, setFilteredBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [selectedBug, setSelectedBug] = useState(null);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('all');

  const navigate = useNavigate();
  const { selectedProduct } = useProduct();

  useEffect(() => {
    fetchBugs();
    if (selectedProduct) {
      fetchTests();
    }
  }, [selectedProduct]);

  const fetchTests = async () => {
    try {
      if (!selectedProduct) {
        console.error('No product selected');
        setTests([]);
        return;
      }

      // Fetch tests for the current product
      const testsData = await getAllTests();
      setTests(testsData);
    } catch (err) {
      console.error('Error fetching tests:', err);
    }
  };

  const fetchBugs = async () => {
    try {
      setLoading(true);
      setError(null);

      let bugsData;

      if (selectedProduct) {
        // If a product is selected, get bugs for that product by ID
        bugsData = await getBugsByProductId(selectedProduct.id);
      } else {
        // Otherwise, get all bugs
        bugsData = await getAllBugs();
      }

      setBugs(bugsData);
      // Apply filters to the new data immediately
      applyFilters(bugsData, selectedStatus, selectedSeverity, searchQuery, selectedTest);
    } catch (err) {
      console.error('Error fetching bugs:', err);
      setError('Failed to load bugs data. Please try again later.');
      setFilteredBugs([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (bugsToFilter = bugs, statusOverride = null, severityOverride = null, queryOverride = null, testOverride = null) => {
    const currentStatus = statusOverride !== null ? statusOverride : selectedStatus;
    const currentSeverity = severityOverride !== null ? severityOverride : selectedSeverity;
    const currentQuery = queryOverride !== null ? queryOverride : searchQuery;
    const currentTest = testOverride !== null ? testOverride : selectedTest;

    let result = [...bugsToFilter];

    // Filter by status
    if (currentStatus !== 'all') {
      result = result.filter(bug => bug.status === currentStatus);
    }

    // Filter by severity
    if (currentSeverity !== 'all') {
      result = result.filter(bug => bug.severity === currentSeverity);
    }

    // Filter by test
    if (currentTest !== 'all') {
      result = result.filter(bug => bug.test_id === currentTest);
    }

    // Filter by search query (across multiple fields)
    if (currentQuery) {
      const lowerQuery = currentQuery.toLowerCase();
      result = result.filter(bug =>
        bug.name.toLowerCase().includes(lowerQuery) ||
        (bug.description && bug.description.toLowerCase().includes(lowerQuery)) ||
        (bug.url && bug.url.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply current sort
    result = sortBugs(result);

    setFilteredBugs(result);
  };

  const sortBugs = (bugsToSort) => {
    const { key, direction } = sortConfig;
    return [...bugsToSort].sort((a, b) => {
      // Handle different field types differently
      if (key === 'detected_at') {
        return direction === 'asc'
          ? new Date(a[key]) - new Date(b[key])
          : new Date(b[key]) - new Date(a[key]);
      } else if (key === 'severity') {
        // Custom severity ordering
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return direction === 'asc'
          ? severityOrder[a[key]] - severityOrder[b[key]]
          : severityOrder[b[key]] - severityOrder[a[key]];
      } else {
        // Default string comparison
        if (!a[key]) return direction === 'asc' ? 1 : -1;
        if (!b[key]) return direction === 'asc' ? -1 : 1;

        return direction === 'asc'
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      }
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      // If already sorting by this key in desc order, reset to default
      key = 'name';
      direction = 'asc';
    }

    setSortConfig({ key, direction });

    // Re-apply filters with new sort
    const newConfig = { key, direction };
    const sorted = [...filteredBugs].sort((a, b) => {
      // Same sorting logic as in sortBugs
      if (key === 'detected_at') {
        return direction === 'asc'
          ? new Date(a[key]) - new Date(b[key])
          : new Date(b[key]) - new Date(a[key]);
      } else if (key === 'severity') {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return direction === 'asc'
          ? severityOrder[a[key]] - severityOrder[b[key]]
          : severityOrder[b[key]] - severityOrder[a[key]];
      } else {
        if (!a[key]) return direction === 'asc' ? 1 : -1;
        if (!b[key]) return direction === 'asc' ? -1 : 1;

        return direction === 'asc'
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      }
    });

    setFilteredBugs(sorted);
  };

  const handleTestChange = (testId) => {
    setSelectedTest(testId);
    applyFilters(bugs, selectedStatus, selectedSeverity, searchQuery, testId);
  };

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    applyFilters(bugs, status, selectedSeverity, searchQuery, selectedTest);
  };

  const handleSeverityChange = (severity) => {
    setSelectedSeverity(severity);
    applyFilters(bugs, selectedStatus, severity, searchQuery, selectedTest);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="text-red-600" size={18} />;
      case 'HIGH':
        return <AlertTriangle className="text-orange-500" size={18} />;
      case 'MEDIUM':
        return <AlertTriangle className="text-yellow-500" size={18} />;
      case 'LOW':
        return <AlertTriangle className="text-blue-500" size={18} />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPEN':
        return <Clock className="text-yellow-500" size={18} />;
      case 'IN_PROGRESS':
        return <Clock className="text-blue-500" size={18} />;
      case 'FIXED':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'CLOSED':
        return <XCircle className="text-gray-500" size={18} />;
      default:
        return <Clock className="text-gray-400" size={18} />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleBugSelect = (bug) => {
    setSelectedBug(bug);
  };

  const handleBugClose = () => {
    setSelectedBug(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{selectedProduct ? `Bugs - ${selectedProduct.name}` : 'All Bugs'}</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <div className="w-full md:w-48">
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="statusFilter"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FIXED">Fixed</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-gray-400" />
            <div className="w-full md:w-48">
              <label htmlFor="severityFilter" className="block text-sm font-medium text-gray-700">
                Severity
              </label>
              <select
                id="severityFilter"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                value={selectedSeverity}
                onChange={(e) => handleSeverityChange(e.target.value)}
              >
                <option value="all">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Beaker size={18} className="text-gray-400" />
            <div className="w-full md:w-48">
              <label htmlFor="testFilter" className="block text-sm font-medium text-gray-700">
                Test
              </label>
              <select
                id="testFilter"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                value={selectedTest}
                onChange={(e) => handleTestChange(e.target.value)}
              >
                <option value="all">All Tests</option>
                {tests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-grow">
            <div className="relative">
              <label htmlFor="searchFilter" className="block text-sm font-medium text-gray-700">
                Search
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="searchFilter"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Search bugs..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    applyFilters(bugs, selectedStatus, selectedSeverity, e.target.value, selectedTest);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bugs Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    <span>Bug Name</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    <span>Status</span>
                    {getSortIcon('status')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('severity')}
                >
                  <div className="flex items-center">
                    <span>Severity</span>
                    {getSortIcon('severity')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('detected_at')}
                >
                  <div className="flex items-center">
                    <span>Detected Date</span>
                    {getSortIcon('detected_at')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Link
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredBugs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    No bugs found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                filteredBugs.map((bug) => (
                  <tr
                    key={bug.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleBugSelect(bug)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Bug className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                        <div className="text-sm font-medium text-gray-900">{bug.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(bug.status)}
                        <span className="ml-2 text-sm text-gray-900">
                          {bug.status ? bug.status.replace('_', ' ') : 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getSeverityIcon(bug.severity)}
                        <span className="ml-2 text-sm text-gray-900">
                          {bug.severity || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                        {formatDate(bug.detected_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bug.url ? (
                        <a
                          href={bug.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          View Issue
                        </a>
                      ) : (
                        <span className="text-gray-400">No link</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bug Details Modal */}
      {selectedBug && (
        <BugDetailsModal bug={selectedBug} onClose={handleBugClose} />
      )}
    </div>
  );
};

export default BugsTable;
