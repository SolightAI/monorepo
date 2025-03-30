import React, { useState, useEffect, useRef } from 'react';
import { Loader, X, Check, AlertTriangle } from 'lucide-react';
import { generateFeatures, getFeatureGenerationStatus } from '@/api/featureGeneration';

const FeatureGenerationModal = ({ onClose, epicId, epicName, onComplete }) => {
  const [status, setStatus] = useState('starting'); // starting, pending, completed, error
  const [taskId, setTaskId] = useState(null);
  const [error, setError] = useState(null);
  const [generatedFeatures, setGeneratedFeatures] = useState([]);
  const [pollingInterval, setPollingInterval] = useState(null);
  const hasStartedGeneration = useRef(false);

  // Start the generation process
  useEffect(() => {
    const startGeneration = async () => {
      // Skip if we've already started generation (prevents double execution in StrictMode)
      if (hasStartedGeneration.current) return;

      hasStartedGeneration.current = true;

      try {
        const newTaskId = await generateFeatures(epicId);
        setTaskId(newTaskId);
        setStatus('pending');
      } catch (err) {
        console.error('Error starting feature generation:', err);
        // Handle error response properly to ensure it's a string
        const errorMessage = err.response?.data?.detail
          ? (typeof err.response.data.detail === 'string'
             ? err.response.data.detail
             : JSON.stringify(err.response.data.detail))
          : 'Failed to start feature generation';
        setError(errorMessage);
        setStatus('error');
      }
    };

    startGeneration();
  }, [epicId]);

  // Poll for status updates
  useEffect(() => {
    if (status === 'pending' && taskId) {
      const interval = setInterval(async () => {
        try {
          const statusData = await getFeatureGenerationStatus(taskId);

          if (statusData.status === 'completed' && statusData.results) {
            setGeneratedFeatures(statusData.results);
            setStatus('completed');
            clearInterval(interval);
            onComplete && onComplete(statusData.results);
          } else if (statusData.status === 'error') {
            // Ensure error is a string, handle potential object errors
            const errorMessage = statusData.error
              ? (typeof statusData.error === 'string'
                 ? statusData.error
                 : JSON.stringify(statusData.error))
              : 'An error occurred during feature generation';
            setError(errorMessage);
            setStatus('error');
            clearInterval(interval);
          }
          // Continue polling if still pending
        } catch (err) {
          console.error('Error checking feature generation status:', err);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[85%] max-h-[85vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          {status === 'completed' && (
            <div className="flex items-center text-green-600">
              <Check size={20} className="mr-2" />
              <span>Successfully generated {generatedFeatures.length} features!</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pt-4">
          {/* Status and Messages */}
          <div className="mb-6">
            {status === 'starting' && (
              <div className="flex items-center text-blue-600">
                <Loader size={20} className="animate-spin mr-2" />
                <span>Initializing feature generation...</span>
              </div>
            )}

            {status === 'pending' && (
              <div className="flex items-center text-blue-600">
                <Loader size={20} className="animate-spin mr-2" />
                <span>Generating features... This may take a few minutes.</span>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center text-red-600">
                <AlertTriangle size={20} className="mr-2" />
                <span>{error || 'An error occurred during feature generation'}</span>
              </div>
            )}
          </div>

          {/* Display generated features if completed */}
          {status === 'completed' && generatedFeatures.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {generatedFeatures.map((feature, index) => (
                  <li key={index} className="p-4">
                    <h4 className="font-medium text-gray-800">{feature.name}</h4>
                    <p className="text-gray-600 mt-1">{feature.description}</p>
                    {feature.urls && feature.urls.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">URLs:</p>
                        <ul className="list-disc pl-5 mt-1">
                          {feature.urls.map((url, urlIndex) => (
                            <li key={urlIndex}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="py-4 px-6 border-t border-gray-200 flex justify-end">
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

export default FeatureGenerationModal;
