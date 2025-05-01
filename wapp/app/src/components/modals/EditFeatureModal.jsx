import React from 'react';
import axios from 'axios';
import { X, AlertCircle } from 'lucide-react';
import { getModalContainerProps, getModalContentProps } from '@/utils/modalUtils';
import useFeatureForm from '@/hooks/useFeatureForm';
import FeatureForm from '@/components/forms/FeatureForm';
import { API_URL } from '@/constants/api';

const EditFeatureModal = ({ onClose, feature, onFeatureUpdated }) => {
  const {
    formData,
    error,
    setError,
    isSubmitting,
    setIsSubmitting,
    touched,
    isFormValid,
    isNameValid,
    isUrlValid,
    handleInputChange,
    handleUrlChange,
    handleLoginRequirementChange,
    validateForm
  } = useFeatureForm(feature);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    // Backend expects 'urls' as a list, even though we manage 'url' as a string in the form
    const payload = {
      name: formData.name,
      description: formData.description,
      urls: [formData.url], // Send as a list with the correct field name
      access_conditions: formData.access_conditions
    };

    setIsSubmitting(true);

    try {
      // Update the feature via API
      const response = await axios.put(
        `${API_URL}/features/${feature.id}`,
        payload, // Use the correctly structured payload
        { withCredentials: true }
      );

      // Notify parent component with the response data (which should have 'urls')
      if (onFeatureUpdated) {
        onFeatureUpdated(response.data);
      }

      // Close the modal
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to update feature. Please try again.';

      setError(errorMessage);
      console.error('Error updating feature:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div {...getModalContainerProps(onClose)}>
      <div {...getModalContentProps('w-full max-w-md')}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Edit Feature
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Update the details of this feature.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
              <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-1" />
              <p>{error}</p>
            </div>
          )}

          <FeatureForm
            formData={formData}
            error={error}
            isSubmitting={isSubmitting}
            touched={touched}
            isNameValid={isNameValid}
            isUrlValid={isUrlValid}
            isFormValid={isFormValid}
            handleInputChange={handleInputChange}
            handleUrlChange={handleUrlChange}
            handleLoginRequirementChange={handleLoginRequirementChange}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitButtonText="Update Feature"
          />
        </div>
      </div>
    </div>
  );
};

export default EditFeatureModal;
