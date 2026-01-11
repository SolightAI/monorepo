import Tooltip from "@/components/common/Tooltip";
import DemoTestDetailsModal from "@/components/modals/DemoTestDetailsModal";
import { useDemo } from "@/context/DemoContext";
import { createTestExecution, getTestExecution } from "@/services/testExecutionService";
import { getDemoTests } from "@/services/testService";
import { formatStatus, getStatusDescription, getStatusInfo, orderStatus, TEST_STATUS } from "@/utils/testExecutionUtils";
import { Lock, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DEMO_TEST_RUNS_QUOTA = 5; // Max number of tests allowed to run in demo

export function Results() {
  const navigate = useNavigate();
  const { url, feature, reset } = useDemo();
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testRunsRemaining, setTestRunsRemaining] = useState(DEMO_TEST_RUNS_QUOTA);
  const [maxTestRuns, setMaxTestRuns] = useState(DEMO_TEST_RUNS_QUOTA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [runningTests, setRunningTests] = useState({}); // Track tests that are currently running - Record<string, boolean>;
  const [latestExecutionsMap, setLatestExecutionsMap] = useState({}); // New state for latest execution data
  const testPollingIntervalsRef = useRef({}); // Track polling intervals for individual tests

  const sortedTests = useMemo(() => {
    return tests.sort((a, b) => orderStatus(latestExecutionsMap[a.id]?.status ?? null) - orderStatus(latestExecutionsMap[b.id]?.status ?? null));
  }, [tests, latestExecutionsMap]);

  const RUNNING_STATUS = 'Running';

  const decountTestRunsRemaining = () => {
    setTestRunsRemaining(prev => {
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  };

  // Centralized error handling function
  const handleFetchError = (action, err) => {
    console.error(`Error ${action}:`, err);
    setError(`Failed to ${action}. Please try again later.`);
    setLoading(false);
  };

  const handleTestSelect = (test) => {
    setSelectedTest(test);
  };
  
  // Handle running a single test
  const handleRunSingleTest = async (testId) => {
    let maxTestsToRun = testRunsRemaining;

    if (maxTestsToRun === 0) {
      setError('No test runs remaining.');
      return;
    };

    try {
      setError(null);

      // Mark this test as running
      setRunningTests(prev => ({ ...prev, [testId]: true }));

      const executionData = {
        test_id: testId,
        status: TEST_STATUS.PENDING,
        environment: 'demo',
        executor_type: 'MANUAL',
        notes: null
      };

      const response = await createTestExecution(executionData, true);

      // Start polling for the test status
      pollTestExecutionStatus(testId, response.id);

      // Update tests list immediately to show pending
      setTests(prevTests => prevTests.map(test =>
        test.id === testId ? {
          ...test,
          status: 'pending',
          last_execution_id: response.id,
          started_at: new Date().toISOString()
        } : test
      ));
      
      decountTestRunsRemaining();
    } catch (err) {
      console.error('Error running test:', err);
      setError('Failed to run test. Please try again.');

      // Remove from running tests
      setRunningTests(prev => {
        const updated = { ...prev };
        delete updated[testId];
        return updated;
      });
    }
  };

  const pollTestExecutionStatus = async (testId, executionId) => {
    if (!executionId) return;

    // Clear any existing interval for this test
    if (testPollingIntervalsRef.current[testId]) {
      clearInterval(testPollingIntervalsRef.current[testId]);
    }

    // Start polling
    testPollingIntervalsRef.current[testId] = setInterval(async () => {
      try {
        const executionData = await getTestExecution(executionId, true);

        // Instead of updating the test object's status directly,
        // update the latestExecutionsMap
        setLatestExecutionsMap(prevMap => ({
          ...prevMap,
          [testId]: {
            test_id: testId,
            execution_id: executionId,
            status: executionData.status,
            started_at: executionData.started_at,
            ended_at: executionData.ended_at
          }
        }));

        // If status is no longer pending, stop polling
        if (executionData.status !== TEST_STATUS.PENDING && executionData.status !== 'unknown') {
          clearInterval(testPollingIntervalsRef.current[testId]);
          delete testPollingIntervalsRef.current[testId];

          // Remove from running tests
          setRunningTests(prev => {
            const updated = { ...prev };
            delete updated[testId];
            return updated;
          });
        }
      } catch (err) {
        console.error(`Error polling test execution status for ${executionId}:`, err);
        // Stop polling on error
        clearInterval(testPollingIntervalsRef.current[testId]);
        delete testPollingIntervalsRef.current[testId];

        // Remove from running tests
        setRunningTests(prev => {
          const updated = { ...prev };
          delete updated[testId];
          return updated;
        });
      }
    }, 5000); // Poll every 5 seconds
  };

  const fetchDemoTests = async () => { 
    if (!feature) return;

    try {
      setError(null);
      setLoading(true);
      const testsData = await getDemoTests(feature);
      setTests(testsData);
      setTestRunsRemaining(Math.min(testsData.length, DEMO_TEST_RUNS_QUOTA));
      setMaxTestRuns(Math.min(testsData.length, DEMO_TEST_RUNS_QUOTA));
      setLoading(false);
    } catch (err) {
      handleFetchError('fetching tests', err);
    }
  };
  
  const handleTestClose = () => {
    setSelectedTest(null);
  };

  const hasRunningTests = useCallback(() => {
    return Object.keys(runningTests).length > 0;
  }, [runningTests]);

  // Add useEffect for cleanup of test polling intervals
  useEffect(() => {
    return () => {
      // Clean up all test execution polling intervals when component unmounts
      Object.values(testPollingIntervalsRef.current).forEach(interval => {
        clearInterval(interval);
      });
      testPollingIntervalsRef.current = {};
    };
  }, []);

  // Fallback to home demo page if no feature
  useEffect(() => {
    if (!feature) {
      navigate("/demo", { replace: true });
    }
 
    fetchDemoTests();

  }, [feature, navigate]);

  useEffect(() => {
    if (!hasRunningTests()) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      return "The tests are currently being executed. Are you sure you want to quit ?";
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    
    }
  }, [runningTests, hasRunningTests]);

  // Only show error page for critical/loading errors that prevent displaying the main UI
  if (error && tests.length === 0 && !loading) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => fetchDemoTests()}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-red-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full md:max-w-[840px] mx-auto items-center pb-12 pt-24">
      {selectedTest && (
        <DemoTestDetailsModal
          test={selectedTest}
          // Find the feature and pass its first URL
          featureUrl={url}
          onClose={handleTestClose}
        />
      )}

      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
        Your tests are ready!
      </h1>

      <p>
        {sortedTests.length} test(s) generated for website:{' '} 
        <a
          href={url}
          target="_blank"
          className="text-blue-500 hover:underline" rel="noreferrer"
        >
          {url}
        </a>
      </p>

      <div className="w-full bg-white rounded-lg shadow overflow-hidden mt-14">
        {/* Add "Run Selected Tests" button above the table */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-start">
          <div className="text-sm text-gray-500">
            {testRunsRemaining === 0 ? (
              <span>No test runs remaining</span>
            ) : 
            `${testRunsRemaining} of ${maxTestRuns} test run${testRunsRemaining > 1 ? 's' : ''} remaining`
          }
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  >
                    <div className="flex items-center">
                      Name
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  >
                    <div className="flex items-center">
                      Status
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 relative">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : sortedTests.length > 0 ? (
                  sortedTests.map((test) => (
                    <tr
                      key={test.id}
                      className={`hover:bg-gray-50 cursor-pointer`}
                      onClick={() => handleTestSelect(test)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Tooltip content={runningTests[test.id] ? 'Test is currently running' : getStatusDescription(latestExecutionsMap[test.id]?.status)}>
                            <div
                              className={`inline-flex items-center px-2.5 py-1 rounded-full ${runningTests[test.id] ? 'bg-blue-100 text-blue-800' : getStatusInfo(latestExecutionsMap[test.id]?.status).color}`}
                            >
                              <div className="mr-2">
                                {runningTests[test.id] ? (
                                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                                ) : (
                                  getStatusInfo(latestExecutionsMap[test.id]?.status, 20).icon
                                )}
                              </div>
                              <div>
                                {runningTests[test.id] ? formatStatus(RUNNING_STATUS) : formatStatus(latestExecutionsMap[test.id]?.status) ?? 'Not Run'}
                              </div>
                            </div>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{test.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-md">{test.description}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center items-center space-x-2">
                          <button
                            className={`text-green-600 hover:text-green-900 flex items-center ${runningTests[test.id] || testRunsRemaining === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunSingleTest(test.id);
                            }}
                            title={runningTests[test.id] ? `Test is ${formatStatus(RUNNING_STATUS)}` : testRunsRemaining === 0 ? 'No more tests to run' : `Run this test`}
                            disabled={runningTests[test.id] || testRunsRemaining === 0}
                          >
                            {runningTests[test.id] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-1"></div>
                            ) : testRunsRemaining === 0 ? (
                              <Lock size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-lg text-gray-500">
                      <div className="flex flex-col items-center">
                        <p>No tests found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-8 items-center">
        <p>Unlock all tests and enable continuous test monitoring by creating a free Solight account.</p>
        <button
          onClick={() => {
            reset();
            navigate("/register")
          }}
          className="w-fit flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          Join Solight now !
        </button>
      </div>

      <hr className="w-full my-8 border"/>
    </div>
  )
}
