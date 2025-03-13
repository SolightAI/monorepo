import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, AlertCircle, Plus, Trash, Sparkles, Loader } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const EpicCreationModal = ({
  productId,
  productName,
  onClose,
  onComplete,
  productLinks,
  existingEpics = [],
  isEditing = false,
  isLoading = false
}) => {
  const [epics, setEpics] = useState([
    { name: '', description: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [epicIdsToDelete, setEpicIdsToDelete] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Load existing epics when in edit mode and they're loaded
  useEffect(() => {
    if (isEditing && existingEpics.length > 0) {
      // The epics already have the correct structure with id, name, and description
      setEpics(existingEpics);
    }
  }, [isEditing, existingEpics]);

  const handleEpicChange = (index, field, value) => {
    const updatedEpics = [...epics];
    updatedEpics[index][field] = value;
    setEpics(updatedEpics);
  };

  const addEpicField = () => {
    setEpics([...epics, { name: '', description: '' }]);
  };

  const removeEpicField = (index) => {
    const epicToRemove = epics[index];

    // If this is an existing epic (has an ID), confirm deletion
    if (epicToRemove.id) {
      if (window.confirm(`Are you sure you want to delete the epic "${epicToRemove.name}"? This action cannot be undone.`)) {
        setEpicIdsToDelete(prev => [...prev, epicToRemove.id]);

        if (epics.length === 1) {
          // If it's the last epic, replace with an empty form
          setEpics([{ name: '', description: '' }]);
        } else {
          // Otherwise just remove it from the list
          const updatedEpics = epics.filter((_, i) => i !== index);
          setEpics(updatedEpics);
        }
      }
    } else {
      // For new epics being added, no need for confirmation
      if (epics.length === 1) {
        // Keep at least one epic input if there's no existing epics
        if (!isEditing) {
          setEpics([{ name: '', description: '' }]);
        } else {
          const updatedEpics = epics.filter((_, i) => i !== index);
          setEpics(updatedEpics.length > 0 ? updatedEpics : [{ name: '', description: '' }]);
        }
      } else {
        const updatedEpics = epics.filter((_, i) => i !== index);
        setEpics(updatedEpics);
      }
    }
  };

  const validateEpics = () => {
    // At least one epic must have a name if we're not just deleting epics
    return epics.some(epic => epic.name.trim() !== '') ||
           (isEditing && epicIdsToDelete.length > 0 && epics.length === 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEpics()) {
      setError('Please add at least one epic with a name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage('');

    // Filter out empty epics
    const validEpics = epics.filter(epic => epic.name.trim() !== '');

    try {
      const createdOrUpdatedEpics = [];

      // Handle epic deletions first (if in edit mode)
      if (isEditing && epicIdsToDelete.length > 0) {
        for (const epicId of epicIdsToDelete) {
          await axios.delete(
            `${API_URL}/epics/${epicId}`,
            { withCredentials: true }
          );
        }
      }

      // Create or update epics
      for (const epic of validEpics) {
        const epicData = {
          name: epic.name.trim(),
          description: epic.description.trim(),
          product_id: productId
        };

        let response;

        if (epic.id) {
          // Update existing epic
          response = await axios.put(
            `${API_URL}/epics/${epic.id}`,
            epicData,
            { withCredentials: true }
          );
        } else {
          // Create new epic
          response = await axios.post(
            `${API_URL}/epics/`,
            epicData,
            { withCredentials: true }
          );
        }

        createdOrUpdatedEpics.push(response.data);
      }

      if (isEditing) {
        setSuccessMessage('Epics updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);

        // Clear the deletion list since they've been processed
        setEpicIdsToDelete([]);
      } else {
        // Call the onComplete callback with the created epics
        onComplete(createdOrUpdatedEpics);
      }
    } catch (err) {
      // Fix: Ensure the error is properly converted to a string
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to create epics. Please try again.';

      setError(errorMessage);
      console.error('Error creating/updating epics:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onComplete([]);
  };

  const handleAutoGenerate = async () => {
    const hasLinks = productLinks && productLinks.length > 0;

    if (!hasLinks) {
      setError('Documentation links are required for AI generation. Please add documentation links to the product and try again.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Call the AI generation endpoint
      const response = await axios.post(
        `${API_URL}/ai/generate-epics`,
        {
          product_id: productId,
          documentation_links: productLinks
        },
        { withCredentials: true }
      );

      // Update epics with the generated ones
      const generatedEpics = response.data.map(epic => ({
        name: epic.name,
        description: epic.description || ''
      }));

      // Replace existing epics with the generated ones
      setEpics(generatedEpics.length > 0 ? generatedEpics : [{ name: '', description: '' }]);
    } catch (err) {
      // Fix: Ensure the error is properly converted to a string
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to generate epics. Please try again or create them manually.';

      setError(errorMessage);
      console.error('Error generating epics:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const hasDocumentation = productLinks && productLinks.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {isEditing ? `Manage Epics for "${productName}"` : `Add Epics to "${productName}"`}
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
            {isEditing
              ? ' Edit, add, or remove epics for your product.'
              : ' Add one or more epics for your product.'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
              <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-1" />
              <p>{typeof error === 'string' ? error : JSON.stringify(error)}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-700 rounded-lg">
              {successMessage}
            </div>
          )}

          {isLoading ? (
            <div className="py-10 flex flex-col items-center justify-center">
              <Loader size={40} className="text-purple-500 animate-spin mb-4" />
              <p className="text-gray-600">Loading epics for {productName}...</p>
            </div>
          ) : (
            <>
              {/* AI Auto-generation button */}
              <div className="mb-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleAutoGenerate}
                  disabled={isGenerating || !hasDocumentation}
                  className={`flex items-center px-4 py-2 rounded-md ${
                    hasDocumentation
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  title={
                    hasDocumentation
                      ? 'Generate epics using AI based on your product documentation links'
                      : 'Documentation links are required for AI generation'
                  }
                >
                  {isGenerating ? (
                    <>
                      <Loader size={18} className="mr-2 animate-spin" />
                      Generating Epics...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className="mr-2" />
                      Auto-generate Epics with AI
                    </>
                  )}
                </button>
              </div>
              {!hasDocumentation && (
                <div className="mb-6 text-center text-sm text-gray-500">
                  Documentation links are required for AI generation. Please add documentation links to the product and try again.
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {epics.map((epic, index) => (
                  <div key={epic.id || index} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">
                        {epic.id ? `Epic: ${epic.name}` : `New Epic ${index + 1}`}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeEpicField(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove this epic"
                      >
                        <Trash size={16} />
                      </button>
                    </div>

                    <div className="mb-3">
                      <label htmlFor={`epic-name-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Epic Name
                      </label>
                      <input
                        type="text"
                        id={`epic-name-${index}`}
                        value={epic.name}
                        onChange={(e) => handleEpicChange(index, 'name', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="E.g., User Authentication, Payment Processing"
                      />
                    </div>

                    <div>
                      <label htmlFor={`epic-description-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        id={`epic-description-${index}`}
                        value={epic.description}
                        onChange={(e) => handleEpicChange(index, 'description', e.target.value)}
                        rows="2"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe the purpose of this epic"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addEpicField}
                  className="mb-6 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Plus size={16} className="mr-1" />
                  Add Another Epic
                </button>

                <div className="flex justify-end space-x-3">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Skip for Now
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    {isEditing ? 'Close' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 bg-blue-600 text-white rounded-md ${
                      isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                    }`}
                  >
                    {isSubmitting
                      ? (isEditing ? 'Updating Epics...' : 'Creating Epics...')
                      : (isEditing ? 'Save Changes' : 'Create Epics')}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EpicCreationModal;
