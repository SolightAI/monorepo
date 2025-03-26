import React from 'react';
import { X, AlertCircle, CheckCircle, Clock, Loader } from 'lucide-react';
import useGenerationStatus from '@/hooks/useGenerationStatus';

const GenerationProgressModal = ({ taskId, scope, onClose }) => {
  const {
    status,
    progress,
    isLoading,
    error,
    isComplete,
    hasErrors,
    errors
  } = useGenerationStatus(taskId, scope);

  // Get appropriate title based on scope
  const getTitle = () => {
    if (!status) return 'Generating...';

    switch (status.scope) {
      case 'feature':
        return 'Generating Content for Feature';
      case 'epic':
        return 'Generating Content for Epic';
      case 'product':
        return 'Generating Content for Product';
      default:
        return 'Generating...';
    }
  };

  // Get subtitle based on current state
  const getSubtitle = () => {
    if (error) return 'Error occurred during generation';
    if (isComplete) return 'Generation completed successfully';
    if (hasErrors) return 'Generation completed with some errors';
    if (!status?.current_item) return 'Preparing...';

    // For feature-level generation
    if (status.scope === 'feature') {
      switch (status.current_item.stage) {
        case 'user_stories':
          return 'Generating user stories';
        case 'acceptance_criteria':
          return 'Generating acceptance criteria';
        case 'tests':
          return 'Generating tests';
        default:
          return 'Processing...';
      }
    }

    // For epic/product levels
    if (status.current_item) {
      return `Processing ${status.current_item.name} (${status.current_item.index} of ${status.current_item.total})`;
    }

    return 'Processing items...';
  };

  // Get appropriate icon for current status
  const getStatusIcon = () => {
    if (error) return <AlertCircle className="text-red-500" size={24} />;
    if (isComplete) return <CheckCircle className="text-green-500" size={24} />;
    if (hasErrors) return <AlertCircle className="text-orange-500" size={24} />;

    return <Loader className="text-blue-500 animate-spin" size={24} />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center">
            {getStatusIcon()}
            <h2 className="text-lg font-semibold ml-2">{getTitle()}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Status message */}
          <p className="text-gray-600 mb-4">{getSubtitle()}</p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className={`h-4 rounded-full ${hasErrors ? 'bg-orange-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Progress details */}
          <div className="flex justify-between text-sm text-gray-500 mb-6">
            <span>{isComplete || hasErrors ? 'Completed' : 'In progress'}</span>
            <span>{progress}%</span>
          </div>

          {/* Current item details */}
          {status?.current_item && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center mb-2">
                <Clock size={16} className="text-blue-500 mr-2" />
                <span className="font-medium">{status.current_item.name}</span>
              </div>
              <p className="text-sm text-gray-600">
                {status.current_item.stage?.replace('_', ' ')}
              </p>
            </div>
          )}

          {/* Error display */}
          {errors.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-red-600 mb-2">Errors encountered:</h3>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                {errors.map((err, index) => (
                  <li key={index} className="text-red-600">
                    {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t">
          {(isComplete || hasErrors) ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Continue in background
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationProgressModal;
