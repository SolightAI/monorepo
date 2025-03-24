import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader, RefreshCw, CheckCircle, Sparkles } from 'lucide-react';
import { getUserStoriesGenerationStatus } from '@/services/userStoryService';

const GenerateUserStoriesModal = ({ onClose, taskId, featureName, onComplete }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const statusData = await getUserStoriesGenerationStatus(taskId);
      setStatus(statusData);

      // If the status is completed or error, stop polling
      if (statusData.status === 'completed' || statusData.status === 'error') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }

        // If completed successfully, notify parent component
        if (statusData.status === 'completed' && onComplete) {
          onComplete(statusData.results);
        }
      }
    } catch (err) {
      console.error('Error fetching user stories generation status:', err);
      // Store the full error payload instead of just a generic message
      setError({
        message: 'Failed to fetch status. Please try again.',
        details: err.response?.data || err.message || JSON.stringify(err)
      });
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Set up polling every 3 seconds
    const interval = setInterval(fetchStatus, 3000);
    setPollingInterval(interval);

    // Clean up interval on component unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [taskId]);

  const getStatusIcon = () => {
    if (loading && !status) {
      return <Loader size={24} className="text-blue-500 animate-spin" />;
    }

    if (error) {
      return <AlertCircle size={24} className="text-red-500" />;
    }

    if (!status) {
      return <AlertCircle size={24} className="text-gray-500" />;
    }

    switch (status.status) {
      case 'pending':
        return <Loader size={24} className="text-yellow-500 animate-spin" />;
      case 'completed':
        return <CheckCircle size={24} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={24} className="text-red-500" />;
      default:
        return <RefreshCw size={24} className="text-blue-500" />;
    }
  };

  const getStatusText = () => {
    if (loading && !status) {
      return 'Fetching status...';
    }

    if (error) {
      return 'Error fetching status';
    }

    if (!status) {
      return 'Status unavailable';
    }

    switch (status.status) {
      case 'pending':
        return 'User stories generation in progress...';
      case 'completed':
        const storyCount = status.results ? status.results.length : 0;
        return `${storyCount} user ${storyCount === 1 ? 'story' : 'stories'} generated successfully!`;
      case 'error':
        return `Error: ${status.error || 'Unknown error occurred'}`;
      default:
        return `Status: ${status.status}`;
    }
  };

  const handleClose = () => {
    // Clear polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Generate User Stories
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Generating user stories for feature: <span className="font-semibold">{featureName}</span>
          </p>

          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              {getStatusIcon()}
              <h3 className="text-lg font-medium">{getStatusText()}</h3>
            </div>

            {status && status.status === 'pending' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-md">
                <div className="flex items-center space-x-2">
                  <Sparkles size={18} className="text-yellow-600" />
                  <p className="text-yellow-700">
                    Generating user stories, this may take a minute...
                  </p>
                </div>
              </div>
            )}

            {status && status.status === 'completed' && status.results && (
              <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-md max-h-60 overflow-y-auto">
                <p className="font-medium text-green-800 mb-2">
                  {status.results.length === 1
                    ? "1 user story created successfully:"
                    : `${status.results.length} user stories created successfully:`}
                </p>
                <ul className="list-disc pl-5">
                  {status.results.map((story, index) => (
                    <li key={index} className="text-green-700 mb-1">
                      {story.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {status && status.status === 'error' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-md">
                <p className="text-red-700">{status.error || 'An unknown error occurred during user stories generation'}</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-md">
                <p className="font-medium text-red-800 mb-2">{error.message}</p>
                <div className="mt-2">
                  <p className="font-medium text-red-800">Full Error Payload:</p>
                  <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                    {typeof error.details === 'object'
                      ? JSON.stringify(error.details, null, 2)
                      : error.details}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateUserStoriesModal;
