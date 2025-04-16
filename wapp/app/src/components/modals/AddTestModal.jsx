import { useState, useEffect } from "react"
import axios from "axios"
import { getModalContainerProps, getModalContentProps } from '@/utils/modalUtils';
import useTestForm from '@/hooks/useTestForm';
import TestForm from '@/components/forms/TestForm';
import { API_URL } from '@/constants/api';

function AddTestModal({ onClose, onAddTest, criteriaId }) {
  // Real data states for context
  const [epic, setEpic] = useState(null);
  const [feature, setFeature] = useState(null);
  const [userStory, setUserStory] = useState(null);
  const [loading, setLoading] = useState(false);

  // Use our custom hook for form state management
  const {
    formData,
    setFormData,
    error,
    setError,
    isSubmitting,
    selectedSecretIds,
    testCategories,
    handleChange,
    handleSecretSelect,
    validateForm
  } = useTestForm({
    acceptance_criteria_id: criteriaId,
    type: "UserStory", // Default to UserStory since we're in an acceptance criteria
  });

  // Fetch the context info for the acceptance criteria
  useEffect(() => {
    const fetchContextInfo = async () => {
      if (!criteriaId) return;

      try {
        setLoading(true);

        // First, get the acceptance criteria to find its user story
        const criteriaResponse = await axios.get(`${API_URL}/acceptance-criteria/${criteriaId}`, {
          withCredentials: true
        });

        const userStoryId = criteriaResponse.data.user_story_id;
        if (!userStoryId) {
          throw new Error("Could not determine the user story for this acceptance criteria");
        }

        // Get user story details
        const userStoryResponse = await axios.get(`${API_URL}/user-stories/${userStoryId}`, {
          withCredentials: true
        });
        setUserStory(userStoryResponse.data);

        const featureId = userStoryResponse.data.feature_id;
        if (!featureId) {
          throw new Error("Could not determine the feature for this user story");
        }

        // Get feature details
        const featureResponse = await axios.get(`${API_URL}/features/${featureId}`, {
          withCredentials: true
        });
        setFeature(featureResponse.data);

        const epicId = featureResponse.data.epic_id;
        if (!epicId) {
          throw new Error("Could not determine the epic for this feature");
        }

        // Get epic details
        const epicResponse = await axios.get(`${API_URL}/epics/${epicId}`, {
          withCredentials: true
        });
        setEpic(epicResponse.data);

        // Set the form data with the context info
        setFormData(prev => ({
          ...prev,
          user_story_id: userStoryId,
          feature_id: featureId,
          epic_id: epicId
        }));

      } catch (err) {
        console.error("Error fetching context info:", err);
        setError(err.message || "Failed to load context data");
      } finally {
        setLoading(false);
      }
    };

    fetchContextInfo();
  }, [criteriaId, setFormData, setError]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted");

    // Validate the form
    if (!validateForm()) {
      return;
    }

    // Create the test object with string fields (not arrays)
    let testData = {
      name: formData.name,
      description: formData.description,
      url: formData.url,
      category: formData.category,
      steps: formData.steps || "None",
      preconditions: formData.preconditions || "None",
      assertions: formData.assertions || "None",
      secret_ids: formData.secret_ids
    };

    // Add the appropriate ID based on test type
    if (formData.type === "UserStory") {
      testData.user_story_id = formData.user_story_id;
    } else if (formData.type === "Feature") {
      testData.feature_id = formData.feature_id;
    } else if (formData.type === "Epic") {
      testData.epic_id = formData.epic_id;
    }

    // Add the acceptance criteria ID since we're in the acceptance criteria context
    testData.acceptance_criteria_id = criteriaId;

    console.log("Calling onAddTest with:", testData);
    onAddTest(testData);
    console.log("Calling onClose");
    onClose();
    console.log("Modal should be closed now");
  };

  return (
    <div {...getModalContainerProps(onClose)}>
      <div {...getModalContentProps('max-w-2xl w-full')}>
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Add New Test</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <TestForm
            formData={formData}
            error={error}
            isSubmitting={isSubmitting}
            testCategories={testCategories}
            handleChange={handleChange}
            handleSecretSelect={handleSecretSelect}
            selectedSecretIds={selectedSecretIds}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitButtonText="Add Test"
            contextInfo={{ userStory, feature, epic }}
          />
        )}
      </div>
    </div>
  );
}

export default AddTestModal
