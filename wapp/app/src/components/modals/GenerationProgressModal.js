import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Clock, Loader } from 'lucide-react';
import useGenerationStatus from '@/hooks/useGenerationStatus';
import { getFeatureGenerationStatus } from '@/api/featureGeneration';
import { getGenerationStatus } from '@/services/generationService';
import { getModalContainerProps, getModalContentProps } from '@/utils/modalUtils';

// Adding taskType parameter to distinguish between feature generation and full generation
const GenerationProgressModal = ({ taskId, scope, taskType = 'general', onClose }) => {
  // Custom hook for status tracking
  const {
    status,
    progress,
    isLoading,
    error,
    isComplete,
    hasErrors,
    errors
  } = useGenerationStatus(taskId, scope, taskType);

  useEffect(() => {
    console.log('GenerationProgressModal rendered with:', {
      taskId,
      scope,
      taskType,
      status: status?.status,
      progress,
      isLoading,
      error,
      isComplete,
      hasErrors,
      errorCount: errors?.length,
    });
  }, [taskId, scope, taskType, status, progress, isLoading, error, isComplete, hasErrors, errors]);

  // Get appropriate title based on scope
  const getTitle = () => {
    if (!status) return 'Generating...';

    const title = (() => {
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
    })();

    console.log('Modal title:', title);
    return title;
  };

  // Get subtitle based on current state
  const getSubtitle = () => {
    let subtitle;

    if (error) {
      subtitle = 'Error occurred during generation';
    } else if (isComplete) {
      subtitle = 'Generation completed successfully';
    } else if (hasErrors) {
      subtitle = 'Generation completed with some errors';
    } else if (!status?.current_item) {
      // Different message based on task type
      subtitle = taskType === 'feature' ? 'Generating features...' : 'Preparing...';
    } else if (status.scope === 'feature') {
      switch (status.current_item.stage) {
        case 'user_stories':
          subtitle = 'Generating user stories';
          break;
        case 'acceptance_criteria':
          subtitle = 'Generating acceptance criteria';
          break;
        case 'tests':
          subtitle = 'Generating tests';
          break;
        default:
          subtitle = 'Processing...';
      }
    } else if (status.current_item) {
      subtitle = `Processing ${status.current_item.name} (${status.current_item.index} of ${status.current_item.total})`;
    } else {
      subtitle = 'Processing items...';
    }

    console.log('Modal subtitle:', subtitle, { error, isComplete, hasErrors });
    return subtitle;
  };

  // Get appropriate icon for current status
  const getStatusIcon = () => {
    if (error) {
      console.log('Showing error icon due to error:', error);
      return <AlertCircle className="text-red-500" size={24} />;
    }
    if (isComplete) {
      console.log('Showing complete icon - generation completed');
      return <CheckCircle className="text-green-500" size={24} />;
    }
    if (hasErrors) {
      console.log('Showing warning icon - generation has errors');
      return <AlertCircle className="text-orange-500" size={24} />;
    }

    console.log('Showing loading spinner - generation in progress');
    return <Loader className="text-blue-500 animate-spin" size={24} />;
  };

  return (
    <div {...getModalContainerProps(onClose)}>
      <div {...getModalContentProps('w-full max-w-2xl p-6')}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {getTitle()}
          </h2>
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
              onClick={() => {
                console.log('Close button clicked (complete/errors)');
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          ) : (
            <button
              onClick={() => {
                console.log('Continue in background button clicked');
                onClose();
              }}
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
