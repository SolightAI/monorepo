import React from 'react';
import { X, AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';
import { getSeverityInfo, SEVERITY_LEVELS } from '../../utils/severityUtils';

/**
 * Modal component that displays test failure severity information
 * 
 * @param {Object} props - Component props
 * @param {string} props.severityLevel - The severity level (P1, P2, P3)
 * @param {Object} props.testData - Information about the test that failed
 * @param {Object} props.errorDetails - Details about the error
 * @param {Function} props.onClose - Function to call when modal is closed
 * @returns {JSX.Element} Modal component
 */
const TestSeverityModal = ({ severityLevel, testData, errorDetails, onClose }) => {
  const severityInfo = getSeverityInfo(severityLevel);

  // Get the appropriate icon based on severity level
  const getSeverityIcon = () => {
    switch (severityLevel) {
      case SEVERITY_LEVELS.P1:
        return <AlertOctagon size={24} className="text-red-500" />;
      case SEVERITY_LEVELS.P2:
        return <AlertTriangle size={24} className="text-orange-500" />;
      case SEVERITY_LEVELS.P3:
        return <AlertCircle size={24} className="text-yellow-500" />;
      default:
        return <AlertCircle size={24} className="text-gray-500" />;
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            {getSeverityIcon()}
            <span className="ml-2">Test Failed - {severityInfo.name} Issue</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={24} />
          </button>
        </div>
        
        <div className="px-6 py-4">
          <div className={`p-4 rounded-md mb-4 ${severityInfo.colorClasses}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {getSeverityIcon()}
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium">
                  Severity Level: {severityLevel} - {severityInfo.name}
                </h3>
                <div className="mt-2 text-sm">
                  <p>{severityInfo.description}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-900">Test Information</h3>
            <p className="mt-1 text-sm text-gray-600">{testData?.name}</p>
            <p className="mt-1 text-sm text-gray-500">{testData?.description}</p>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-900">Error Details</h3>
            <p className="mt-1 text-sm text-gray-600">{errorDetails?.message || 'No error details available'}</p>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestSeverityModal; 