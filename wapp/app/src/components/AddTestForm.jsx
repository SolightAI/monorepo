import { useState } from "react"

function AddTestForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    page: "",
    category: "",
    type: "user-story", // Default type
    steps: "",
  })

  const testTypes = [
    { id: "user-story", label: "User Story" },
    { id: "feature", label: "Feature" },
    { id: "page-specific", label: "Page Specific" },
    { id: "whole-website", label: "Whole Website" },
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Convert steps string to array
    const stepsArray = formData.steps
      .split("\n")
      .filter((step) => step.trim() !== "")
      .map((step) => step.trim())

    onSubmit({
      ...formData,
      steps: stepsArray,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Test Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter test name"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the purpose of this test"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="page" className="block text-sm font-medium text-gray-700 mb-1">
              Page *
            </label>
            <input
              type="text"
              id="page"
              name="page"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.page}
              onChange={handleChange}
              placeholder="e.g. Homepage, Login, Dashboard"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <input
              type="text"
              id="category"
              name="category"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g. Authentication, Navigation"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Test Type *</label>
          <div className="grid grid-cols-2 gap-3">
            {testTypes.map((type) => (
              <div key={type.id} className="flex items-center">
                <input
                  type="radio"
                  id={`type-${type.id}`}
                  name="type"
                  value={type.id}
                  checked={formData.type === type.id}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor={`type-${type.id}`} className="ml-2 text-sm text-gray-700">
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="steps" className="block text-sm font-medium text-gray-700 mb-1">
            Test Steps (one per line)
          </label>
          <textarea
            id="steps"
            name="steps"
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.steps}
            onChange={handleChange}
            placeholder="1. Navigate to homepage
2. Click on login button
3. Enter credentials
..."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg"
        >
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
          Add Test
        </button>
      </div>
    </form>
  )
}

export default AddTestForm
