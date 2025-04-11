import React from 'react';
import { X } from 'lucide-react';
import { MAX_NAME_LENGTH } from '@/constants/validation';
import { isValidUrl } from '@/utils/urlUtils';

/**
 * Reusable feature form component
 * @param {Object} props - Component props
 * @returns {JSX.Element} Feature form component
 */
const FeatureForm = ({
  formData,
  error,
  isSubmitting,
  touched,
  urlErrors,
  isNameValid,
  isUrlsValid,
  isFormValid,
  handleInputChange,
  handleUrlChange,
  handleAddUrl,
  handleRemoveUrl,
  handleLoginRequirementChange,
  onSubmit,
  onCancel,
  submitButtonText = 'Submit',
}) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="mb-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Feature Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={`w-full p-2 border ${touched.name && !isNameValid ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
          required
          maxLength={MAX_NAME_LENGTH}
        />
        <div className="mt-1 text-xs text-gray-500 flex justify-end">
          {formData.name.length}/{MAX_NAME_LENGTH} characters
        </div>
      </div>

        <div className="mb-4">
          <label htmlFor="access_conditions" className="block text-sm font-medium text-gray-700 mb-1">
            Access Conditions
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.access_conditions.must_be_logged_in}
              onChange={handleLoginRequirementChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
            />
            <span className="text-sm font-medium text-gray-700">
              User must be logged in to access this feature
            </span>
          </label>
        </div>

      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows="3"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Related URLs *
        </label>

        {formData.urls.map((url, index) => (
          <div key={index} className="flex flex-col w-full mb-4">
            <div className="flex items-center space-x-2">
              <input
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => handleUrlChange(index, e.target.value)}
                className={`flex-1 p-2 border ${touched.urls && url.trim() !== '' && !isValidUrl(url) ? 'border-red-300 bg-red-50' : touched.urls && !isUrlsValid ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm`}
                required={index === 0}
              />
              <button
                type="button"
                onClick={() => handleRemoveUrl(index)}
                className="p-2 text-red-500 hover:text-red-700 transition-colors"
                disabled={formData.urls.length === 1}
              >
                <X size={16} />
              </button>
            </div>
            {touched.urls && url.trim() !== '' && !isValidUrl(url) && (
              <div className="text-xs text-red-500 mt-1">Please enter a valid URL (e.g., https://example.com)</div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddUrl}
          className="w-full mt-2 flex justify-center items-center py-2 px-4 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
        >
          + Add URL
        </button>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
          disabled={isSubmitting || !isFormValid()}
        >
          {isSubmitting ? 'Processing...' : submitButtonText}
        </button>
      </div>
    </form>
  );
};

export default FeatureForm;
