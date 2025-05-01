import React from 'react';
import { MAX_NAME_LENGTH } from '@/constants/validation';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable test form component
 * @param {Object} props - Component props
 * @returns {JSX.Element} Test form component
 */
const TestForm = ({
  formData,
  error,
  isSubmitting,
  testCategories,
  handleChange,
  handleSecretSelect,
  selectedSecretIds,
  onSubmit,
  onCancel,
  submitButtonText = 'Submit',
  contextInfo = null,
}) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="px-6 py-4 space-y-4">
        {/* Context information display */}
        {contextInfo && contextInfo.userStory && (
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              Adding test for: <span className="font-semibold">{contextInfo.userStory.name}</span>
            </p>
            {contextInfo.feature && (
              <p className="text-xs text-blue-600 mt-1">
                Feature: {contextInfo.feature.name}
              </p>
            )}
            {contextInfo.epic && (
              <p className="text-xs text-blue-600">
                Epic: {contextInfo.epic.name}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter test name"
          />
          <div className="mt-1 text-xs text-gray-500 flex justify-end">
            {formData.name.length}/{MAX_NAME_LENGTH} characters
          </div>
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
            placeholder="One-liner on the purpose of this test"
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
          <label htmlFor="steps" className="block text-sm font-medium text-gray-700 mb-1">
            Test Steps *
          </label>
          <textarea
            id="steps"
            name="steps"
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.steps}
            onChange={handleChange}
            placeholder="List the steps to perform this test, one step per line"
          />
        </div>

        <div>
          <label htmlFor="assertions" className="block text-sm font-medium text-gray-700 mb-1">
            Assertions *
          </label>
          <textarea
            id="assertions"
            name="assertions"
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.assertions}
            onChange={handleChange}
            placeholder="List what should be verified during the test, one assertion per line (e.g. 'Error message appears when submitting invalid form'). Use 'None' if not applicable."
          />
        </div>
      </div>

      <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md mr-2"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-black text-white rounded-md"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Loading...' : submitButtonText}
        </button>
      </div>
    </form>
  );
};

export default TestForm;
