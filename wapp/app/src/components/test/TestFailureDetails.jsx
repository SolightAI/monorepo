import React, { useState } from 'react';
import { AlertTriangle, AlertOctagon, AlertCircle } from 'lucide-react';
import { estimateSeverityLevel, getSeverityInfo, SEVERITY_LEVELS } from '@/utils/severityUtils';
import TestSeverityModal from '../modals/TestSeverityModal';

/**
 * Component to display test failure details with severity information
 * This can be used outside of the modal context to show failure info anywhere in the app
 */
const TestFailureDetails = ({ testData, errorDetails }) => {
  const [showSeverityModal, setShowSeverityModal] = useState(false);
  
  // Estimate severity level based on test data and error details
  const severityLevel = estimateSeverityLevel(testData, errorDetails);
  const severityInfo = getSeverityInfo(severityLevel);
  
  // Get severity icon based on severity level
  const getSeverityIcon = () => {
    switch (severityLevel) {
      case SEVERITY_LEVELS.P1:
        return <AlertOctagon size={16} className="mr-1 text-red-500" />;
      case SEVERITY_LEVELS.P2:
        return <AlertTriangle size={16} className="mr-1 text-orange-500" />;
      case SEVERITY_LEVELS.P3:
        return <AlertCircle size={16} className="mr-1 text-yellow-500" />;
      default:
        return <AlertCircle size={16} className="mr-1 text-gray-500" />;
    }
  };
  
  return (
    <>
      {/* Show severity modal when requested */}
      {showSeverityModal && (
        <TestSeverityModal
          severityLevel={severityLevel}
          testData={testData}
          errorDetails={errorDetails}
          onClose={() => setShowSeverityModal(false)}
        />
      )}
      
      <div 
        className={`p-3 rounded-md flex items-start cursor-pointer ${severityInfo.colorClasses}`}
        onClick={() => setShowSeverityModal(true)}
      >
        <div className="flex-shrink-0 mt-0.5">
          {getSeverityIcon()}
        </div>
        <div className="ml-2">
          <div className="text-sm font-medium flex items-center">
            {severityLevel} - {severityInfo.name}
            <span className="ml-1 text-xs opacity-70">(click for details)</span>
          </div>
          <p className="text-xs mt-1">{errorDetails.message || 'Test failed. No additional details available.'}</p>
        </div>
      </div>
    </>
  );
};

export default TestFailureDetails; 