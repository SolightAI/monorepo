function TestCard({ test, onClick }) {
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
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }

    return (
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-800 truncate">{test.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
              {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
            </span>
          </div>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{test.description}</p>

          <div className="flex items-center text-sm text-gray-500 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {formatDate(test.createdAt)}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{test.page}</span>
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">{test.category}</span>
            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">{test.type}</span>
          </div>

          {test.bugs.length > 0 && (
            <div className="flex items-center text-sm font-medium text-red-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {test.bugs.length} {test.bugs.length === 1 ? "bug" : "bugs"} found
            </div>
          )}
        </div>
      </div>
    )
  }

  export default TestCard
