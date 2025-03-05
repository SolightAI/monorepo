import { useState } from "react"

function AddTestModal({ onClose, onAddTest }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    page: "",
    category: "",
    type: "User Story",
    steps: "",
  })

  const testTypes = [
    { id: "User Story", label: "User Story" },
    { id: "Feature", label: "Feature" },
    { id: "Specific Part", label: "Specific Part" },
    { id: "Whole Website", label: "Whole Website" },
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

    onAddTest({
      ...formData,
      steps: stepsArray,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Add New Test</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
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

          <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md mr-2">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-black text-white rounded-md">
              Add Test
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddTestModal

