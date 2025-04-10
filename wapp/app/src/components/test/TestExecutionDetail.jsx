import React, { useState, useEffect, useRef } from 'react';
import { Server, Calendar, Clock, File, Image, Link2, ArrowLeft, CheckCircle, XCircle, AlertTriangle, AlertOctagon, AlertCircle } from 'lucide-react';
import { getBugsByTestExecution, getTestExecution } from '@/services/testExecutionService';
import { getStatusInfo, getExecutorIcon, formatExecutionDate, formatExecutionDuration, formatStatus, getStatusColorClasses } from '@/utils/testExecutionUtils';
import { estimateSeverityLevel, getSeverityInfo, SEVERITY_LEVELS } from '@/utils/severityUtils';
import PropTypes from 'prop-types';

/**
 * Component to display detailed information about a test execution
 */
const TestExecutionDetail = ({ execution: initialExecution, onBack, testData }) => {
  const [execution, setExecution] = useState(initialExecution);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const refreshingRef = useRef(false);
  const [expanded, setExpanded] = useState({});
  
  // Estimate severity level if execution failed
  const isFailed = execution.status === 'FAILED' || execution.status === 'ERROR';
  const severityLevel = isFailed
    ? estimateSeverityLevel(testData, { message: execution.notes || '' })
    : null;
  
  const severityInfo = severityLevel ? getSeverityInfo(severityLevel) : null;
  
  // Get severity icon based on severity level
  const getSeverityIcon = () => {
    switch (severityLevel) {
      case SEVERITY_LEVELS.P1:
        return <AlertOctagon size={18} className="text-red-500" />;
      case SEVERITY_LEVELS.P2:
        return <AlertTriangle size={18} className="text-orange-500" />;
      case SEVERITY_LEVELS.P3:
        return <AlertCircle size={18} className="text-yellow-500" />;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (execution?.id) {
      fetchBugs();

      // If test is still running, set up auto-refresh
      if (execution.status === 'PENDING') {
        const interval = setInterval(refreshExecution, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
      }
    }
  }, [execution?.id, execution?.status]);

  // Update the execution if initial data changes
  useEffect(() => {
    setExecution(initialExecution);
  }, [initialExecution]);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      const data = await getBugsByTestExecution(execution.id);
      setBugs(data);
    } catch (err) {
      console.error('Error fetching bugs:', err);
      setError('Failed to load bugs for this execution.');
    } finally {
      setLoading(false);
    }
  };

  const refreshExecution = async () => {
    // Prevent concurrent refresh calls
    if (refreshingRef.current) return;

    try {
      refreshingRef.current = true;
      const updatedExecution = await getTestExecution(execution.id);

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

  // Get status icon based on execution status
  const getStatusIcon = (status) => {
    const { icon } = getStatusInfo(status);
    // Make the icon bigger for the header
    return React.cloneElement(icon, { size: 20 });
  };

  // Get background color based on execution status
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
        return 'bg-green-50 border-green-200';
      case 'FAILED':
        return 'bg-red-50 border-red-200';
      case 'ERROR':
        return 'bg-red-50 border-red-200';
      case 'PENDING':
        return 'bg-yellow-50 border-yellow-200';
      case 'BLOCKED':
        return 'bg-orange-50 border-orange-200';
      case 'SKIPPED':
        return 'bg-blue-50 border-blue-200';
      case 'AGENT_LIMITATION':
        return 'bg-purple-50 border-purple-200';
      case 'UNEXISTING_FEATURE':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Format date for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not available';
    
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Format duration for display
  const formatDuration = (durationMs) => {
    if (!durationMs) return 'Not available';
    
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    }
    
    const seconds = Math.floor(durationMs / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Parse and format tracing data if available
  const renderTracingData = () => {
    if (!execution.tracing || Object.keys(execution.tracing).length === 0) {
      return <p className="text-gray-500 italic">No tracing data available</p>;
    }

    const toggleSection = (section) => {
      setExpanded(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    };

    return (
      <div className="space-y-3">
        {Object.entries(execution.tracing).map(([key, value]) => (
          <div key={key} className="border rounded-md overflow-hidden">
            <div 
              className="bg-gray-100 px-4 py-2 flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection(key)}
            >
              <h4 className="font-medium text-gray-800">{key}</h4>
              <span>{expanded[key] ? '−' : '+'}</span>
            </div>
            {expanded[key] && (
              <div className="p-4 bg-white">
                <pre className="overflow-x-auto text-xs whitespace-pre-wrap">{
                  typeof value === 'object' 
                    ? JSON.stringify(value, null, 2) 
                    : value
                }</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!execution) {
    return <div>No execution data available</div>;
  }

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
      <div className={`p-4 rounded-lg mb-4 ${getStatusColorClasses(execution.status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getStatusIcon(execution.status)}
            <h2 className="text-xl font-semibold ml-2">
              {formatStatus(execution.status)}
            </h2>
          </div>
          <div className="text-sm text-gray-600">
            ID: {execution.id}
          </div>
        </div>
      </div>

      {/* Severity level if failed */}
      {isFailed && severityLevel && (
        <div className={`p-4 rounded-lg mb-4 ${severityInfo.colorClasses}`}>
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              {getSeverityIcon()}
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium">
                Severity Level: {severityLevel} - {severityInfo.name}
              </h3>
              <div className="mt-1 text-sm">
                <p>{severityInfo.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execution details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Started</span>
          <div className="font-medium">
            <Calendar size={14} className="inline mr-1" />
            {formatDateTime(execution.started_at)}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">Ended</span>
          <div className="font-medium">
            {execution.ended_at ? (
              <>
                <Calendar size={14} className="inline mr-1" />
                {formatDateTime(execution.ended_at)}
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
            {execution.duration_ms ? formatDuration(execution.duration_ms) : 'In progress'}
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
            <span className="text-sm text-gray-500">Metadata</span>
            <div className="font-medium">
              {Object.entries(execution.metadata)
                .filter(([key]) => key !== 'agent_thoughts' && key !== 'agent_actions')
                .map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium">{key}: </span>
                    <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
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

      {/* Bugs section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          Bugs Found ({bugs.length})
        </h3>

        {loading ? (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading bugs...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p>{error}</p>
          </div>
        ) : bugs.length === 0 && execution.status !== 'PENDING' ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
            <p>No bugs were found during this test execution.</p>
          </div>
        ) : execution.status === 'PENDING' ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
            <p>Waiting for test execution to complete...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bugs.map((bug) => (
              <div key={bug.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between">
                  <h4 className="font-semibold text-red-800">{bug.name}</h4>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">
                    {bug.severity}
                  </span>
                </div>
                <p className="mt-2 text-gray-700">{bug.description}</p>
                {bug.screenshots && bug.screenshots.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {bug.screenshots.map((screenshot, idx) => (
                      <a
                        key={idx}
                        href={screenshot}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={screenshot}
                          alt={`Bug ${bug.id} screenshot ${idx}`}
                          className="border border-red-200 rounded w-full h-auto"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs section */}
      {(execution.tracing || execution.status === 'PENDING') && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <File size={18} className="mr-2" />
            Logs
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            {/* Display console logs */}
            {(() => {
              if (execution.status === 'PENDING') {
                return (
                  <div className="p-3 text-yellow-600">
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
                    {renderTracingData()}
                  </div>
                </div>
              );
            })()}
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
                // Get the corresponding action
                const action = execution.metadata.agent_actions?.[parseInt(stepIndex)] || {};

                // Format the output
                return (
                  <div key={index} className="mb-4 pb-4 border-b border-gray-200">
                    <div className="font-bold">📍 Step {parseInt(stepIndex) + 1}</div>
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
                          🛠️  Action: {JSON.stringify(action, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      )}

      {/* Evidence section */}
      {execution.evidence && execution.evidence.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Image size={18} className="mr-2" />
            Evidence
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {execution.evidence.map((item, index) => (
              <div key={index} className="p-2 border border-gray-200 rounded-lg">
                {item.endsWith('.jpg') || item.endsWith('.png') || item.endsWith('.gif') ? (
                  <img
                    src={item}
                    alt={`Evidence ${index + 1}`}
                    className="w-full h-auto rounded"
                  />
                ) : (
                  <a
                    href={item}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Link2 size={14} className="mr-1" />
                    {item.split('/').pop() || `Evidence ${index + 1}`}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

TestExecutionDetail.propTypes = {
  execution: PropTypes.object,
  onBack: PropTypes.func.isRequired,
  testData: PropTypes.object.isRequired
};

export default TestExecutionDetail;
