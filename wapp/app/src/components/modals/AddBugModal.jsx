import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, AlertCircle, UploadCloud, Trash } from 'lucide-react';
import { createBug } from '@/services/bugService';
import { getTestExecutions } from '@/services/testExecutionService';
import { getModalContainerProps, getModalContentProps } from '@/utils/modalUtils';

/**
 * Modal component for adding a new bug related to a test
 */
const AddBugModal = ({ test, onClose, onBugCreated, productId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    severity: 'Medium',
    url: '',
    test_id: test.id,
    test_execution_id: null,
    screenshots: []
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [testExecutions, setTestExecutions] = useState([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);

  const modalRef = useRef(null);

  useEffect(() => {
    fetchTestExecutions();
  }, [test.id]);

  const fetchTestExecutions = async () => {
    try {
      setLoadingExecutions(true);
      const data = await getTestExecutions(test.id);
      // Sort by date, newest first
      const sortedExecutions = data.sort((a, b) =>
        new Date(b.started_at) - new Date(a.started_at)
      );
      setTestExecutions(sortedExecutions);
    } catch (err) {
      console.error('Error fetching test executions:', err);
    } finally {
      setLoadingExecutions(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      setError('Please provide both a name and description for the bug.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Convert empty string to null for test_execution_id
      const bugData = {
        ...formData,
        test_execution_id: formData.test_execution_id || null
      };

      const newBug = await createBug(bugData);

      if (onBugCreated) {
        onBugCreated(newBug);
      }

      onClose();
    } catch (err) {
      console.error('Error creating bug:', err);
      setError(err.message || 'Failed to create bug. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScreenshotUpload = (e) => {
    const files = Array.from(e.target.files);

    // For demo purposes, we're just storing the file names
    // In a real app, you'd upload these to a storage service
    const newScreenshots = files.map(file => URL.createObjectURL(file));

    setFormData({
      ...formData,
      screenshots: [...formData.screenshots, ...newScreenshots]
    });
  };

  const removeScreenshot = (index) => {
    const updatedScreenshots = [...formData.screenshots];
    updatedScreenshots.splice(index, 1);

    setFormData({
      ...formData,
      screenshots: updatedScreenshots
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div {...getModalContainerProps(onClose)}>
      <div {...getModalContentProps('w-full max-w-2xl')}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Report a Bug
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
              <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Reporting a bug for: <span className="font-semibold">{test.name}</span>
            </p>
          </div>

          {/* Test Execution Selection */}
          <div className="mb-4">
            <label htmlFor="test_execution_id" className="block text-sm font-medium text-gray-700 mb-1">
              Link to Test Execution (optional)
            </label>

            <select
              id="test_execution_id"
              name="test_execution_id"
              value={formData.test_execution_id || ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Not linked to a specific execution</option>

              {loadingExecutions ? (
                <option disabled>Loading executions...</option>
              ) : (
                testExecutions.map(execution => (
                  <option key={execution.id} value={execution.id}>
                    {formatDate(execution.started_at)} - {execution.environment} - {execution.status}
                  </option>
                ))
              )}
            </select>

            <p className="mt-1 text-sm text-gray-500">
              Linking to a specific test execution helps track exactly when this bug was discovered.
            </p>
          </div>

          {/* Bug name */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Bug Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Brief description of the bug"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Bug description */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              required
              placeholder="Detailed description of the bug, steps to reproduce, and expected vs. actual behavior"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Severity */}
          <div className="mb-4">
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
              Severity
            </label>
            <select
              id="severity"
              name="severity"
              value={formData.severity}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* URL */}
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              URL (optional)
            </label>
            <input
              id="url"
              name="url"
              type="text"
              value={formData.url}
              onChange={handleChange}
              placeholder="URL where the bug occurs or issue tracker URL"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Screenshots */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screenshots (optional)
            </label>

            <div className="mt-1 border-2 border-dashed border-gray-300 rounded-md p-6 flex justify-center">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>

            {formData.screenshots.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                {formData.screenshots.map((screenshot, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={screenshot}
                      alt={`Screenshot ${index}`}
                      className="h-24 w-full object-cover rounded border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal footer */}
        <div className="p-4 border-t flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md mr-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              'Report Bug'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBugModal;
