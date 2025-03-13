import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, ArrowLeft, CheckSquare, Plus } from 'lucide-react';
import AddAcceptanceCriteriaModal from '@/components/modals/AddAcceptanceCriteriaModal';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const UserStoryDetails = () => {
  const { storyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [story, setStory] = useState(null);

  // State for Add Acceptance Criteria Modal
  const [isAddCriteriaModalOpen, setIsAddCriteriaModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchStoryDetails();
  }, [storyId]);

  const fetchStoryDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/user-stories/${storyId}`, {
        withCredentials: true
      });

      setStory(response.data);
    } catch (err) {
      console.error('Error fetching user story details:', err);
      setError('Failed to fetch user story details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle acceptance criteria added
  const handleCriteriaAdded = (newCriteria) => {
    // Update the story state with the new acceptance criteria
    setStory(prevStory => ({
      ...prevStory,
      acceptance_criteria: [...(prevStory.acceptance_criteria || []), newCriteria]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(`/features/${story?.feature_id}`)}
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
            {/* User Story header */}
            {story && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center mb-4">
                  <CheckSquare size={24} className="text-green-500 mr-3" />
                  <h1 className="text-3xl font-bold text-gray-800">{story.title}</h1>
                </div>
                {story.description && (
                  <p className="text-gray-700 mb-4">{story.description}</p>
                )}
                <div className="mt-4">
                  <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                    story.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    story.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {story.status || 'Not Started'}
                  </span>
                </div>
              </div>
            )}

            {/* Acceptance Criteria section */}
            <div className="bg-white rounded-lg shadow-md p-6">
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

              {!story?.acceptance_criteria || story.acceptance_criteria.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No acceptance criteria found for this user story</p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                    onClick={() => setIsAddCriteriaModalOpen(true)}
                  >
                    Create your first acceptance criteria
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {story.acceptance_criteria.map((criteria, index) => (
                    <div
                      key={index}
                      onClick={() => navigate(`/acceptance-criteria/${criteria.id}`)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start">
                        <CheckSquare size={20} className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-800 mb-1">{criteria.title}</h3>
                          <p className="text-gray-600 mb-2">{criteria.description}</p>
                          {criteria.tests_count > 0 && (
                            <p className="text-sm text-gray-500">
                              {criteria.tests_count} test{criteria.tests_count !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Acceptance Criteria Modal */}
      {isAddCriteriaModalOpen && story && (
        <AddAcceptanceCriteriaModal
          onClose={() => setIsAddCriteriaModalOpen(false)}
          userStoryId={storyId}
          userStoryTitle={story.title}
          onCriteriaAdded={handleCriteriaAdded}
        />
      )}
    </div>
  );
};

export default UserStoryDetails;
