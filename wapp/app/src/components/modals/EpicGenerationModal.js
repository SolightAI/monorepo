import React, { useState, useEffect, useRef } from 'react';
import { Loader, X, Check, AlertTriangle } from 'lucide-react';
import { generateEpics, getEpicGenerationStatus } from '@/api/epicGeneration';
import { getModalContainerProps, getModalContentProps } from '@/utils/modalUtils';

const EpicGenerationModal = ({ onClose, productId, productName, onComplete }) => {
  const [status, setStatus] = useState('starting'); // starting, pending, completed, error
  const [taskId, setTaskId] = useState(null);
  const [error, setError] = useState(null);
  const [generatedEpics, setGeneratedEpics] = useState([]);
  const [pollingInterval, setPollingInterval] = useState(null);
  const hasStartedGeneration = useRef(false);

  // Start the generation process
  useEffect(() => {
    const startGeneration = async () => {
      // Skip if we've already started generation (prevents double execution in StrictMode)
      if (hasStartedGeneration.current) return;

      hasStartedGeneration.current = true;

      try {
        const newTaskId = await generateEpics(productId);
        setTaskId(newTaskId);
        setStatus('pending');
      } catch (err) {
        console.error('Error starting epic generation:', err);
        // Handle error response properly to ensure it's a string
        const errorMessage = err.response?.data?.detail
          ? (typeof err.response.data.detail === 'string'
             ? err.response.data.detail
             : JSON.stringify(err.response.data.detail))
          : 'Failed to start epic generation';
        setError(errorMessage);
        setStatus('error');
      }
    };

    startGeneration();
  }, [productId]);

  // Poll for status updates
  useEffect(() => {
    if (status === 'pending' && taskId) {
      const interval = setInterval(async () => {
        try {
          const statusData = await getEpicGenerationStatus(taskId);

          if (statusData.status === 'completed' && statusData.results) {
            setGeneratedEpics(statusData.results);
            setStatus('completed');
            clearInterval(interval);
            // Wait a moment for the backend to process
            await new Promise(resolve => setTimeout(resolve, 2000));
            onComplete && onComplete(statusData.results);
          } else if (statusData.status === 'error') {
            // Ensure error is a string, handle potential object errors
            const errorMessage = statusData.error
              ? (typeof statusData.error === 'string'
                 ? statusData.error
                 : JSON.stringify(statusData.error))
              : 'An error occurred during epic generation';
            setError(errorMessage);
            setStatus('error');
            clearInterval(interval);
          }
          // Continue polling if still pending
        } catch (err) {
          console.error('Error checking epic generation status:', err);
          // Ensure error is a string
          setError(typeof err === 'string' ? err : 'Failed to check generation status');
          setStatus('error');
          clearInterval(interval);
        }
      }, 3000); // Poll every 3 seconds

      setPollingInterval(interval);

      return () => clearInterval(interval);
    }
  }, [status, taskId, onComplete]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  return (
    <div {...getModalContainerProps(onClose)}>
      <div {...getModalContentProps('w-full max-w-2xl p-6')}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {status === 'completed' ? 'Epics Generated' : 'Generating Epics'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600">
            Product: <span className="font-medium">{productName}</span>
          </p>
        </div>

        {/* Status and Messages */}
        <div className="mb-6">
          {status === 'starting' && (
            <div className="flex items-center text-blue-600">
              <Loader size={20} className="animate-spin mr-2" />
              <span>Initializing epic generation...</span>
            </div>
          )}

          {status === 'pending' && (
            <div className="flex items-center text-blue-600">
              <Loader size={20} className="animate-spin mr-2" />
              <span>Generating epics... This may take a few minutes.</span>
            </div>
          )}

          {status === 'completed' && (
            <div className="flex items-center text-green-600">
              <Check size={20} className="mr-2" />
              <span>Successfully generated {generatedEpics.length} epics!</span>
            </div>
          )}

          {status === 'error' && (
            // added <pre> because the error message from python was not being displayed correctly, "\n" was not being rendered
            <div className="flex items-start text-red-600">
              <AlertTriangle size={20} className="mr-2 flex-shrink-0 mt-1" />
              <pre className="whitespace-pre-wrap font-sans text-sm">{error || 'An error occurred during epic generation'}</pre>
            </div>
          )}
        </div>

        {/* Display generated epics if completed */}
        {status === 'completed' && generatedEpics.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <h3 className="text-lg font-medium p-4 bg-gray-50">Generated Epics</h3>
            <ul className="divide-y divide-gray-200">
              {generatedEpics.map((epic, index) => (
                <li key={index} className="p-4">
                  <h4 className="font-medium text-gray-800">{epic.name}</h4>
                  <p className="text-gray-600 mt-1">{epic.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end">
          {status === 'completed' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Done
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EpicGenerationModal;
