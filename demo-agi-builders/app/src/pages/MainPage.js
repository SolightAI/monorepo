import { useState } from "react"
import TestResultsTable from "../components/TestResultsTable"
import MetricsCards from "../components/MetricsCards"
import FilterControls from "../components/FilterControls"
import AddTestModal from "../components/AddTestModal"
import { testData } from "../data/mockData"
import AiDetectedBugs from "../components/AiDetectedBugs"
import { aiDetectedBugs as bugsList } from "../data/mockBugsData"

function MainPage() {
  const [tests, setTests] = useState(testData)
  const [activeTab, setActiveTab] = useState("ai-bugs")
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    page: "All Pages",
    category: "All Categories",
    status: "All Statuses",
    type: "All Types",
  })

  // Calculate metrics
  const totalTests = tests.length
  const passedTests = tests.filter((test) => test.status === "Passed").length
  const failedTests = tests.filter((test) => test.status === "Failed").length
  const bugsCount = tests.reduce((total, test) => total + (test.bugs?.length || 0), 0)
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

  const addNewTest = (newTest) => {
    const testWithId = {
      ...newTest,
      id: `TEST-${(tests.length + 1).toString().padStart(3, "0")}`,
      status: "Pending",
      timestamp: new Date().toLocaleString(),
      duration: "-",
      bugs: [],
    }
    setTests([...tests, testWithId])
    setIsAddTestModalOpen(false)
  }

  const applyFilters = (newFilters) => {
    setFilters(newFilters)
  }

  const resetFilters = () => {
    setFilters({
      page: "All Pages",
      category: "All Categories",
      status: "All Statuses",
      type: "All Types",
    })
  }

  // Filter tests based on current filters
  const filteredTests = tests.filter((test) => {
    return (
      (filters.page === "All Pages" || test.page === filters.page) &&
      (filters.category === "All Categories" || test.category === filters.category) &&
      (filters.status === "All Statuses" || test.status === filters.status) &&
      (filters.type === "All Types" || test.type === filters.type)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">E2E Test Results Dashboard</h1>
        <p className="text-gray-600 mb-6">Monitor your end-to-end tests and AI-detected bugs</p>

        <MetricsCards
          totalTests={totalTests}
          passedTests={passedTests}
          failedTests={failedTests}
          aiDetectedBugs={bugsCount}
          passRate={passRate}
        />

        <div className="flex justify-between items-center mt-6 mb-4">
          <FilterControls filters={filters} onApplyFilters={applyFilters} onResetFilters={resetFilters} />

          <button
            onClick={() => setIsAddTestModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add New Test
          </button>
        </div>

        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === "ai-bugs" ? "border-b-2 border-black text-black" : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("ai-bugs")}
              >
                AI-Detected Bugs
              </button>
              <button
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === "test-results"
                    ? "border-b-2 border-black text-black"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("test-results")}
              >
                Test Results
              </button>
            </nav>
          </div>

          {activeTab === "test-results" ? (
            <TestResultsTable tests={filteredTests} />
          ) : (
            <AiDetectedBugs bugs={bugsList} />
          )}
        </div>
      </div>

      {isAddTestModalOpen && <AddTestModal onClose={() => setIsAddTestModalOpen(false)} onAddTest={addNewTest} />}
    </div>
  )
}

export default MainPage

