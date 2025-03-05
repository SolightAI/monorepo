import { useState, useEffect } from "react"
import axios from "axios"
import TestResultsTable from "../components/TestResultsTable"
import MetricsCards from "../components/MetricsCards"
import FilterControls from "../components/FilterControls"
import AddTestModal from "../components/AddTestModal"
import AiDetectedBugs from "../components/AiDetectedBugs"

// Base API URL - should be set in environment variable
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

function MainPage() {
  const [tests, setTests] = useState([])
  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("ai-bugs")
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    page: "All Pages",
    category: "All Categories",
    status: "All Statuses",
    type: "All Types",
  })

  // Fetch tests and bugs from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch tests
        const testsResponse = await axios.get(`${API_URL}/tests/`)
        
        // Transform the API response to match the format expected by components
        const transformedTests = testsResponse.data.map(test => ({
          id: test.id,
          name: test.name,
          description: test.description,
          page: test.url.split('/').pop().replace(/-/g, ' '), // Extract page from URL
          category: test.category,
          type: "Feature", // Default type as API doesn't have this field
          status: test.status === "PASSED" ? "Passed" : 
                  test.status === "FAILED" ? "Failed" : "Pending",
          duration: test.started_at && test.ended_at ? 
                   `${Math.round((new Date(test.ended_at) - new Date(test.started_at))/10)}ms` : "-",
          timestamp: test.ended_at ? new Date(test.ended_at).toLocaleString() : "-",
          bugs: test.bugs || [],
        }))
        
        setTests(transformedTests)
        
        // Fetch bugs
        const bugsResponse = await axios.get(`${API_URL}/bugs/`)
        
        // Transform the API response to match the format expected by components
        const transformedBugs = bugsResponse.data.map(bug => ({
          id: bug.id,
          title: bug.title,
          page: bug.test ? bug.test.name.split(' - ')[1] || "Unknown" : "Unknown",
          category: bug.test ? bug.test.category : "Unknown",
          severity: bug.severity,
          description: bug.description,
          detectedAt: new Date(bug.detected_at).toLocaleString(),
          status: bug.status || "Open",
        }))
        
        setBugs(transformedBugs)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Calculate metrics
  const totalTests = tests.length
  const passedTests = tests.filter((test) => test.status === "Passed").length
  const failedTests = tests.filter((test) => test.status === "Failed").length
  const bugsCount = tests.reduce((total, test) => total + (test.bugs?.length || 0), 0)
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

  const addNewTest = async (newTest) => {
    try {
      // Format the test data for the API
      const apiTest = {
        name: newTest.name,
        description: newTest.description,
        url: `https://example.com/${newTest.page.toLowerCase().replace(/\s+/g, '-')}`,
        category: newTest.category.toUpperCase(),
        user_story_id: "00000000-0000-0000-0000-000000000000", // Default ID, replace with actual user story selection
      }
      
      // Send the test to the API
      const response = await axios.post(`${API_URL}/tests/`, apiTest)
      
      // Transform the API response to match the format expected by components
      const transformedTest = {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        page: response.data.url.split('/').pop().replace(/-/g, ' '),
        category: response.data.category,
        type: "Feature", // Default type as API doesn't have this field
        status: "Pending",
        timestamp: new Date().toLocaleString(),
        duration: "-",
        bugs: [],
      }
      
      setTests([...tests, transformedTest])
      setIsAddTestModalOpen(false)
    } catch (err) {
      console.error("Error adding test:", err)
      alert("Failed to add test. Please try again.")
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-center">
        <p className="text-gray-600">Loading data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-center">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

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
            <AiDetectedBugs bugs={bugs} />
          )}
        </div>
      </div>

      {isAddTestModalOpen && <AddTestModal onClose={() => setIsAddTestModalOpen(false)} onAddTest={addNewTest} />}
    </div>
  )
}

export default MainPage

