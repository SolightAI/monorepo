import { useState } from "react"
import TestCard from "./TestCard"
import TestFilters from "./TestFilters"
import TestDetails from "./TestDetails"

function TestDashboard({ tests }) {
  const [filters, setFilters] = useState({
    page: "all",
    category: "all",
    status: "all",
    search: "",
  })

  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("desc")
  const [selectedTest, setSelectedTest] = useState(null)

  // Get unique pages and categories for filter dropdowns
  const pages = ["all", ...new Set(tests.map((test) => test.page))]
  const categories = ["all", ...new Set(tests.map((test) => test.category))]

  // Filter tests based on current filters
  const filteredTests = tests.filter((test) => {
    return (
      (filters.page === "all" || test.page === filters.page) &&
      (filters.category === "all" || test.category === filters.category) &&
      (filters.status === "all" || test.status === filters.status) &&
      (filters.search === "" ||
        test.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        test.description.toLowerCase().includes(filters.search.toLowerCase()))
    )
  })

  // Sort filtered tests
  const sortedTests = [...filteredTests].sort((a, b) => {
    if (sortBy === "date") {
      return sortOrder === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt)
    } else if (sortBy === "name") {
      return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    } else if (sortBy === "status") {
      return sortOrder === "asc" ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status)
    }
    return 0
  })

  // Stats
  const stats = {
    total: tests.length,
    passing: tests.filter((test) => test.status === "passed").length,
    failing: tests.filter((test) => test.status === "failed").length,
    pending: tests.filter((test) => test.status === "pending").length,
    bugs: tests.reduce((count, test) => count + test.bugs.length, 0),
  }

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters })
  }

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(newSortBy)
      setSortOrder("desc")
    }
  }

  const openTestDetails = (test) => {
    setSelectedTest(test)
  }

  const closeTestDetails = () => {
    setSelectedTest(null)
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Tests</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Passing</p>
          <p className="text-2xl font-bold text-green-600">{stats.passing}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Failing</p>
          <p className="text-2xl font-bold text-red-600">{stats.failing}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Bugs Found</p>
          <p className="text-2xl font-bold text-purple-600">{stats.bugs}</p>
        </div>
      </div>

      {/* Filters */}
      <TestFilters
        filters={filters}
        pages={pages}
        categories={categories}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />

      {/* Test Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTests.length > 0 ? (
          sortedTests.map((test) => <TestCard key={test.id} test={test} onClick={() => openTestDetails(test)} />)
        ) : (
          <div className="col-span-3 text-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No tests found</h3>
            <p className="mt-1 text-gray-500">Try adjusting your filters or add a new test.</p>
          </div>
        )}
      </div>

      {/* Test Details Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <TestDetails test={selectedTest} onClose={closeTestDetails} />
          </div>
        </div>
      )}
    </div>
  )
}

export default TestDashboard

