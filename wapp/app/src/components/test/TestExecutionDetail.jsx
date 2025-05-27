import React, { useState, useEffect, useRef } from 'react';
import { Server, Calendar, Clock, File, Image, Link2, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { getTestExecution } from '@/services/testExecutionService';
import { getStatusInfo, getExecutorIcon, formatExecutionDate, formatExecutionDuration, formatStatus, TEST_STATUS } from '@/utils/testExecutionUtils';
import PropTypes from 'prop-types';

/**
 * Component to display detailed information about a test execution
 */
const TestExecutionDetail = ({ execution: initialExecution, onBack }) => {
  const [execution, setExecution] = useState(initialExecution);
  const refreshingRef = useRef(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenSrc, setFullScreenSrc] = useState('');
  const [currentEvidenceIndex, setCurrentEvidenceIndex] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState({});

  useEffect(() => {
    if (execution?.id) {
      refreshExecution(); // Call once at initialization

      // If test is still running, set up auto-refresh
      if (execution.status === TEST_STATUS.PENDING) {
        const interval = setInterval(refreshExecution, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
      }
    }
  }, [execution?.id, execution?.status]);

  // Update the execution if initial data changes
  useEffect(() => {
    setExecution(initialExecution);
  }, [initialExecution]);

  // Effect to initialize expanded steps when execution data is available
  useEffect(() => {
    if (execution?.metadata?.agent_thoughts) {
      const initialExpanded = Object.keys(execution.metadata.agent_thoughts).reduce((acc, key) => {
        acc[key] = true; // Set all steps to expanded by default
        return acc;
      }, {});
      setExpandedSteps(initialExpanded);
    } else {
      setExpandedSteps({}); // Reset if no agent thoughts
    }
  }, [execution?.metadata?.agent_thoughts]); // Dependency on agent_thoughts

  const refreshExecution = async () => {
    // Prevent concurrent refresh calls
    if (refreshingRef.current) return;

    try {
      refreshingRef.current = true;
      const updatedExecution = await getTestExecution(execution.id, true);

      // Only update if there's actually a change
      if (updatedExecution &&
          (updatedExecution.status !== execution.status ||
           JSON.stringify(updatedExecution) !== JSON.stringify(execution))) {
        setExecution(updatedExecution);
      }
    } catch (err) {
      console.error('Error refreshing execution data:', err);
      // Don't set error state to avoid disrupting the UI
    } finally {
      refreshingRef.current = false;
    }
  };

  const handleImageClick = (src) => {
    setFullScreenSrc(src);
    setIsFullScreen(true);
  };

  const handleCloseFullScreen = () => {
    setIsFullScreen(false);
    setFullScreenSrc('');
  };

  // Function to toggle the expanded state of a step
  const toggleStep = (index) => {
    setExpandedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Function to render a single evidence item
  const renderEvidenceItem = (item, index) => {
    try {
      // Check if it's a string URL
      if (typeof item === 'string') {
        // Parse the URL and check the pathname
        const url = new URL(item);
        const pathname = url.pathname;

        // Check if the pathname ends with .gif or .png (case-insensitive)
        if (pathname.toLowerCase().endsWith('.gif') || pathname.toLowerCase().endsWith('.png')) {
          return (
            <img
              key={index}
              src={item} // Use the full pre-signed URL
              alt={`Execution evidence ${index + 1}`}
              className="max-w-full max-h-96 object-contain rounded border border-gray-300 shadow-sm cursor-pointer hover:opacity-80 transition-opacity mx-auto"
              onClick={() => handleImageClick(item)} // Add onClick handler
            />
          );
        } else {
          // Render as a link if it's a string but not an image
          return (
            <a
              key={index}
              href={item}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center justify-center break-all"
            >
              <Link2 size={14} className="mr-1 flex-shrink-0" />
              <span className="truncate">{item}</span> {/* Show the full URL for non-GIFs */}
            </a>
          );
        }
      }
    } catch (e) {
      // Handle potential URL parsing errors or non-string items gracefully
      console.error("Error processing evidence item:", item, e);
      // Optionally render something to indicate an issue, or just skip
      return <div className="text-red-500 text-center">Error displaying evidence</div>;
    }
    return <div className="text-gray-500 text-center">Unsupported evidence format</div>; // Skip invalid/unparsable items
  };

  // Helper function to check if an evidence item is an image
  const isImageEvidence = (item) => {
    if (typeof item !== 'string') return false;
    try {
      const url = new URL(item);
      const pathname = url.pathname.toLowerCase();
      return pathname.endsWith('.gif') || pathname.endsWith('.png');
    } catch (e) {
      return false;
    }
  };

  // Helper function to find the index of the next/previous image evidence
  const findAdjacentImageIndex = (direction) => {
    // Ensure evidence exists and is an array
    if (!execution?.evidence || !Array.isArray(execution.evidence) || execution.evidence.length === 0) {
      return -1;
    }

    let foundIndex = -1;
    if (direction === 'prev') {
      for (let i = currentEvidenceIndex - 1; i >= 0; i--) {
        if (isImageEvidence(execution.evidence[i])) {
          foundIndex = i;
          break;
        }
      }
    } else if (direction === 'next') {
      for (let i = currentEvidenceIndex + 1; i < execution.evidence.length; i++) {
        if (isImageEvidence(execution.evidence[i])) {
          foundIndex = i;
          break;
        }
      }
    }
    return foundIndex; // Returns -1 if no image found in that direction
  };

  // Effect for keyboard navigation in fullscreen mode
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isFullScreen) return;

      let direction = null;
      if (event.key === 'ArrowLeft') {
        direction = 'prev';
      } else if (event.key === 'ArrowRight') {
        direction = 'next';
      }

      if (direction) {
        const nextIndex = findAdjacentImageIndex(direction);
        if (nextIndex !== -1) {
          const nextItem = execution.evidence[nextIndex];
          setCurrentEvidenceIndex(nextIndex);
          setFullScreenSrc(nextItem);
        }
      }
    };

    if (isFullScreen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen, currentEvidenceIndex, execution.evidence]); // Dependencies

  if (!execution) {
    return <div>No execution data available</div>;
  }

  // Determine if adjacent image evidence exists for arrow visibility
  const hasPrevImage = findAdjacentImageIndex('prev') !== -1;
  const hasNextImage = findAdjacentImageIndex('next') !== -1;

  // Determine if the test is currently running
  const isRunning = execution.status === TEST_STATUS.PENDING;

  return (
    <div className="bg-white rounded-lg">
      {/* Back button */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft size={24} className="mr-1" />
          Back to history
        </button>
      </div>

      {/* Header with status */}
      <div className={`p-4 rounded-lg mb-4 ${isRunning ? 'bg-blue-100 text-blue-600' : getStatusInfo(execution.status).color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {/* Use spinner if running, otherwise use status icon */}
            {isRunning ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent mr-2"></div>
            ) : (
              getStatusInfo(execution.status).icon
            )}
            <h2 className="text-xl font-semibold ml-2">
              {/* Display "Running" if running, otherwise format status */}
              {isRunning ? 'Running' : formatStatus(execution.status)}
              {execution.metadata && execution.metadata.is_from_cache === true && (
                <span className="ml-3 px-2.5 py-1 text-xs font-semibold bg-teal-100 text-teal-900 rounded-full whitespace-nowrap">
                  CACHE
                </span>
              )}
            </h2>
          </div>
          <div className={`text-sm ${isRunning ? 'text-blue-600' : 'text-gray-600'}`}>
            ID: {execution.id}
          </div>
        </div>
      </div>

      {/* Execution details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Started</span>
          <div className="font-medium">
            <Calendar size={14} className="inline mr-1" />
            {formatExecutionDate(execution.started_at)}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Ended</span>
          <div className="font-medium">
            {execution.ended_at ? (
              <>
                <Calendar size={14} className="inline mr-1" />
                {formatExecutionDate(execution.ended_at)}
              </>
            ) : (
              <span className="text-yellow-600">In progress</span>
            )}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Duration</span>
          <div className="font-medium">
            <Clock size={14} className="inline mr-1" />
            {execution.duration_ms ? formatExecutionDuration(execution.duration_ms) : 'In progress'}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Environment</span>
          <div className="font-medium">
            <Server size={14} className="inline mr-1" />
            {execution.environment}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Executor</span>
          <div className="font-medium flex items-center">
            {getExecutorIcon(execution.executor_type)}
            <span className="ml-1">
              {execution.executor_name || 'Unknown'} ({execution.executor_type})
            </span>
          </div>
        </div>

        {execution.metadata && Object.keys(execution.metadata).length > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-500">Metadata</span> {/* Reverted title */}
            <div className="font-medium">
              {Object.entries(execution.metadata)
                .filter(([key]) => key !== 'agent_thoughts' && key !== 'agent_actions' && key !== 'is_from_cache') // Keep filtering is_from_cache as it's now shown in the header
                .map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium">{key}: </span> {/* Reverted key formatting */}
                    <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span> {/* Reverted String() cast, relying on React's rendering */}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes section */}
      {execution.notes && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <File size={18} className="mr-2" />
            Notes
          </h3>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="whitespace-pre-line">{execution.notes}</p>
          </div>
        </div>
      )}

      {/* Logs section */}
      {(execution.tracing || execution.status === TEST_STATUS.PENDING) && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <File size={18} className="mr-2" />
            Browser Logs
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            {/* Display console logs */}
            {(() => {
              // Use the isRunning variable here as well
              if (isRunning) {
                return (
                  <div className="p-3 text-blue-600"> {/* Changed from yellow to blue for consistency */}
                    Execution in progress. Logs will be available when completed.
                  </div>
                );
              }

              if (!execution.tracing || Object.keys(execution.tracing).length === 0) {
                return (
                  <div className="p-3 text-gray-600">
                    No logs available for this execution.
                  </div>
                );
              }

              return (
                <div className="p-3">
                  <div className="mb-4">
                    <div className="font-medium mb-2">Trace</div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
                      {execution.tracing.logs}
                    </pre>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Evidence section (e.g., GIF) */}
      {execution.evidence && execution.evidence.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Image size={18} className="mr-2" />
            Evidence
          </h3>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg relative">
            {/* Carousel Display */}
            <div className="mb-4 min-h-[100px] flex items-center justify-center">
              {renderEvidenceItem(execution.evidence[currentEvidenceIndex], currentEvidenceIndex)}
            </div>

            {/* Carousel Controls */}
            {execution.evidence.length > 1 && (
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={() => setCurrentEvidenceIndex(prev => (prev > 0 ? prev - 1 : prev))}
                  disabled={currentEvidenceIndex === 0}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous Evidence"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-gray-600">
                  {currentEvidenceIndex + 1} / {execution.evidence.length}
                </span>
                <button
                  onClick={() => setCurrentEvidenceIndex(prev => (prev < execution.evidence.length - 1 ? prev + 1 : prev))}
                  disabled={currentEvidenceIndex === execution.evidence.length - 1}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next Evidence"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agent Thoughts and Actions section */}
      {execution.metadata?.agent_thoughts && execution.metadata?.agent_actions && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <File size={18} className="mr-2" />
            Agent Execution Details
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {Object.entries(execution.metadata.agent_thoughts || {}).map(([stepIndex, step], index) => {
                const stepNum = parseInt(stepIndex);
                const isExpanded = expandedSteps[stepNum];
                // Get the corresponding action
                const action = execution.metadata.agent_actions?.[stepNum] || {};

                // Format the output
                return (
                  <div key={index} className="mb-4 pb-4 border-b border-gray-200 last:border-b-0">
                    <div
                      className="font-bold flex items-center cursor-pointer hover:text-blue-600"
                      onClick={() => toggleStep(stepNum)}
                    >
                      {isExpanded ? <ChevronDown size={16} className="mr-1" /> : <ChevronRight size={16} className="mr-1" />}
                      📍 Step {stepNum + 1}
                    </div>
                    {isExpanded && (
                      <>
                        {step.evaluation_previous_goal && (
                          <div className="mt-2">
                            <div className="bg-blue-50 p-2 rounded mt-1">🤷 Eval: {step.evaluation_previous_goal}</div>
                          </div>
                        )}
                        {step.memory && (
                          <div className="mt-2">
                            <div className="bg-purple-50 p-2 rounded mt-1">🧠 Memory: {step.memory}</div>
                          </div>
                        )}
                        {step.next_goal && (
                          <div className="mt-2">
                            <div className="bg-green-50 p-2 rounded mt-1">🎯 Next Goal: {step.next_goal}</div>
                          </div>
                        )}
                        {action && Object.keys(action).length > 0 && (
                          <div className="mt-2">
                            <div className="bg-yellow-50 p-2 rounded mt-1">
                              🛠️ Action: {JSON.stringify(action, null, 2)}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      )}

      {/* Full Screen Image Overlay */}
      {isFullScreen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={handleCloseFullScreen} // Close on background click
        >
          <img
            src={fullScreenSrc}
            alt="Full screen evidence"
            className="max-w-full max-h-full object-contain bg-white rounded shadow-lg"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
          />
          {/* Optional: Add a close button */}
          <button
             className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-300"
             onClick={handleCloseFullScreen}
          >
             &times;
          </button>

          {/* Left Navigation Arrow */}
          {hasPrevImage && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-30 hover:bg-opacity-50 rounded-full p-2 z-50 transition-opacity"
              onClick={(e) => {
                e.stopPropagation(); // Prevent closing fullscreen
                const prevIndex = findAdjacentImageIndex('prev');
                if (prevIndex !== -1) {
                  setCurrentEvidenceIndex(prevIndex);
                  setFullScreenSrc(execution.evidence[prevIndex]);
                }
              }}
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Right Navigation Arrow */}
          {hasNextImage && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-30 hover:bg-opacity-50 rounded-full p-2 z-50 transition-opacity"
              onClick={(e) => {
                e.stopPropagation(); // Prevent closing fullscreen
                const nextIndex = findAdjacentImageIndex('next');
                if (nextIndex !== -1) {
                  setCurrentEvidenceIndex(nextIndex);
                  setFullScreenSrc(execution.evidence[nextIndex]);
                }
              }}
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

TestExecutionDetail.propTypes = {
  execution: PropTypes.object,
  onBack: PropTypes.func.isRequired
};

export default TestExecutionDetail;
