import React, { useState } from 'react';
import axios from 'axios';
import { X, AlertCircle, Loader } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const EditEpicModal = ({
  epic,
  productName,
  onClose,
  onComplete
}) => {
  const [editedEpic, setEditedEpic] = useState({
    name: epic.name,
    description: epic.description
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editedEpic.name.trim()) {
      setError('Please provide an epic name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const epicData = {
        name: editedEpic.name.trim(),
        description: editedEpic.description.trim()
      };

      const response = await axios.put(
        `${API_URL}/epics/${epic.id}`,
        epicData,
        { withCredentials: true }
      );

      onComplete(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to update epic. Please try again.';

      setError(errorMessage);
      console.error('Error updating epic:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Edit Epic in "{productName}"
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
              <label htmlFor="epic-name" className="block text-sm font-medium text-gray-700 mb-1">
                Epic Name
              </label>
              <input
                type="text"
                id="epic-name"
                value={editedEpic.name}
                onChange={(e) => setEditedEpic({ ...editedEpic, name: e.target.value })}
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
                value={editedEpic.description}
                onChange={(e) => setEditedEpic({ ...editedEpic, description: e.target.value })}
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
                    Updating Epic...
                  </span>
                ) : (
                  'Update Epic'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEpicModal;
