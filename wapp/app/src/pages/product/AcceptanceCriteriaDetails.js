import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, ArrowLeft, TestTube, Plus, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import AddTestModal from '@/components/modals/AddTestModal';
import TestDetailsModal from '@/components/modals/TestDetailsModal';
import GenerationModal from '@/components/modals/GenerationModal';
import { triggerFeatureTestGeneration } from '@/services/testService';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const AcceptanceCriteriaDetails = () => {
  const { criteriaId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [criteria, setCriteria] = useState(null);
  const [generatingTest, setGeneratingTest] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);

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
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [criteriaId]);

  // Add polling effect for test generation status
  useEffect(() => {
    if (isTestGenerationModalOpen && testGenerationTaskId) {
      const interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API_URL}/tests/generation/status/${testGenerationTaskId}`, {
            withCredentials: true
          });

          if (response.data.status === 'completed') {
            // Add a delay before fetching the updated data
            await new Promise(resolve => setTimeout(resolve, 2000));
            await fetchCriteriaDetails();
            setIsTestGenerationModalOpen(false);
            setTestGenerationTaskId(null);
            clearInterval(interval);
          } else if (response.data.status === 'error') {
            setError('Test generation failed. Please try again.');
            setIsTestGenerationModalOpen(false);
            setTestGenerationTaskId(null);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Error checking test generation status:', err);
          setError('Failed to check test generation status.');
          setIsTestGenerationModalOpen(false);
          setTestGenerationTaskId(null);
          clearInterval(interval);
        }
      }, 3000); // Poll every 3 seconds

      setPollingInterval(interval);
      return () => clearInterval(interval);
    }
  }, [isTestGenerationModalOpen, testGenerationTaskId]);

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
      // Add the feature_id from the acceptance criteria
      const testWithFeatureId = {
        ...newTest,
        feature_id: criteria.feature_id
      };

      console.log("Sending to API:", testWithFeatureId);

      // Make API call to save the test
      const response = await axios.post(
        `${API_URL}/tests/`,
        testWithFeatureId,
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

      if (!criteria || !criteria.feature_id) {
        throw new Error("Cannot generate tests: Feature ID not available");
      }

      // Call the test generation API using the feature_id
      const taskId = await triggerFeatureTestGeneration(criteria.feature_id);

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
      case 'PENDING':
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
      case 'PENDING':
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

  const handleGenerationComplete = () => {
    // Refresh criteria data to get the newly generated tests
    fetchCriteriaDetails();
    setIsTestGenerationModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(`/features/${criteria?.feature_id}`)}
          className="flex items-center mb-6 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Feature
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
                    {generatingTest ? 'Generating...' : 'Generate Tests with AI'}
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
                      {generatingTest ? 'Generating...' : 'Generate Tests with AI'}
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Run</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {criteria.tests.map((test) => (
                        <tr
                          key={test.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleTestClick(test)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getTestStatusIcon(test.status)}
                              <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTestStatusColor(test.status)}`}>
                                {test.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{test.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{test.category}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(test.ended_at) || 'Never run'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
          onTestAdded={handleTestAdded}
          defaultUrl={criteria?.url || ''}
        />
      )}

      {/* Test Generation Status Modal */}
      {isTestGenerationModalOpen && (
        <GenerationModal
          onClose={handleGenerationComplete}
          type="tests"
          featureName={criteria?.name || ''}
        />
      )}

      {/* Test Details Modal */}
      {isTestDetailsModalOpen && selectedTest && (
        <TestDetailsModal
          onClose={() => setIsTestDetailsModalOpen(false)}
          test={selectedTest}
          onTestUpdated={fetchCriteriaDetails}
        />
      )}
    </div>
  );
};

export default AcceptanceCriteriaDetails;
