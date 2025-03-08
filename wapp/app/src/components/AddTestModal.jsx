import { useState } from "react"

function AddTestModal({ onClose, onAddTest }) {
  // Mock data for epics, features, and user stories
  const mockEpics = [
    { id: "epic-1", name: "User Management" },
    { id: "epic-2", name: "Payment Processing" },
    { id: "epic-3", name: "Product Catalog" },
    { id: "epic-4", name: "Reporting Dashboard" },
  ]

  const mockFeatures = [
    { id: "feature-1", name: "User Registration", epic_id: "epic-1" },
    { id: "feature-2", name: "User Authentication", epic_id: "epic-1" },
    { id: "feature-3", name: "Credit Card Processing", epic_id: "epic-2" },
    { id: "feature-4", name: "Invoice Generation", epic_id: "epic-2" },
    { id: "feature-5", name: "Product Listing", epic_id: "epic-3" },
    { id: "feature-6", name: "Product Search", epic_id: "epic-3" },
    { id: "feature-7", name: "Sales Reports", epic_id: "epic-4" },
    { id: "feature-8", name: "User Activity Dashboard", epic_id: "epic-4" },
  ]

  const mockUserStories = [
    { id: "story-1", title: "Register with email and password", feature_id: "feature-1" },
    { id: "story-2", title: "Login with credentials", feature_id: "feature-2" },
    { id: "story-3", title: "Reset forgotten password", feature_id: "feature-2" },
    { id: "story-4", title: "Process Visa payment", feature_id: "feature-3" },
    { id: "story-5", title: "Process Mastercard payment", feature_id: "feature-3" },
    { id: "story-6", title: "Generate PDF invoice", feature_id: "feature-4" },
    { id: "story-7", title: "View product details", feature_id: "feature-5" },
    { id: "story-8", title: "Search products by name", feature_id: "feature-6" },
    { id: "story-9", title: "Filter product search results", feature_id: "feature-6" },
    { id: "story-10", title: "View monthly sales report", feature_id: "feature-7" },
    { id: "story-11", title: "View user activity heat map", feature_id: "feature-8" },
  ]

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    category: "FUNCTIONAL",
    type: "UserStory",
    steps: "",
    epic_id: mockEpics[0]?.id || "",
    feature_id: mockFeatures[0]?.id || "",
    user_story_id: mockUserStories[0]?.id || "",
  })

  // Test categories from the backend schema
  const testCategories = [
    { id: "SMOKE", label: "Smoke" },
    { id: "FUNCTIONAL", label: "Functional" },
    { id: "END_TO_END", label: "End to End" },
    { id: "UNIT", label: "Unit" },
    { id: "REGRESSION", label: "Regression" },
    { id: "INTEGRATION", label: "Integration" },
    { id: "PERFORMANCE", label: "Performance" },
    { id: "USABILITY", label: "Usability" },
    { id: "COMPATIBILITY", label: "Compatibility" },
    { id: "LOCALIZATION", label: "Localization" },
  ]

  // Test types
  const testTypes = [
    { id: "UserStory", label: "User Story" },
    { id: "Feature", label: "Feature" },
    { id: "Epic", label: "Epic" },
  ]

  // Get filtered features based on selected epic
  const getFilteredFeatures = () => {
    if (formData.type === "Epic") return []
    return mockFeatures.filter(
      feature => formData.type !== "Feature" || feature.epic_id === formData.epic_id
    )
  }

  // Get filtered user stories based on selected feature
  const getFilteredUserStories = () => {
    if (formData.type !== "UserStory") return []
    return mockUserStories.filter(story => story.feature_id === formData.feature_id)
  }

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Create update object starting with the changed field
    const updates = { [name]: value }
    
    // Add logic for cascading dropdown changes
    if (name === "type") {
      // Reset dependent fields when type changes
      updates.epic_id = mockEpics[0]?.id || ""
      updates.feature_id = mockFeatures[0]?.id || ""
      updates.user_story_id = mockUserStories[0]?.id || ""
    } else if (name === "epic_id") {
      // When epic changes, update feature to the first one in that epic
      const filteredFeatures = mockFeatures.filter(feature => feature.epic_id === value)
      updates.feature_id = filteredFeatures[0]?.id || ""
      
      // Also update user story if needed
      if (formData.type === "UserStory") {
        const filteredStories = mockUserStories.filter(
          story => story.feature_id === (filteredFeatures[0]?.id || "")
        )
        updates.user_story_id = filteredStories[0]?.id || ""
      }
    } else if (name === "feature_id") {
      // When feature changes, update user story if needed
      if (formData.type === "UserStory") {
        const filteredStories = mockUserStories.filter(story => story.feature_id === value)
        updates.user_story_id = filteredStories[0]?.id || ""
      }
    }
    
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Convert steps string to array
    const stepsArray = formData.steps
      .split("\n")
      .filter((step) => step.trim() !== "")
      .map((step) => step.trim())

    // Create the test object based on the selected type
    let testData = {
      name: formData.name,
      description: formData.description,
      url: formData.url,
      category: formData.category,
      steps: stepsArray,
    }

    // Add the appropriate ID field based on test type
    if (formData.type === "UserStory") {
      testData.user_story_id = formData.user_story_id
    } else if (formData.type === "Feature") {
      testData.feature_id = formData.feature_id
    } else if (formData.type === "Epic") {
      testData.epic_id = formData.epic_id
    }

    onAddTest(testData)
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

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                URL *
              </label>
              <input
                type="url"
                id="url"
                name="url"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://example.com/page-to-test"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                name="category"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.category}
                onChange={handleChange}
              >
                {testCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Type *</label>
              <div className="grid grid-cols-3 gap-3">
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

            {/* Epic Selection (for Feature and UserStory test types) */}
            {formData.type !== "Epic" && (
              <div>
                <label htmlFor="epic_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Epic *
                </label>
                <select
                  id="epic_id"
                  name="epic_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.epic_id}
                  onChange={handleChange}
                >
                  {mockEpics.map((epic) => (
                    <option key={epic.id} value={epic.id}>
                      {epic.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Feature Selection (for UserStory test type or if testing a Feature directly) */}
            {formData.type === "Feature" && (
              <div>
                <label htmlFor="feature_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Feature *
                </label>
                <select
                  id="feature_id"
                  name="feature_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.feature_id}
                  onChange={handleChange}
                >
                  {getFilteredFeatures().map((feature) => (
                    <option key={feature.id} value={feature.id}>
                      {feature.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Story Selection (when testing a User Story) */}
            {formData.type === "UserStory" && (
              <div>
                <label htmlFor="feature_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Feature *
                </label>
                <select
                  id="feature_id"
                  name="feature_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.feature_id}
                  onChange={handleChange}
                >
                  {getFilteredFeatures().map((feature) => (
                    <option key={feature.id} value={feature.id}>
                      {feature.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.type === "UserStory" && (
              <div>
                <label htmlFor="user_story_id" className="block text-sm font-medium text-gray-700 mb-1">
                  User Story *
                </label>
                <select
                  id="user_story_id"
                  name="user_story_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.user_story_id}
                  onChange={handleChange}
                >
                  {getFilteredUserStories().map((story) => (
                    <option key={story.id} value={story.id}>
                      {story.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Epic Selection (when testing an Epic directly) */}
            {formData.type === "Epic" && (
              <div>
                <label htmlFor="epic_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Epic *
                </label>
                <select
                  id="epic_id"
                  name="epic_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.epic_id}
                  onChange={handleChange}
                >
                  {mockEpics.map((epic) => (
                    <option key={epic.id} value={epic.id}>
                      {epic.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="steps" className="block text-sm font-medium text-gray-700 mb-1">
                Test Steps
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

