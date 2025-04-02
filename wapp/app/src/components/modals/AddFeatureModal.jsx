import React, { useState } from 'react';
import axios from 'axios';
import { X, AlertCircle } from 'lucide-react';
import { getModalContainerProps, getModalContentProps } from '@/utils/modalUtils';
import { isValidUrl } from '@/utils/urlUtils';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const AddFeatureModal = ({ onClose, epicId, epicName, onFeatureAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    urls: ['']
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    urls: false
  });
  const [urlErrors, setUrlErrors] = useState([]);

  // Calculate if form is valid for submit button
  const isFormValid = () => {
    const nameValid = formData.name.trim() !== '';
    const urlsValid = formData.urls.some(url => url.trim() !== '' && isValidUrl(url));
    return nameValid && urlsValid && urlErrors.every(error => !error);
  };

  // Check individual field validity for UI feedback
  const isNameValid = formData.name.trim() !== '';
  const isUrlsValid = formData.urls.some(url => url.trim() !== '');

  // Handle input change for name and description
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Mark field as touched
    if (!touched[name]) {
      setTouched({
        ...touched,
        [name]: true
      });
    }
  };

  // Handle URL input changes
  const handleUrlChange = (index, value) => {
    const updatedUrls = [...formData.urls];
    updatedUrls[index] = value;

    setFormData({
      ...formData,
      urls: updatedUrls
    });

    // Validate URL
    const newUrlErrors = [...urlErrors];
    if (value.trim() !== '' && !isValidUrl(value)) {
      newUrlErrors[index] = 'Please enter a valid URL (e.g., https://example.com)';
    } else {
      newUrlErrors[index] = '';
    }
    setUrlErrors(newUrlErrors);

    // Mark URLs as touched
    if (!touched.urls) {
      setTouched({
        ...touched,
        urls: true
      });
    }
  };

  // Add a new URL field
  const handleAddUrl = () => {
    setFormData({
      ...formData,
      urls: [...formData.urls, '']
    });
  };

  // Remove a URL field
  const handleRemoveUrl = (index) => {
    const updatedUrls = formData.urls.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      urls: updatedUrls
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!formData.name.trim()) {
      setError('Feature name is required');
      return;
    }

    // Filter out empty URLs
    const filteredUrls = formData.urls.filter(url => url.trim() !== '');

    // Simple validation: require at least one URL
    if (filteredUrls.length === 0) {
      setError('At least one URL is required');
      return;
    }

    // Validate all URLs
    const invalidUrls = filteredUrls.filter(url => !isValidUrl(url));
    if (invalidUrls.length > 0) {
      // Instead of showing global error, we'll rely on the field-level errors
      // Update touched state to show all URL field errors
      setTouched(prev => ({...prev, urls: true}));
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the feature via API
      const response = await axios.post(
        `${API_URL}/features/`,
        {
          name: formData.name,
          description: formData.description,
          epic_id: epicId,
          urls: filteredUrls
        },
        { withCredentials: true }
      );

      // Notify parent component
      if (onFeatureAdded) {
        onFeatureAdded(response.data);
      }

      // Close the modal
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to create feature. Please try again.';

      setError(errorMessage);
      console.error('Error creating feature:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div {...getModalContainerProps(onClose)}>
      <div {...getModalContentProps('w-full max-w-md')}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Add Feature to "{epicName}"
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Features are specific functionalities of your product that fulfill a part of an epic.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
              <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-1" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
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
              />
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
                onClick={onClose}
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
                {isSubmitting ? 'Creating...' : 'Create Feature'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddFeatureModal;
