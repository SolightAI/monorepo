import { useState } from "react";
import axios from "axios";

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function AddBugModal({ onClose, onAddBug, testId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedScreenshots, setUploadedScreenshots] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    severity: "MEDIUM",
    url: "",
    test_id: testId
  });

  // Severity levels from the backend schema
  const severityLevels = [
    { id: "CRITICAL", label: "Critical" },
    { id: "HIGH", label: "High" },
    { id: "MEDIUM", label: "Medium" },
    { id: "LOW", label: "Low" }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleScreenshotUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setLoading(true);
    setError(null);

    // In a real app, you would upload these to your backend/cloud storage
    // For this demo, we'll simulate the upload and just store the files locally
    try {
      // Mock upload - in a real app, you'd send these to your server
      // const formData = new FormData();
      // files.forEach(file => {
      //   formData.append('screenshots', file);
      // });
      // const response = await axios.post(`${API_URL}/upload`, formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' }
      // });

      // Simulate successful upload by creating object URLs
      const uploadedUrls = files.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file)
      }));

      setUploadedScreenshots([...uploadedScreenshots, ...uploadedUrls]);
    } catch (err) {
      console.error("Error uploading screenshots:", err);
      setError("Failed to upload screenshots. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const removeScreenshot = (indexToRemove) => {
    setUploadedScreenshots(uploadedScreenshots.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Create the bug object
    const bugData = {
      name: formData.name,
      description: formData.description,
      severity: formData.severity,
      url: formData.url,
      test_id: testId,
      screenshots: uploadedScreenshots.map(screenshot => screenshot.url)
    };

    onAddBug(bugData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Report Issue</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center p-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Title *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Brief description of the issue"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Detailed description of the issue including steps to reproduce"
                />
              </div>

              <div>
                <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
                  Severity *
                </label>
                <select
                  id="severity"
                  name="severity"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.severity}
                  onChange={handleChange}
                >
                  {severityLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                  URL *
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="https://example.com/page-with-issue"
                />
              </div>

              <div>
                <label htmlFor="screenshots" className="block text-sm font-medium text-gray-700 mb-1">
                  Screenshots (Optional)
                </label>
                <input
                  type="file"
                  id="screenshots"
                  name="screenshots"
                  accept="image/*"
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  onChange={handleScreenshotUpload}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Upload one or more screenshots that demonstrate the issue
                </p>
              </div>

              {/* Display uploaded screenshots */}
              {uploadedScreenshots.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Screenshots</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {uploadedScreenshots.map((screenshot, index) => (
                      <div key={index} className="relative">
                        <img
                          src={screenshot.url}
                          alt={`Screenshot ${index + 1}`}
                          className="border border-gray-200 rounded-md w-full h-auto"
                        />
                        <button
                          type="button"
                          onClick={() => removeScreenshot(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                          name="Remove screenshot"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="text-xs text-gray-500 truncate mt-1">{screenshot.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md mr-2"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-md"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Report Issue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AddBugModal;
