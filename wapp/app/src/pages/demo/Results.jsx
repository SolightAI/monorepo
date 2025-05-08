import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Results() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full md:max-w-[840px] mx-auto items-center pb-12 pt-24">
      {/* {selectedTest && (
        <DemoTestDetailsModal
          test={selectedTest}
          // Find the feature and pass its first URL
          featureUrl={features.find(f => f.id === selectedTest.feature_id)?.urls?.[0]}
          onClose={handleTestClose}
          onTestUpdated={handleTestUpdated}
        />
      )} */}

      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
        Your tests are ready!
      </h1>

      <p>
        Tests generated for website:{' '} 
        <a
          href="https://localhost:8000"
          target="_blank"
          className="text-blue-500 hover:underline" rel="noreferrer"
        >
          https://localhost:8000
        </a>
      </p>

      <div className="w-full bg-white rounded-lg shadow overflow-hidden mt-14">
        {/* Add "Run Selected Tests" button above the table */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            X tests generated
          </div>
          <div className="flex gap-2">
            <button
              // onClick={handleRunSelectedTests}
              // disabled={filteredTests.length === 0 || allFilteredTestsRunning() || !secrets || secrets.length === 0}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150 disabled:bg-green-300 disabled:cursor-not-allowed"
              title="No tersts to run"
                // { !secrets || secrets.length === 0 ? "Test credentials required to run tests" :
                // filteredTests.length === 0 ? "No tests to run" :
                // allFilteredTestsRunning() ? "All visible tests are already running" :
                // "Run all non-running visible tests"
                // }
            >
              {/* {allFilteredTestsRunning() ? ( // Show spinner and 'Running...' only if ALL are running
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Running...
                </>
              ) : (
                <>
                  <Play size={18} className="mr-2" />
                  Run Tests
                </>
              )} */}
              <>
                <Play size={18} className="mr-2" />
                Run Tests
              </>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    // onClick={() => handleSort('latest_status')}
                  >
                    <div className="flex items-center">
                      Status
                      {/* {getSortIcon('latest_status')} */}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    // onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      {/* {getSortIcon('name')} */}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredTests.length > 0 ? (
                  filteredTests.map((test) => (
                    <tr
                      key={test.id}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedTestIds.has(test.id) ? 'bg-blue-50' : ''}`}
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
                        className={`text-green-600 hover:text-green-900 flex items-center ${runningTests[test.id] || !secrets || secrets.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!runningTests[test.id] && secrets && secrets.length > 0) {
                            handleRunSingleTest(test.id);
                          }
                        }}
                        title={!secrets || secrets.length === 0 ? "Test credentials required to run tests" : runningTests[test.id] ? `Test is ${formatStatus(RUNNING_STATUS)}` : `Run this test`}
                        disabled={runningTests[test.id] || !secrets || secrets.length === 0}
                      >
                        {runningTests[test.id] ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-1"></div>
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
                    <td colSpan="7" className="px-6 py-12 text-center text-lg text-gray-500">
                      {tests.length === 0 && selectedFeature === 'all' ? (
                        <div className="flex flex-col items-center">
                          <p>No features or tests found for this product.</p>
                          <p className="text-sm mt-2">Start by adding a Feature using the dropdown menu, then generate or add tests.</p>
                      </div>
                      ) : tests.length === 0 && selectedFeature !== 'all' ? (
                          <div className="flex flex-col items-center">
                              <p>No tests found for the selected feature.</p>
                              <p className="text-sm mt-2">Use "Generate Tests with AI" or "Add Test" to create some.</p>
                          </div>
                      ) : (
                        <div>
                          <p>No tests match the current filters.</p>
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedStatus('all');
                              setSelectedEpic('all');
                              setSelectedFeature('all');
                              fetchTestsByProduct(selectedProduct.id);
                            }}
                            className="text-blue-600 underline mt-2"
                          >
                            Clear all filters
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )} */}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-8 items-center">
        <p>Unlock all tests and enable continuous test monitoring by creating a free Solight account.</p>


        <button
          onClick={() => navigate("/register")}
          className="w-fit flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          Join Solight now !
        </button>
      </div>

      <hr className="w-full my-8 border"/>

      <div className="flex flex-col gap-4 mt-8 items-center">
        <p>Want to try generating tests for another URL ?</p>
        
        <button
          onClick={() => navigate("/demo")}
          className="w-fit flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          New tests generation
        </button>
      </div>
    </div>
  )
}