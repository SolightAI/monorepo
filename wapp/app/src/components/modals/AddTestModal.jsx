import { useState, useEffect } from "react"
import axios from "axios"

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function AddTestModal({ onClose, onAddTest, criteriaId }) {
  // Real data states
  const [epic, setEpic] = useState(null);
  const [feature, setFeature] = useState(null);
  const [userStory, setUserStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    category: "FUNCTIONAL",
    type: "UserStory", // Default to UserStory since we're in an acceptance criteria
    steps: "",
    epic_id: "",
    feature_id: "",
    user_story_id: "",
    acceptance_criteria_id: criteriaId
  });

  // Test categories from the backend schema
  const testCategories = [
    { id: "SMOKE", label: "Smoke" },
    { id: "FUNCTIONAL", label: "Functional" },
    { id: "END_TO_END", label: "End to End" },
    { id: "UNIT", label: "Unit" },
    { id: "REGRESSION", label: "Regression" },
    { id: "INTEGRATION", label: "Integration" },
    { id: "PERFORMANCE", label: "Performance" },
    { id: "USABILITY", label: "Usability" },
    { id: "COMPATIBILITY", label: "Compatibility" },
    { id: "LOCALIZATION", label: "Localization" },
  ];

  // Test types
  const testTypes = [
    { id: "UserStory", label: "User Story" },
    { id: "Feature", label: "Feature" },
    { id: "Epic", label: "Epic" },
  ];

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
  }, [criteriaId]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Update the form data based on the field that changed
    if (name === "type") {
      // When the test type changes, update the form data accordingly
      setFormData(prev => {
        const updates = { [name]: value };
        
        if (value === "Epic" && epic) {
          updates.epic_id = epic.id;
          updates.feature_id = "";
          updates.user_story_id = "";
        } else if (value === "Feature" && feature) {
          updates.epic_id = epic?.id || "";
          updates.feature_id = feature.id;
          updates.user_story_id = "";
        } else if (value === "UserStory" && userStory) {
          updates.epic_id = epic?.id || "";
          updates.feature_id = feature?.id || "";
          updates.user_story_id = userStory.id;
        }
        
        return { ...prev, ...updates };
      });
    } else {
      // Default handling for other fields
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted");

    // Convert steps string to array
    const stepsArray = formData.steps
      .split("\n")
      .filter((step) => step.trim() !== "")
      .map((step) => step.trim());

    // Create the test object based on the selected type
    let testData = {
      name: formData.name,
      description: formData.description,
      url: formData.url,
      category: formData.category,
      steps: stepsArray,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Add New Test</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center p-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
              {/* Context information display */}
              {userStory && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    Adding test for: <span className="font-semibold">{userStory.title}</span>
                  </p>
                  {feature && (
                    <p className="text-xs text-blue-600 mt-1">
                      Feature: {feature.name}
                    </p>
                  )}
                  {epic && (
                    <p className="text-xs text-blue-600">
                      Epic: {epic.name}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Test Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter test name"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the purpose of this test"
                />
              </div>

              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                  URL *
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="https://example.com/page-to-test"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {testCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md mr-2"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 bg-black text-white rounded-md"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Add Test'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AddTestModal
