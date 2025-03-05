"use client"

import { useState } from "react"
import BugDetailsModal from "./BugDetailsModal"

function AiDetectedBugs({ bugs }) {
  const [selectedBug, setSelectedBug] = useState(null)
  const [sortBy, setSortBy] = useState("Sort by Severity")

  const getSortedBugs = () => {
    const sortedBugs = [...bugs]

    switch (sortBy) {
      case "Sort by Severity":
        return sortedBugs.sort((a, b) => {
          const severityOrder = { Critical: 3, High: 2, Medium: 1 }
          return severityOrder[b.severity] - severityOrder[a.severity]
        })
      case "Sort by Date":
        return sortedBugs.sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt))
      case "Sort by Page":
        return sortedBugs.sort((a, b) => a.page.localeCompare(b.page))
      case "Sort by Status":
        return sortedBugs.sort((a, b) => a.status?.localeCompare(b.status || ""))
      case "Sort by Category":
        return sortedBugs.sort((a, b) => a.category.localeCompare(b.category))
      default:
        return sortedBugs
    }
  }

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">AI-Detected Bugs</h2>
        <div className="flex gap-2">
          <select 
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option>Sort by Severity</option>
            <option>Sort by Date</option>
            <option>Sort by Page</option>
            <option>Sort by Status</option>
            <option>Sort by Category</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {getSortedBugs().map((bug) => (
          <div
            key={bug.id}
            className="border border-gray-200 rounded-lg p-4 bg-white cursor-pointer hover:border-gray-300"
            onClick={() => setSelectedBug(bug)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-red-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{bug.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {bug.page} • {bug.category}
                  </p>
                </div>
              </div>
              <span
                className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
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

            <p className="text-sm text-gray-600 mb-3">{bug.description}</p>

            <div className="text-xs text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="inline h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Detected on {bug.detectedAt}
            </div>
          </div>
        ))}
      </div>

      {selectedBug && <BugDetailsModal bug={selectedBug} onClose={() => setSelectedBug(null)} />}
    </div>
  )
}

export default AiDetectedBugs

