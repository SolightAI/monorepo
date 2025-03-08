import { useState } from "react"

function FilterControls({ filters, onApplyFilters, onResetFilters }) {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleChange = (e) => {
    const { name, value } = e.target
    setLocalFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleApply = () => {
    onApplyFilters(localFilters)
  }

  const handleReset = () => {
    const resetFilters = {
      page: "All Pages",
      category: "All Categories",
      status: "All Statuses",
      type: "All Types",
    }
    setLocalFilters(resetFilters)
    onResetFilters()
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="w-40">
        <label htmlFor="page" className="block text-xs text-gray-500 mb-1">
          Page
        </label>
        <select
          id="page"
          name="page"
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          value={localFilters.page}
          onChange={handleChange}
        >
          <option>All Pages</option>
          <option>Login</option>
          <option>Register</option>
          <option>Products</option>
          <option>Checkout</option>
          <option>Profile</option>
          <option>Orders</option>
          <option>Wishlist</option>
          <option>Password Reset</option>
        </select>
      </div>

      <div className="w-40">
        <label htmlFor="category" className="block text-xs text-gray-500 mb-1">
          Category
        </label>
        <select
          id="category"
          name="category"
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          value={localFilters.category}
          onChange={handleChange}
        >
          <option>All Categories</option>
          <option>Authentication</option>
          <option>E-commerce</option>
          <option>User Management</option>
          <option>Search</option>
          <option>Filtering</option>
        </select>
      </div>

      <div className="w-40">
        <label htmlFor="status" className="block text-xs text-gray-500 mb-1">
          Status
        </label>
        <select
          id="status"
          name="status"
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          value={localFilters.status}
          onChange={handleChange}
        >
          <option>All Statuses</option>
          <option>Passed</option>
          <option>Failed</option>
          <option>Pending</option>
        </select>
      </div>

      <div className="w-40">
        <label htmlFor="type" className="block text-xs text-gray-500 mb-1">
          Test Type
        </label>
        <select
          id="type"
          name="type"
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          value={localFilters.type}
          onChange={handleChange}
        >
          <option>All Types</option>
          <option>User Story</option>
          <option>Feature</option>
          <option>Specific Part</option>
          <option>Whole Website</option>
        </select>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={handleApply} className="bg-black text-white px-3 py-1.5 rounded-md text-sm flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
              clipRule="evenodd"
            />
          </svg>
          Apply Filters
        </button>

        <button onClick={handleReset} className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm">
          Reset
        </button>
      </div>
    </div>
  )
}

export default FilterControls

