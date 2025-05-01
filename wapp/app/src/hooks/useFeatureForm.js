import { useState } from 'react';
import { isValidUrl } from '@/utils/urlUtils';
import { MAX_NAME_LENGTH } from '@/constants/validation';

/**
 * Custom hook for handling feature form state and validation
 * @param {Object} [initialData={}] - Initial form data (optional)
 * @returns {Object} Form state and handlers
 */
export const useFeatureForm = (initialData = {}) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    url: (initialData.urls && initialData.urls.length > 0) ? initialData.urls[0] : (initialData.url || ''),
    access_conditions: initialData.access_conditions || { must_be_logged_in: true }
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    url: false
  });

  // Calculate if the name part of the form is valid
  const isNameValid = formData.name.trim() !== '' && formData.name.length <= MAX_NAME_LENGTH;

  // Calculate if the URL part of the form is valid (allows empty string initially)
  const isUrlValid = formData.url.trim() === '' || isValidUrl(formData.url);

  // Calculate if the entire form is valid for submission
  const isFormValid = () => {
    // Use the individual validity checks and ensure URL is not empty and is valid
    return isNameValid && formData.url.trim() !== '' && isValidUrl(formData.url);
  };

  // Handle input change for name and description
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Mark field as touched
    if (!touched[name]) {
      setTouched({
        ...touched,
        [name]: true
      });
    }
  };

  // Handle URL input change
  const handleUrlChange = (e) => {
    const { value } = e.target;
    setFormData({
      ...formData,
      url: value
    });

    // Mark url field as touched
    if (!touched.url) {
      setTouched({
        ...touched,
        url: true
      });
    }
  };

  // Handle checkbox change for login requirement
  const handleLoginRequirementChange = (e) => {
    setFormData({
      ...formData,
      access_conditions: {
        ...formData.access_conditions,
        must_be_logged_in: e.target.checked
      }
    });
  };

  // Validate form data before submission
  const validateForm = () => {
    setError(''); // Clear previous errors

    // Validate name
    if (!formData.name.trim()) {
      setError('Feature name is required');
      setTouched(prev => ({ ...prev, name: true }));
      return false;
    }
    if (formData.name.length > MAX_NAME_LENGTH) {
      setError(`Feature name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      setTouched(prev => ({ ...prev, name: true }));
      return false;
    }

    // Validate URL
    if (!formData.url.trim()) {
      setError('URL is required');
      setTouched(prev => ({ ...prev, url: true }));
      return false;
    }
    if (!isValidUrl(formData.url)) {
      setError('Please enter a valid URL (e.g., https://example.com)');
      setTouched(prev => ({ ...prev, url: true }));
      return false;
    }

    return true; // Form is valid
  };

  return {
    formData,
    setFormData,
    error,
    setError,
    isSubmitting,
    setIsSubmitting,
    touched,
    setTouched,
    isFormValid,
    isNameValid,
    isUrlValid,
    handleInputChange,
    handleUrlChange,
    handleLoginRequirementChange,
    validateForm
  };
};

export default useFeatureForm;
