function TestDetails({ test, onClose }) {
    const getStatusColor = (status) => {
      switch (status) {
        case "passed":
          return "bg-green-100 text-green-800"
        case "failed":
          return "bg-red-100 text-red-800"
        case "pending":
          return "bg-yellow-100 text-yellow-800"
        default:
          return "bg-gray-100 text-gray-800"
      }
    }
  
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  
    return (
      <div>
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{test.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(test.status)}`}>
              {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
            </span>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Page</p>
            <p className="font-medium">{test.page}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Category</p>
            <p className="font-medium">{test.category}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Type</p>
            <p className="font-medium">{test.type}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Created</p>
            <p className="font-medium">{formatDate(test.createdAt)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Last Run</p>
            <p className="font-medium">{test.lastRun ? formatDate(test.lastRun) : "Not run yet"}</p>
          </div>
        </div>
  
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Description</h3>
          <p className="text-gray-700 whitespace-pre-line">{test.description}</p>
        </div>
  
        {test.steps && test.steps.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Test Steps</h3>
            <ol className="list-decimal pl-5 space-y-2">
              {test.steps.map((step, index) => (
                <li key={index} className="text-gray-700">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
  
        {test.results && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Test Results</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{test.results}</pre>
            </div>
          </div>
        )}
  
        {test.bugs && test.bugs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Bugs Found ({test.bugs.length})</h3>
            <div className="space-y-4">
              {test.bugs.map((bug, index) => (
                <div key={index} className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-red-800">{bug.title}</h4>
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">{bug.severity}</span>
                  </div>
                  <p className="text-gray-700 mb-2">{bug.description}</p>
                  {bug.screenshot && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-1">Screenshot:</p>
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
  
        <div className="mt-8 flex justify-end space-x-3">
          <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg" onClick={onClose}>
            Close
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Run Test Again</button>
        </div>
      </div>
    )
  }
  
  export default TestDetails
  
  