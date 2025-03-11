import { useState, useEffect, useMemo } from "react"
import axios from "axios"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import TestResultsTable from "../components/TestResultsTable"
import MetricsCards from "../components/MetricsCards"
import FilterControls from "../components/FilterControls"
import AddTestModal from "../components/AddTestModal"
import AiDetectedBugs from "../components/AiDetectedBugs"
import NotFound from "../pages/NotFound"

// Base API URL - should be set in environment variable
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// Check if user is authenticated by looking at localStorage
const isAuthenticated = () => localStorage.getItem('isAuthenticated') === 'true';

// Loading overlay component with fake status updates
const LoadingOverlay = ({ currentStep, progress }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Processing Test</h2>
          <p className="text-gray-600 mb-4">{currentStep || "Initializing..."}</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MainPage() {
  const [tests, setTests] = useState([])
  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("ai-bugs")
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false)
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false)
  const [currentLoadingStep, setCurrentLoadingStep] = useState("")
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [filters, setFilters] = useState({
    page: "All Pages",
    category: "All Categories",
    status: "All Statuses",
    type: "All Types",
  })
  const [productInfo, setProductInfo] = useState(null)
  const [productNotFound, setProductNotFound] = useState(false)

  // Check if user is authenticated
  const userIsAuthenticated = useMemo(() => isAuthenticated(), []);

  // Get the current location and params
  const location = useLocation()
  const navigate = useNavigate()
  const { productPath } = useParams()

  // Determine if we should show product-specific data
  const shouldShowData = productPath !== undefined
  
  // Check for redirect messages (like when redirected from admin routes)
  const [notificationMessage, setNotificationMessage] = useState("");

  useEffect(() => {
    // Check if there's a message in the location state (from redirect)
    if (location.state && location.state.message) {
      setNotificationMessage(location.state.message);

      // Clear the location state to prevent showing the message again on refresh
      navigate(location.pathname, { replace: true, state: {} });

      // Hide the notification after 5 seconds
      const timer = setTimeout(() => {
        setNotificationMessage("");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [location, navigate]);

  // Fetch tests and bugs from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setProductNotFound(false)

      try {
        // Only fetch data if a product path is specified
        if (shouldShowData) {
          // Try to get product information first
          try {
            const productResponse = await axios.get(`${API_URL}/products/by-path/${productPath}`)
            if (productResponse.data) {
              setProductInfo(productResponse.data)
            } else {
              // No product found for this path
              setProductNotFound(true)
              setLoading(false)
              return
            }
          } catch (err) {
            console.warn("Could not fetch product info:", err)
            setProductNotFound(true)
            setLoading(false)
            return
          }
          
          // Only continue to fetch tests and bugs if we found a product
          // Fetch tests for the current product path
          const testsResponse = await axios.get(`${API_URL}/tests/by-product-path/${productPath}`)

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

          // Fetch bugs for the current product path
          const bugsResponse = await axios.get(`${API_URL}/bugs/by-product-path/${productPath}`)

          // Transform the API response to match the format expected by components
          const transformedBugs = bugsResponse.data.map(bug => ({
            id: bug.id,
            title: bug.title,
            url: bug.url,
            page: bug.test ? bug.test.name.split(' - ')[1] || "Unknown" : "Unknown",
            category: bug.test ? bug.test.category : "Unknown",
            severity: bug.severity,
            description: bug.description,
            detectedAt: new Date(bug.detected_at).toLocaleString(),
            screenshots: bug.screenshots,
            status: bug.status || "Open",
          }))

          setBugs(transformedBugs)
        } else {
          // When no product path is specified, show empty data or a welcome page
          setTests([])
          setBugs([])
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [productPath, shouldShowData])

  // Calculate metrics - now based on conditional data
  const totalTests = tests.length
  const passedTests = tests.filter((test) => test.status === "Passed").length
  const failedTests = tests.filter((test) => test.status === "Failed").length
  const bugsCount = tests.reduce((total, test) => total + (test.bugs?.length || 0), 0)
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

  const addNewTest = async (newTest) => {
    try {
      // Format the test data for the API
      // const apiTest = {
      //   name: newTest.name,
      //   description: newTest.description,
      //   url: `https://example.com/${newTest.page.toLowerCase().replace(/\s+/g, '-')}`,
      //   category: newTest.category.toUpperCase(),
      //   user_story_id: "00000000-0000-0000-0000-000000000000", // Default ID, replace with actual user story selection
      // }

      // // Send the test to the API
      // const response = await axios.post(`${API_URL}/tests/`, apiTest)

      // // Transform the API response to match the format expected by components
      // const transformedTest = {
      //   id: response.data.id,
      //   name: response.data.name,
      //   description: response.data.description,
      //   page: response.data.url.split('/').pop().replace(/-/g, ' '),
      //   category: response.data.category,
      //   type: "Feature", // Default type as API doesn't have this field
      //   status: "Pending",
      //   timestamp: new Date().toLocaleString(),
      //   duration: "-",
      //   bugs: [],
      // }

      // setTests([...tests, transformedTest])
      setIsAddTestModalOpen(false)

      // Show the loading overlay with fake status updates
      setShowLoadingOverlay(true)
      setLoadingProgress(0)

      // Simulate different loading steps with timeouts
      const loadingSteps = [
        "Preparing test environment...",
        "Validating test configuration...",
        "Setting up test dependencies...",
        "Initializing test runner...",
        "Executing test cases...",
        "Analyzing test results...",
        "Processing test data...",
        "Generating test report...",
        "Finalizing test integration..."
      ]

      let stepIndex = 0;

      const updateLoadingStep = () => {
        if (stepIndex < loadingSteps.length) {
          setCurrentLoadingStep(loadingSteps[stepIndex]);

          // Calculate progress percentage, but ensure it never reaches 100%
          // Max progress will be 95% to give the impression that it's still working
          const maxProgress = 95;
          const progressPerStep = maxProgress / loadingSteps.length;
          const newProgress = Math.min(progressPerStep * (stepIndex + 1), maxProgress);
          setLoadingProgress(newProgress);

          stepIndex++;
          // Make transitions between steps MUCH slower (8 seconds per step)
          setTimeout(updateLoadingStep, 8000);
        } else {
          // Reset the step index and progress, then start over to create an infinite loop
          stepIndex = 0;
          setLoadingProgress(0);
          setTimeout(updateLoadingStep, 8000);

          // In a real application, you would hide the overlay here
          // setShowLoadingOverlay(false);
        }
      };

      // Start the loading step updates
      updateLoadingStep();

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

  // Navigate to settings page
  const goToSettings = () => {
    navigate('/settings');
  };

  // Render the NotFound component directly when product is not found
  if (productPath && productNotFound && !loading) {
    return <NotFound />
  }

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
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  // When user is not authenticated, only show AI bugs list with simplified UI
  if (!userIsAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Laneo</h1>

            <div className="flex space-x-2">
              <a
                href="/login"
                className="text-gray-500  hover:text-gray-700 focus:outline-none"
              >
                Sign in
              </a>
            </div>
          </div>
          <p className="text-gray-600 mb-6">Your AI Agent for QA - We Bug You Less!</p>

          <div className="bg-white rounded-md shadow-sm overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <div className="py-4 px-6 text-sm font-medium border-b-2 border-black text-black">
                  AI-Detected Bugs
                </div>
              </nav>
            </div>

            <AiDetectedBugs bugs={bugs} />
          </div>
        </div>
      </div>
    )
  }

  // Regular dashboard for authenticated users
  return (
    <div className="container mx-auto px-4 py-8">
      {notificationMessage && (
        <div className="mb-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
          <p>{notificationMessage}</p>
        </div>
      )}
      
      {showLoadingOverlay && (
        <LoadingOverlay currentStep={currentLoadingStep} progress={loadingProgress} />
      )}
      
      {!productPath && (
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold mb-4">Welcome to the Bug Tracker</h2>
          <p className="mb-6">Please select a product path to view bugs and tests.</p>
        </div>
      )}
      
      {productPath && productInfo && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{productInfo.name}</h1>
          <p className="text-gray-600">{productInfo.description}</p>
        </div>
      )}
      
      {/* Only show components when product path is available and product is found */}
      {productPath && productInfo && (
        <>
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Laneo</h1>

              <div className="flex space-x-2">
                {/* Settings button */}
                <button 
                  onClick={goToSettings}
                  className="bg-gray-200 text-gray-700 px-3 py-1 text-sm rounded-md hover:bg-gray-300 focus:outline-none"
                  title="Go to settings page"
                >
                  Settings
                </button>
              </div>
            </div>
            <p className="text-gray-600 mb-6">Monitor your end-to-end tests and AI-detected bugs</p>
          </div>

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
                    activeTab === "tests"
                      ? "border-b-2 border-black text-black"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("tests")}
                >
                  Test Results
                </button>
              </nav>
            </div>

            {error && (
              <div className="p-4 mb-4 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {activeTab === "ai-bugs" && (
                  <AiDetectedBugs bugs={bugs} />
                )}
                {activeTab === "tests" && (
                  <TestResultsTable tests={tests} />
                )}
              </>
            )}
          </div>
        </>
      )}

      {isAddTestModalOpen && <AddTestModal onClose={() => setIsAddTestModalOpen(false)} onAddTest={addNewTest} />}
    </div>
  )
}

export default MainPage

