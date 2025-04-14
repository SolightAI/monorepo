import { useState } from 'react';
import { MAX_NAME_LENGTH } from '@/constants/validation';

/**
 * Custom hook for handling test form state and validation
 * @param {Object} initialData - Initial form data
 * @returns {Object} Form state and handlers
 */
const useTestForm = (initialData = {}) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '--',
    url: initialData.url || '',
    category: initialData.category || 'SMOKE',
    steps: initialData.steps || '',
    preconditions: initialData.preconditions || 'None',
    assertions: initialData.assertions || 'None',
    secret_ids: initialData.secret_ids || [],
    epic_id: initialData.epic_id || '',
    feature_id: initialData.feature_id || '',
    user_story_id: initialData.user_story_id || '',
    acceptance_criteria_id: initialData.acceptance_criteria_id || '',
    type: initialData.type || 'UserStory'
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSecretIds, setSelectedSecretIds] = useState(initialData.secret_ids || []);

  // Test categories from the backend schema
  const testCategories = [
    { id: "SMOKE", label: "Smoke" },
    { id: "NEGATIVE", label: "Negative path" },
    // { id: "FUNCTIONAL", label: "Functional" },
    // { id: "END_TO_END", label: "End to End" },
    // { id: "UNIT", label: "Unit" },
    // { id: "REGRESSION", label: "Regression" },
    // { id: "INTEGRATION", label: "Integration" },
    // { id: "PERFORMANCE", label: "Performance" },
    // { id: "USABILITY", label: "Usability" },
    // { id: "COMPATIBILITY", label: "Compatibility" },
    // { id: "LOCALIZATION", label: "Localization" },
  ];

  // Test types
  const testTypes = [
    { id: "UserStory", label: "User Story" },
    { id: "Feature", label: "Feature" },
    { id: "Epic", label: "Epic" },
  ];

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Update the form data based on the field that changed
    if (name === "type") {
      // When the test type changes, update the form data accordingly
      setFormData(prev => {
        const updates = { [name]: value };
        return { ...prev, ...updates };
      });
    } else if (name === "preconditions" || name === "assertions") {
      // Special handling for preconditions and assertions fields
      // If the field is empty, set it to the default "None" value
      setFormData(prev => ({
        ...prev,
        [name]: value.trim() === "" ? "None" : value
      }));
    } else {
      // Default handling for other fields
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSecretSelect = (secretIds, secrets) => {
    setSelectedSecretIds(secretIds);
    setFormData(prev => ({
      ...prev,
      secret_ids: secretIds
    }));
  };

  // Validate form data
  const validateForm = () => {
    // Validate form
    if (!formData.name.trim()) {
      setError('Test name is required');
      return false;
    }

    if (formData.name.length > MAX_NAME_LENGTH) {
      setError(`Test name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      return false;
    }

    if (!formData.url.trim()) {
      setError('URL is required');
      return false;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }

    return true;
  };

  return {
    formData,
    setFormData,
    error,
    setError,
    isSubmitting,
    setIsSubmitting,
    selectedSecretIds,
    setSelectedSecretIds,
    testCategories,
    testTypes,
    handleChange,
    handleSecretSelect,
    validateForm
  };
};

export default useTestForm;
