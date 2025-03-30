import React, { useState } from 'react';
import axios from 'axios';
import { X, AlertCircle } from 'lucide-react';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const EditAcceptanceCriteriaModal = ({ onClose, criteria, onCriteriaUpdated }) => {
  const [formData, setFormData] = useState({
    name: criteria.name || '',
    description: criteria.description || '',
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
      // Update the acceptance criteria via API
      const response = await axios.put(
        `${API_URL}/acceptance-criteria/${criteria.id}`,
        {
          name: formData.name,
          description: formData.description,
          user_story_id: criteria.user_story_id // Preserve the user story relationship
        },
        { withCredentials: true }
      );

      // Notify parent component
      if (onCriteriaUpdated) {
        onCriteriaUpdated(response.data);
      }

      // Close the modal
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to update acceptance criteria. Please try again.';

      setError(errorMessage);
      console.error('Error updating acceptance criteria:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Edit Acceptance Criteria
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Update the details of this acceptance criteria.
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
                placeholder="Describe a specific condition that must be met for the user story to be considered complete"
                required
              ></textarea>
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
                {isSubmitting ? 'Updating...' : 'Update Acceptance Criteria'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditAcceptanceCriteriaModal;
