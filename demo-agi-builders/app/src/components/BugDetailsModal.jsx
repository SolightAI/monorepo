import React, { useEffect } from 'react';

function BugDetailsModal({ bug, onClose }) {
  // Add useEffect hook to handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[800px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{bug.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Bug ID: BUG-{String(bug.id).padStart(3, "0")} • Detected on {bug.detectedAt}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Page</h3>
              <p className="mt-1 text-sm text-gray-900">{bug.page}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Category</h3>
              <p className="mt-1 text-sm text-gray-900">{bug.category}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Severity</h3>
              <span
                className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1
                ${bug.severity === "Critical" ? "bg-red-100 text-red-800" : ""}
                ${bug.severity === "High" ? "bg-orange-100 text-orange-800" : ""}
                ${bug.severity === "Medium" ? "bg-yellow-100 text-yellow-800" : ""}
              `}
              >
                {bug.severity === "Critical" && (
                  <svg className="mr-1 h-2 w-2 text-red-500" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                )}
                {bug.severity}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                In Progress
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-600">{bug.description}</p>
          </div>

          {/* Steps to Reproduce */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Steps to Reproduce</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li className="text-sm text-gray-600">Navigate to the Products page</li>
              <li className="text-sm text-gray-600">Locate the price range slider in the filters section</li>
              <li className="text-sm text-gray-600">Adjust the minimum and maximum price values</li>
              <li className="text-sm text-gray-600">Observe that the product list does not update</li>
            </ol>
          </div>

          {/* AI Analysis */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">AI Analysis</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <p className="text-sm text-amber-800">
                The price filter component is not triggering the filter update function when the slider values change.
                The event listener is attached to the 'change' event, but the slider component is using a custom event
                called 'slider-change' which is not being captured.
              </p>
            </div>
          </div>

          {/* Suggested Fix */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Suggested Fix</h3>
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">
                Update the event listener to capture both 'change' and 'slider-change' events, or modify the slider
                component to dispatch a standard 'change' event.
              </p>
            </div>
          </div>

          {/* Screenshots */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Screenshots</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <img
                  src="/placeholder.svg?height=200&width=300"
                  alt="Price Filter Slider"
                  className="w-full h-48 object-cover rounded-md bg-gray-100"
                />
                <p className="text-sm text-gray-500 mt-1 text-center">Price Filter Slider</p>
              </div>
              <div>
                <img
                  src="/placeholder.svg?height=200&width=300"
                  alt="Unchanged Product List"
                  className="w-full h-48 object-cover rounded-md bg-gray-100"
                />
                <p className="text-sm text-gray-500 mt-1 text-center">Unchanged Product List</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BugDetailsModal
