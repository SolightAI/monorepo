import { useState } from 'react';
import { isValidUrl } from '@/utils/urlUtils';
import { MAX_NAME_LENGTH } from '@/constants/validation';

/**
 * Custom hook for handling feature form state and validation
 * @param {Object} initialData - Initial form data
 * @returns {Object} Form state and handlers
 */
export const useFeatureForm = (initialData = {}) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    urls: initialData.urls && initialData.urls.length > 0 ? [...initialData.urls] : [''],
    access_conditions: initialData.access_conditions || { must_be_logged_in: true }
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    urls: false
  });
  const [urlErrors, setUrlErrors] = useState([]);

  // Calculate if form is valid for submit button
  const isFormValid = () => {
    const nameValid = formData.name.trim() !== '' && formData.name.length <= MAX_NAME_LENGTH;
    const urlsValid = formData.urls.some(url => url.trim() !== '' && isValidUrl(url));
    return nameValid && urlsValid && urlErrors.every(error => !error);
  };

  // Check individual field validity for UI feedback
  const isNameValid = formData.name.trim() !== '';
  const isUrlsValid = formData.urls.some(url => url.trim() !== '');

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

  // Handle URL input changes
  const handleUrlChange = (index, value) => {
    const updatedUrls = [...formData.urls];
    updatedUrls[index] = value;

    setFormData({
      ...formData,
      urls: updatedUrls
    });

    // Validate URL
    const newUrlErrors = [...urlErrors];
    if (value.trim() !== '' && !isValidUrl(value)) {
      newUrlErrors[index] = 'Please enter a valid URL (e.g., https://example.com)';
    } else {
      newUrlErrors[index] = '';
    }
    setUrlErrors(newUrlErrors);

    // Mark URLs as touched
    if (!touched.urls) {
      setTouched({
        ...touched,
        urls: true
      });
    }
  };

  // Add a new URL field
  const handleAddUrl = () => {
    setFormData({
      ...formData,
      urls: [...formData.urls, '']
    });
  };

  // Remove a URL field
  const handleRemoveUrl = (index) => {
    const updatedUrls = formData.urls.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      urls: updatedUrls
    });
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

  // Validate form data
  const validateForm = () => {
    // Validate form
    if (!formData.name.trim()) {
      setError('Feature name is required');
      return false;
    }

    if (formData.name.length > MAX_NAME_LENGTH) {
      setError(`Feature name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      return false;
    }

    // Filter out empty URLs
    const filteredUrls = formData.urls.filter(url => url.trim() !== '');

    // Simple validation: require at least one URL
    if (filteredUrls.length === 0) {
      setError('At least one URL is required');
      return false;
    }

    // Validate all URLs
    const invalidUrls = filteredUrls.filter(url => !isValidUrl(url));
    if (invalidUrls.length > 0) {
      // Update touched state to show all URL field errors
      setTouched(prev => ({...prev, urls: true}));
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
    touched,
    setTouched,
    urlErrors,
    isFormValid,
    isNameValid,
    isUrlsValid,
    handleInputChange,
    handleUrlChange,
    handleAddUrl,
    handleRemoveUrl,
    handleLoginRequirementChange,
    validateForm
  };
};

export default useFeatureForm;
