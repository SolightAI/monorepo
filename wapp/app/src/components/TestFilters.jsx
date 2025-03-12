function TestFilters({ filters, pages, categories, onFilterChange, sortBy, sortOrder, onSortChange }) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search tests..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
            />
          </div>

          {/* Page Filter */}
          <div>
            <label htmlFor="page-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Page
            </label>
            <select
              id="page-filter"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filters.page}
              onChange={(e) => onFilterChange({ page: e.target.value })}
            >
              {pages.map((page) => (
                <option key={page} value={page}>
                  {page === "all" ? "All Pages" : page}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category-filter"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filters.category}
              onChange={(e) => onFilterChange({ category: e.target.value })}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filters.status}
              onChange={(e) => onFilterChange({ status: e.target.value })}
            >
              <option value="all">All Statuses</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="mt-4 flex items-center">
          <span className="text-sm font-medium text-gray-700 mr-2">Sort by:</span>
          <div className="flex space-x-2">
            <button
              className={`px-3 py-1 text-sm rounded-md ${sortBy === "date" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
              onClick={() => onSortChange("date")}
            >
              Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${sortBy === "name" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
              onClick={() => onSortChange("name")}
            >
              Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${sortBy === "status" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
              onClick={() => onSortChange("status")}
            >
              Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
          </div>
        </div>
      </div>
    )
  }

  export default TestFilters
