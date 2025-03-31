import React, { useState } from 'react';
import axios from 'axios';
import { X, AlertCircle, Loader } from 'lucide-react';
import { getModalContainerProps, getModalContentProps } from '@/utils/modalUtils';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const EpicCreationModal = ({
  productId,
  productName,
  onClose,
  onComplete
}) => {
  const [epic, setEpic] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!epic.name.trim()) {
      setError('Please provide an epic name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const epicData = {
        name: epic.name.trim(),
        description: epic.description.trim(),
        product_id: productId
      };

      const response = await axios.post(
        `${API_URL}/epics/`,
        epicData,
        { withCredentials: true }
      );

      onComplete([response.data]);
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to create epic. Please try again.';

      setError(errorMessage);
      console.error('Error creating epic:', err);
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
              Add Epic to "{productName}"
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Epics are large bodies of work that can be broken down into smaller features and tasks.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
              <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-1" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="epic-name" className="block text-sm font-medium text-gray-700 mb-1">
                Epic Name
              </label>
              <input
                type="text"
                id="epic-name"
                value={epic.name}
                onChange={(e) => setEpic({ ...epic, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="E.g., User Authentication, Payment Processing"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="epic-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="epic-description"
                value={epic.description}
                onChange={(e) => setEpic({ ...epic, description: e.target.value })}
                rows="3"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the purpose of this epic"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Loader size={16} className="mr-2 animate-spin" />
                    Creating Epic...
                  </span>
                ) : (
                  'Create Epic'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EpicCreationModal;
