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
        setError(err.response?.data?.detail || 'Failed to start feature generation');
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
            setError(statusData.error || 'An error occurred during feature generation');
            setStatus('error');
            clearInterval(interval);
          }
          // Continue polling if still pending
        } catch (err) {
          console.error('Error checking feature generation status:', err);
          setError('Failed to check generation status');
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
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {status === 'completed' ? 'Features Generated' : 'Generating Features'}
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
            Epic: <span className="font-medium">{epicName}</span>
          </p>
        </div>

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

          {status === 'completed' && (
            <div className="flex items-center text-green-600">
              <Check size={20} className="mr-2" />
              <span>Successfully generated {generatedFeatures.length} features!</span>
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
            <h3 className="text-lg font-medium p-4 bg-gray-50">Generated Features</h3>
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

          {(status === 'starting' || status === 'pending') && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureGenerationModal;
