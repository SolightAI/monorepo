import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, ArrowLeft, TestTube, Plus, CheckCircle, XCircle, Sparkles, CheckSquare, List } from 'lucide-react';
import AddTestModal from '@/components/modals/AddTestModal';
import TestGenerationStatusModal from '@/components/modals/TestGenerationStatusModal';
import TestDetailsModal from '@/components/modals/TestDetailsModal';
import AddUserStoryModal from '@/components/modals/AddUserStoryModal';
import { triggerFeatureTestGeneration } from '@/services/testService';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const FeatureDetails = () => {
  const { featureId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feature, setFeature] = useState(null);
  const [generatingTest, setGeneratingTest] = useState(false);
  const [userStories, setUserStories] = useState([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState([]);

  // State for Add Test Modal
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false);

  // State for Test Generation Status Modal
  const [isTestGenerationModalOpen, setIsTestGenerationModalOpen] = useState(false);
  const [testGenerationTaskId, setTestGenerationTaskId] = useState(null);

  // State for Test Details Modal
  const [isTestDetailsModalOpen, setIsTestDetailsModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  // State for Add User Story Modal
  const [isAddUserStoryModalOpen, setIsAddUserStoryModalOpen] = useState(false);

  // State for Add Acceptance Criteria Modal
  const [isAddCriteriaModalOpen, setIsAddCriteriaModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchFeatureDetails();
  }, [featureId]);

  const fetchFeatureDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch feature details
      const featureResponse = await axios.get(`${API_URL}/features/${featureId}`, {
        withCredentials: true
      });

      // Fetch tests by feature
      const testsResponse = await axios.get(`${API_URL}/tests/by-feature/${featureId}`, {
        withCredentials: true
      });

      // Fetch acceptance criteria for this feature
      const criteriaResponse = await axios.get(`${API_URL}/acceptance-criteria/by-feature/${featureId}`, {
        withCredentials: true
      });

      // Combine feature data with tests
      const featureData = featureResponse.data;
      featureData.tests = testsResponse.data;
      
      // Set user stories from the feature data
      if (featureData.user_stories) {
        setUserStories(featureData.user_stories);
      }

      // Set acceptance criteria
      setAcceptanceCriteria(criteriaResponse.data);

      setFeature(featureData);
    } catch (err) {
      console.error('Error fetching feature details:', err);
      setError('Failed to fetch feature details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle test added
  const handleTestAdded = async (newTest) => {
    console.log("Test added:", newTest);

    try {
      // Make API call to save the test
      const response = await axios.post(
        `${API_URL}/tests/`,
        { 
          ...newTest,
          feature_id: featureId 
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Test saved to API:", response.data);

      // Update the feature state with the response data from the API
      setFeature(prevFeature => ({
        ...prevFeature,
        tests: [...(prevFeature.tests || []), response.data]
      }));
    } catch (err) {
      console.error('Error saving test:', err);
      // Could add error state and show error message to user here
    }

    // Ensure modal is closed
    setIsAddTestModalOpen(false);
  };

  // Handle user story added
  const handleUserStoryAdded = (newUserStory) => {
    // Update the user stories state with the new user story
    setUserStories(prevUserStories => [...prevUserStories, newUserStory]);
  };

  // Handle acceptance criteria added
  const handleCriteriaAdded = (newCriteria) => {
    // Update the acceptance criteria state with the new criteria
    setAcceptanceCriteria(prevCriteria => [...prevCriteria, newCriteria]);
    
    // Also update the feature state if needed
    setFeature(prevFeature => {
      if (!prevFeature) return prevFeature;
      
      const updatedFeature = {...prevFeature};
      if (!updatedFeature.acceptance_criteria) {
        updatedFeature.acceptance_criteria = [];
      }
      updatedFeature.acceptance_criteria.push(newCriteria);
      return updatedFeature;
    });
  };

  // Handle AI test generation
  const handleGenerateTest = async () => {
    try {
      setGeneratingTest(true);
      setError(null);

      // Call the test generation API for the feature
      const taskId = await triggerFeatureTestGeneration(featureId);

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

  // Handle test click to open details modal
  const handleTestClick = (test) => {
    setSelectedTest(test);
    setIsTestDetailsModalOpen(true);
  };

  const handleGenerationComplete = () => {
    // Refresh feature data to get the newly generated tests
    fetchFeatureDetails();
    setIsTestGenerationModalOpen(false);
  };

  // Create a function to add an acceptance criteria to the feature
  const handleAddAcceptanceCriteria = async () => {
    setIsAddCriteriaModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(`/epics/${feature?.epic_id}`)}
          className="flex items-center mb-6 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Epic
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
            {/* Feature header */}
            {feature && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center mb-4">
                  <TestTube size={24} className="text-purple-500 mr-3" />
                  <h1 className="text-3xl font-bold text-gray-800">{feature.name}</h1>
                </div>
                <p className="text-gray-700 mb-4">{feature.description}</p>
                {feature.urls && feature.urls.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">URLs:</h3>
                    <ul className="list-disc pl-5">
                      {feature.urls.map((url, index) => (
                        <li key={index} className="text-blue-600 hover:underline">
                          <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* User Stories section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">User Stories</h2>
                <button
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                  onClick={() => setIsAddUserStoryModalOpen(true)}
                >
                  <Plus size={18} className="mr-2" />
                  Add User Story
                </button>
              </div>

              {!userStories || userStories.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No user stories found for this feature</p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                    onClick={() => setIsAddUserStoryModalOpen(true)}
                  >
                    Create your first user story
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userStories.map((story) => (
                    <div
                      key={story.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => navigate(`/user-stories/${story.id}`)}
                    >
                      <div className="flex items-start">
                        <CheckSquare size={20} className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-800 mb-1">{story.name}</h3>
                          {story.description && (
                            <p className="text-gray-600 mb-2">{story.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acceptance Criteria section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Acceptance Criteria</h2>
                <button
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                  onClick={handleAddAcceptanceCriteria}
                >
                  <Plus size={18} className="mr-2" />
                  Add Acceptance Criteria
                </button>
              </div>

              {!acceptanceCriteria || acceptanceCriteria.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No acceptance criteria found for this feature</p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                    onClick={handleAddAcceptanceCriteria}
                  >
                    Create your first acceptance criteria
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {acceptanceCriteria.map((criteria) => (
                    <div
                      key={criteria.id}
                      onClick={() => navigate(`/acceptance-criteria/${criteria.id}`)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start">
                        <CheckSquare size={20} className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-800 mb-1">{criteria.name}</h3>
                          <p className="text-gray-600 mb-2">{criteria.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

              {!feature?.tests || feature.tests.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No tests found for this feature</p>
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
                      {feature.tests.map((test) => (
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
          defaultUrl={feature?.urls?.[0] || ''}
        />
      )}

      {/* Test Generation Status Modal */}
      {isTestGenerationModalOpen && (
        <TestGenerationStatusModal
          onClose={handleGenerationComplete}
          taskId={testGenerationTaskId}
        />
      )}

      {/* Test Details Modal */}
      {isTestDetailsModalOpen && selectedTest && (
        <TestDetailsModal
          onClose={() => setIsTestDetailsModalOpen(false)}
          test={selectedTest}
          onTestUpdated={fetchFeatureDetails}
        />
      )}

      {/* Add User Story Modal */}
      {isAddUserStoryModalOpen && feature && (
        <AddUserStoryModal
          onClose={() => setIsAddUserStoryModalOpen(false)}
          featureId={featureId}
          featureName={feature.name}
          onUserStoryAdded={handleUserStoryAdded}
        />
      )}

      {/* Add Acceptance Criteria Modal */}
      {isAddCriteriaModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  Add Acceptance Criteria
                </h2>
                <button
                  onClick={() => setIsAddCriteriaModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <p className="text-gray-600 mb-2">
                For feature:
              </p>
              <p className="font-medium text-gray-800 mb-6">
                {feature?.name}
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
                  <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-1" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const name = formData.get('name');
                const description = formData.get('description');
                
                if (!name || !description) {
                  setError('Name and description are required');
                  return;
                }
                
                try {
                  // Create the acceptance criteria via API
                  const response = await axios.post(
                    `${API_URL}/acceptance-criteria/`,
                    {
                      name,
                      description,
                      feature_id: featureId
                    },
                    { withCredentials: true }
                  );
                  
                  // Update the state with the new criteria
                  handleCriteriaAdded(response.data);
                  
                  // Close the modal
                  setIsAddCriteriaModalOpen(false);
                } catch (err) {
                  console.error('Error creating acceptance criteria:', err);
                  setError('Failed to create acceptance criteria. Please try again.');
                }
              }}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter a concise name for this criteria"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Example: "Email Confirmation"
                  </p>
                </div>

                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows="4"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe a specific condition that must be met for the feature to be considered complete"
                    required
                  ></textarea>
                  <p className="mt-2 text-sm text-gray-500">
                    Good example: "User receives an email confirmation after successful registration"
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddCriteriaModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Acceptance Criteria
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureDetails;
