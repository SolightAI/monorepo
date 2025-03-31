import React, { useState } from 'react';
import axios from 'axios';
import { X, AlertCircle } from 'lucide-react';
import { getModalContainerProps, getModalContentProps } from '@/utils/modalUtils';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const AddAcceptanceCriteriaModal = ({ onClose, featureId, onAcceptanceCriteriaAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!formData.name.trim()) {
      setError('Acceptance criteria name is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Acceptance criteria description is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the acceptance criteria via API
      const response = await axios.post(
        `${API_URL}/acceptance-criteria/`,
        {
          name: formData.name,
          description: formData.description,
          feature_id: featureId
        },
        { withCredentials: true }
      );

      // Notify parent component
      if (onAcceptanceCriteriaAdded) {
        onAcceptanceCriteriaAdded(response.data);
      }

      // Close the modal
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to create acceptance criteria. Please try again.';

      setError(errorMessage);
      console.error('Error creating acceptance criteria:', err);
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
              Add Acceptance Criteria
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
              <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-1" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter a concise name for this criteria"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Example: "Email Confirmation"
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe a specific condition that must be met for the feature to be considered complete"
                required
              ></textarea>
              <p className="mt-2 text-sm text-gray-500">
                Good example: "User receives an email confirmation after successful registration"
              </p>
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Acceptance Criteria'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAcceptanceCriteriaModal;
