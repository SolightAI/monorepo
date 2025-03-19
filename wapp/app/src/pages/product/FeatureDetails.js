import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, Plus, ArrowLeft, FileText, ExternalLink, CheckSquare, Beaker } from 'lucide-react';
import AddUserStoryModal from '@/components/modals/AddUserStoryModal';
import AddAcceptanceCriteriaModal from '@/components/modals/AddAcceptanceCriteriaModal';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const FeatureDetails = () => {
  const { featureId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feature, setFeature] = useState(null);

  // State for Modals
  const [isAddUserStoryModalOpen, setIsAddUserStoryModalOpen] = useState(false);
  const [isAddCriteriaModalOpen, setIsAddCriteriaModalOpen] = useState(false);

  const navigate = useNavigate();

  // Fetch feature details
  useEffect(() => {
    fetchFeatureDetails();
  }, [featureId]);

  const fetchFeatureDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get the feature details (which includes user stories, acceptance criteria, and tests)
      const featureResponse = await axios.get(`${API_URL}/features/${featureId}`, {
        withCredentials: true
      });

      setFeature(featureResponse.data);
    } catch (err) {
      console.error('Error fetching feature details:', err);
      setError('Failed to fetch feature details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle user story added
  const handleUserStoryAdded = (newUserStory) => {
    // Update the feature state with the new user story
    setFeature(prevFeature => ({
      ...prevFeature,
      user_stories: [...(prevFeature.user_stories || []), newUserStory]
    }));
  };

  // Handle acceptance criteria added
  const handleCriteriaAdded = (newCriteria) => {
    // Update the feature state with the new acceptance criteria
    setFeature(prevFeature => ({
      ...prevFeature,
      acceptance_criteria: [...(prevFeature.acceptance_criteria || []), newCriteria]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back button to return to epic */}
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
                  <FileText size={24} className="text-blue-500 mr-3" />
                  <h1 className="text-3xl font-bold text-gray-800">{feature.name}</h1>
                </div>
                {feature.description && (
                  <p className="text-gray-700 mb-4">{feature.description}</p>
                )}
                {feature.urls && feature.urls.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Related URLs:</h3>
                    <div className="flex flex-col gap-2">
                      {feature.urls.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink size={14} className="mr-1" />
                          <span className="text-sm">{url}</span>
                        </a>
                      ))}
                    </div>
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

              {!feature?.user_stories || feature.user_stories.length === 0 ? (
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {feature.user_stories.map((story) => (
                        <tr
                          key={story.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/user-stories/${story.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{story.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 truncate max-w-xs">{story.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              story.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              story.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {story.status || 'Not Started'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Acceptance Criteria section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Acceptance Criteria</h2>
                <button
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                  onClick={() => setIsAddCriteriaModalOpen(true)}
                >
                  <Plus size={18} className="mr-2" />
                  Add Acceptance Criteria
                </button>
              </div>

              {!feature?.acceptance_criteria || feature.acceptance_criteria.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No acceptance criteria found for this feature</p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                    onClick={() => setIsAddCriteriaModalOpen(true)}
                  >
                    Create your first acceptance criteria
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {feature.acceptance_criteria.map((criteria, index) => (
                    <div
                      key={index}
                      onClick={() => navigate(`/acceptance-criteria/${criteria.id}`)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start">
                        <CheckSquare size={20} className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-800 mb-1">{criteria.name}</h3>
                          <p className="text-gray-600 mb-2">{criteria.description}</p>
                          {criteria.tests && criteria.tests.length > 0 && (
                            <p className="text-sm text-gray-500">
                              {criteria.tests.length} test{criteria.tests.length !== 1 ? 's' : ''}
                            </p>
                          )}
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
              </div>

              {!feature?.tests || feature.tests.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No tests found for this feature</p>
                  <p className="text-sm text-gray-500">
                    Add tests by generating them from acceptance criteria or creating them manually via the API.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {feature.tests.map((test) => (
                        <tr
                          key={test.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/tests/${test.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Beaker size={16} className="text-purple-500 mr-2" />
                              <div className="text-sm font-medium text-gray-900">{test.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {test.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              test.status === 'PASSED' ? 'bg-green-100 text-green-800' :
                              test.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                              test.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {test.status}
                            </span>
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
      {isAddCriteriaModalOpen && feature && (
        <AddAcceptanceCriteriaModal
          onClose={() => setIsAddCriteriaModalOpen(false)}
          featureId={featureId}
          featureTitle={feature.name}
          onCriteriaAdded={handleCriteriaAdded}
        />
      )}
    </div>
  );
};

export default FeatureDetails;
