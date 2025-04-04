import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { updateTest } from '@/services/testService';
import { MAX_NAME_LENGTH } from '@/constants/validation';


const EditTestModal = ({ onClose, test, onTestUpdated }) => {
  const [formData, setFormData] = useState({
    name: test.name || '',
    description: test.description || '',
    url: test.url || '',
    category: test.category || 'FUNCTIONAL',
    steps: test.steps || '',
    preconditions: test.preconditions || 'None',
    expected_results: test.expected_results || 'None',
    assertions: test.assertions || 'None',
    secret_ids: test.secret_ids || []
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSecretIds, setSelectedSecretIds] = useState(test.secret_ids || []);

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
  ];

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "preconditions" || name === "assertions" || name === "expected_results") {
      // Special handling for preconditions, assertions, and expected_results fields
      // If the field is empty, set it to the default "None" value
      setFormData(prev => ({
        ...prev,
        [name]: value.trim() === "" ? "None" : value
      }));
    } else {
      // Default handling for other fields
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!formData.name.trim()) {
      setError('Test name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the test object with string fields (not arrays)
      let testData = {
        name: formData.name,
        description: formData.description,
        url: formData.url,
        category: formData.category,
        steps: formData.steps || "None",
        preconditions: formData.preconditions || "None",
        expected_results: formData.expected_results || "None",
        assertions: formData.assertions || "None",
        secret_ids: formData.secret_ids
      };

      // Update the test using the service function
      const updatedTest = await updateTest(test.id, testData);

      // Notify parent component
      if (onTestUpdated) {
        onTestUpdated(updatedTest);
      }

      // Close the modal automatically on success
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to update test. Please try again.';

      setError(errorMessage);
      console.error('Error updating test:', err);
      setIsSubmitting(false); // Only reset submitting state on error
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Edit Test</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Basic Information */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Test Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                maxLength={MAX_NAME_LENGTH}
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="mt-1 text-xs text-gray-500 flex justify-end">
                {formData.name.length}/{MAX_NAME_LENGTH} characters
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {testCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>

            <div>
              <label htmlFor="preconditions" className="block text-sm font-medium text-gray-700 mb-1">
                Preconditions
              </label>
              <textarea
                id="preconditions"
                name="preconditions"
                rows="2"
                value={formData.preconditions}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>

            <div>
              <label htmlFor="steps" className="block text-sm font-medium text-gray-700 mb-1">
                Steps
              </label>
              <textarea
                id="steps"
                name="steps"
                rows="4"
                value={formData.steps}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="1. Navigate to the page&#10;2. Click on button&#10;3. Verify result"
              ></textarea>
            </div>

            <div>
              <label htmlFor="expected_results" className="block text-sm font-medium text-gray-700 mb-1">
                Expected Results
              </label>
              <textarea
                id="expected_results"
                name="expected_results"
                rows="2"
                value={formData.expected_results}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>

            <div>
              <label htmlFor="assertions" className="block text-sm font-medium text-gray-700 mb-1">
                Assertions
              </label>
              <textarea
                id="assertions"
                name="assertions"
                rows="2"
                value={formData.assertions}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secrets
              </label>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTestModal;
