import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, ArrowLeft, TestTube, Plus, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import AddTestModal from '@/components/modals/AddTestModal';
import TestGenerationStatusModal from '@/components/modals/TestGenerationStatusModal';
import TestDetailsModal from '@/components/modals/TestDetailsModal';
import { triggerTestGeneration } from '@/services/testService';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const AcceptanceCriteriaDetails = () => {
  const { criteriaId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [criteria, setCriteria] = useState(null);
  const [generatingTest, setGeneratingTest] = useState(false);

  // State for Add Test Modal
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false);

  // State for Test Generation Status Modal
  const [isTestGenerationModalOpen, setIsTestGenerationModalOpen] = useState(false);
  const [testGenerationTaskId, setTestGenerationTaskId] = useState(null);

  // State for Test Details Modal
  const [isTestDetailsModalOpen, setIsTestDetailsModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchCriteriaDetails();
  }, [criteriaId]);

  const fetchCriteriaDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/acceptance-criteria/${criteriaId}`, {
        withCredentials: true
      });

      setCriteria(response.data);
    } catch (err) {
      console.error('Error fetching acceptance criteria details:', err);
      setError('Failed to fetch acceptance criteria details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle test added
  const handleTestAdded = async (newTest) => {
    console.log("Test added:", newTest);

    try {
      // No need to convert strings to arrays, just use the strings directly
      console.log("Sending to API:", newTest);

      // Make API call to save the test
      const response = await axios.post(
        `${API_URL}/tests/`,
        newTest,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Test saved to API:", response.data);

      // Update the criteria state with the response data from the API
      setCriteria(prevCriteria => ({
        ...prevCriteria,
        tests: [...(prevCriteria.tests || []), response.data]
      }));
    } catch (err) {
      console.error('Error saving test:', err);
      // Could add error state and show error message to user here
    }

    // Ensure modal is closed
    setIsAddTestModalOpen(false);
  };

  // Handle AI test generation
  const handleGenerateTest = async () => {
    try {
      setGeneratingTest(true);
      setError(null);

      // Call the test generation API
      const taskId = await triggerTestGeneration(criteriaId);

      // Set the task ID and open the status modal
      setTestGenerationTaskId(taskId);
      setIsTestGenerationModalOpen(true);
    } catch (err) {
      console.error('Error triggering test generation:', err);
      setError('Failed to trigger test generation. Please try again.');
    } finally {
      setGeneratingTest(false);
    }
  };

  const getTestStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'FAILED':
        return <XCircle size={20} className="text-red-500" />;
      case 'IN_PROGRESS':
        return <Loader size={20} className="text-yellow-500" />;
      case 'NOT_STARTED':
        return <TestTube size={20} className="text-gray-400" />;
      default:
        return <TestTube size={20} className="text-gray-400" />;
    }
  };

  const getTestStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'NOT_STARTED':
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString();
  };

  const getDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Handle test click to open details modal
  const handleTestClick = (test) => {
    setSelectedTest(test);
    setIsTestDetailsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(`/user-stories/${criteria?.user_story_id}`)}
          className="flex items-center mb-6 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to User Story
        </button>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
            <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-1" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading indicator */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader size={40} className="text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Acceptance Criteria header */}
            {criteria && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center mb-4">
                  <TestTube size={24} className="text-purple-500 mr-3" />
                  <h1 className="text-3xl font-bold text-gray-800">{criteria.name}</h1>
                </div>
                <p className="text-gray-700 mb-4">{criteria.description}</p>
              </div>
            )}

            {/* Tests section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Tests</h2>
                <div className="flex space-x-3">
                  <button
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                    onClick={handleGenerateTest}
                    disabled={generatingTest}
                  >
                    <Sparkles size={18} className="mr-2" />
                    {generatingTest ? 'Generating...' : 'Generate Test with AI'}
                  </button>
                  <button
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                    onClick={() => setIsAddTestModalOpen(true)}
                  >
                    <Plus size={18} className="mr-2" />
                    Add Test Manually
                  </button>
                </div>
              </div>

              {!criteria?.tests || criteria.tests.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No tests found for this acceptance criteria</p>
                  <div className="flex justify-center space-x-4">
                    <button
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                      onClick={handleGenerateTest}
                      disabled={generatingTest}
                    >
                      <Sparkles size={18} className="mr-2" />
                      {generatingTest ? 'Generating...' : 'Generate Test with AI'}
                    </button>
                    <button
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                      onClick={() => setIsAddTestModalOpen(true)}
                    >
                      <Plus size={18} className="mr-2" />
                      Create Test Manually
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {criteria.tests.map((test, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer hover:shadow-md"
                      onClick={() => handleTestClick(test)}
                    >
                      {/* Header section with status and category */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          {getTestStatusIcon(test.status)}
                          <h3 className="text-lg font-medium text-gray-800 ml-3">{test.name}</h3>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTestStatusColor(test.status)}`}>
                            {test.status || 'Not Started'}
                          </span>
                          {test.category && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              {test.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {test.description && (
                        <p className="text-gray-600 mb-3">{test.description}</p>
                      )}

                      {/* Endpoint */}
                      {test.url && (
                        <div className="mb-4">
                          <span className="text-gray-500">Endpoint:</span>
                          <a
                            href={test.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()} // Prevent the parent click event when clicking the link
                          >
                            {test.url}
                          </a>
                        </div>
                      )}

                      {/* Test details grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Timing information */}
                        <div className="space-y-2">
                          {test.started_at && (
                            <div className="text-sm">
                              <span className="text-gray-500">Started:</span>
                              <span className="ml-2 text-gray-700">{formatDateTime(test.started_at)}</span>
                            </div>
                          )}
                          {test.ended_at && (
                            <div className="text-sm">
                              <span className="text-gray-500">Ended:</span>
                              <span className="ml-2 text-gray-700">{formatDateTime(test.ended_at)}</span>
                            </div>
                          )}
                          {test.started_at && test.ended_at && (
                            <div className="text-sm">
                              <span className="text-gray-500">Duration:</span>
                              <span className="ml-2 text-gray-700">{getDuration(test.started_at, test.ended_at)}</span>
                            </div>
                          )}

                          {/* Display Secret Information */}
                          {test.secret && (
                            <div className="text-sm mt-2">
                              <span className="text-gray-500">Secret:</span>
                              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                {test.secret.name} ({test.secret.type.replace('_', ' ')})
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bugs */}
                        <div>
                          {test.bugs && test.bugs.length > 0 && (
                            <div className="text-sm">
                              <span className="text-gray-500">Bugs:</span>
                              <div className="mt-1">
                                {test.bugs.map((bug, bugIndex) => (
                                  <div
                                    key={bugIndex}
                                    className="inline-flex items-center px-2 py-1 mr-2 mb-2 rounded bg-red-50 text-red-700 text-xs"
                                  >
                                    <XCircle size={12} className="mr-1" />
                                    {bug.name || bug}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Preview of test steps */}
                      {test.steps && (
                        <div className="mt-4">
                          <div className="text-sm font-medium text-gray-700 mb-2">Test Steps Preview:</div>
                          <div className="p-2 bg-gray-50 rounded-lg overflow-hidden">
                            <p className="text-sm line-clamp-2">{test.steps}</p>
                          </div>
                          <div className="mt-2 text-blue-600 text-sm flex justify-end">
                            Click to view full details
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Test Modal */}
      {isAddTestModalOpen && (
        <AddTestModal
          onClose={() => setIsAddTestModalOpen(false)}
          onAddTest={handleTestAdded}
          criteriaId={criteriaId}
        />
      )}

      {/* Test Generation Status Modal */}
      {isTestGenerationModalOpen && testGenerationTaskId && (
        <TestGenerationStatusModal
          onClose={() => {
            setIsTestGenerationModalOpen(false);
            // Refresh the criteria details to show the newly generated test
            fetchCriteriaDetails();
          }}
          taskId={testGenerationTaskId}
        />
      )}

      {/* Test Details Modal */}
      {isTestDetailsModalOpen && selectedTest && (
        <TestDetailsModal
          test={selectedTest}
          onClose={() => {
            setIsTestDetailsModalOpen(false);
            setSelectedTest(null);
          }}
        />
      )}
    </div>
  );
};

export default AcceptanceCriteriaDetails;
