import React from 'react';
import { X } from 'lucide-react';
import { updateTest } from '@/services/testService';
import useTestForm from '@/hooks/useTestForm';
import TestForm from '@/components/forms/TestForm';
import { getModalContainerProps, getModalContentProps } from '@/utils/modalUtils';

const EditTestModal = ({ onClose, test, onTestUpdated }) => {
  const {
    formData,
    error,
    setError,
    isSubmitting,
    setIsSubmitting,
    selectedSecretIds,
    testCategories,
    handleChange,
    handleSecretSelect,
    validateForm
  } = useTestForm(test);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
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

      // Update the test using the service function
      const updatedTest = await updateTest(test.id, testData);

      // Notify parent component
      if (onTestUpdated) {
        onTestUpdated(updatedTest);
      }

      // Close the modal automatically on success
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to update test. Please try again.';

      setError(errorMessage);
      console.error('Error updating test:', err);
      setIsSubmitting(false); // Only reset submitting state on error
    }
  };

  return (
    <div {...getModalContainerProps(onClose)}>
      <div {...getModalContentProps('max-w-2xl w-full')}>
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Edit Test</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={24} />
          </button>
        </div>

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
          submitButtonText="Save Changes"
        />
      </div>
    </div>
  );
};

export default EditTestModal;
