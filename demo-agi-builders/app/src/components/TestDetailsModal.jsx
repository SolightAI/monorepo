function TestDetailsModal({ test, onClose }) {
    const renderStatusBadge = (status) => {
      if (status === "Passed") {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Passed
          </span>
        )
      } else if (status === "Failed") {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            Failed
          </span>
        )
      } else {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            Pending
          </span>
        )
      }
    }
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">Test Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
  
          <div className="px-6 py-4">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{test.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{test.id}</p>
              </div>
              {renderStatusBadge(test.status)}
            </div>
  
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Test Type</h4>
                <p className="text-sm text-gray-900">{test.type}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Page</h4>
                <p className="text-sm text-gray-900">{test.page}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Category</h4>
                <p className="text-sm text-gray-900">{test.category}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Duration</h4>
                <p className="text-sm text-gray-900">{test.duration}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Last Run</h4>
                <p className="text-sm text-gray-900">{test.timestamp}</p>
              </div>
            </div>
  
            {test.description && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                <p className="text-sm text-gray-900">{test.description}</p>
              </div>
            )}
  
            {test.steps && test.steps.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Test Steps</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  {test.steps.map((step, index) => (
                    <li key={index} className="text-sm text-gray-900">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {test.results && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Test Results</h4>
                <div className="bg-gray-50 rounded-md p-3">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap">{test.results}</pre>
                </div>
              </div>
            )}

            {test.bugs && test.bugs.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">AI-Detected Bugs ({test.bugs.length})</h4>
                <div className="space-y-3">
                  {test.bugs.map((bug, index) => (
                    <div key={index} className="bg-red-50 border border-red-100 rounded-md p-3">
                      <div className="flex justify-between items-start">
                        <h5 className="text-sm font-medium text-red-800">{bug.title}</h5>
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">{bug.severity}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{bug.description}</p>
                      {bug.screenshot && (
                        <div className="mt-2">
                          <img
                            src={bug.screenshot || "/placeholder.svg"}
                            alt={`Bug screenshot: ${bug.title}`}
                            className="border border-gray-200 rounded-md max-w-full h-auto"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
  
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md mr-2">
              Close
            </button>
            <button className="px-4 py-2 bg-black text-white rounded-md">Run Test Again</button>
          </div>
        </div>
      </div>
    )
  }
  
  export default TestDetailsModal
  
  