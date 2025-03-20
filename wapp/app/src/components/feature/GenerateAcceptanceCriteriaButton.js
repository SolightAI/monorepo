import React, { useState, useEffect } from 'react';
import { generateAcceptanceCriteria, getAcceptanceCriteriaGenerationStatus } from '../../api/acceptanceCriteriaGeneration';
import { Loader } from 'lucide-react';

/**
 * Button component for generating acceptance criteria for a feature
 */
const GenerateAcceptanceCriteriaButton = ({ featureId, onGenerationComplete, hasUserStories }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState(null); // 'success', 'error', or 'info'

  // Display toast message and hide it after a timeout
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
        setToastType(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Poll for task status when taskId is available
  useEffect(() => {
    let intervalId;
    
    const pollTaskStatus = async () => {
      if (!taskId) return;
      
      try {
        const status = await getAcceptanceCriteriaGenerationStatus(taskId);
        
        if (status.status === 'completed') {
          setIsGenerating(false);
          setTaskId(null);
          
          setToastMessage('Acceptance criteria generated successfully');
          setToastType('success');
          
          onGenerationComplete();
        } else if (status.status === 'error') {
          setIsGenerating(false);
          setTaskId(null);
          
          setToastMessage(status.error || 'Failed to generate acceptance criteria');
          setToastType('error');
        }
      } catch (error) {
        console.error('Error polling task status:', error);
        
        setIsGenerating(false);
        setTaskId(null);
        
        setToastMessage('Failed to check generation status');
        setToastType('error');
      }
    };
    
    if (taskId) {
      // Poll every 5 seconds
      intervalId = setInterval(pollTaskStatus, 5000);
      // Initial poll
      pollTaskStatus();
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [taskId, onGenerationComplete]);

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    
    try {
      const newTaskId = await generateAcceptanceCriteria(featureId);
      setTaskId(newTaskId);
      
      setToastMessage('Generating acceptance criteria for this feature...');
      setToastType('info');
    } catch (error) {
      console.error('Error starting generation:', error);
      setIsGenerating(false);
      
      setToastMessage('Failed to start acceptance criteria generation');
      setToastType('error');
    }
  };

  // Toast component
  const Toast = () => {
    if (!toastMessage) return null;
    
    const bgColor = 
      toastType === 'success' ? 'bg-green-100 border-green-500 text-green-800' :
      toastType === 'error' ? 'bg-red-100 border-red-500 text-red-800' :
      'bg-blue-100 border-blue-500 text-blue-800';
    
    return (
      <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-md border-l-4 ${bgColor} shadow-md z-50`}>
        <div className="flex items-center">
          <p>{toastMessage}</p>
          <button
            onClick={() => { setToastMessage(null); setToastType(null); }}
            className="ml-4 text-gray-500 hover:text-gray-800"
          >
            &times;
          </button>
        </div>
      </div>
    );
  };

  if (!hasUserStories) {
    return (
      <div className="relative inline-block">
        <button 
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow opacity-50 cursor-not-allowed"
          disabled={true}
        >
          Generate Acceptance Criteria
        </button>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          You need to create user stories first
        </div>
      </div>
    );
  }

  return (
    <>
      {toastMessage && <Toast />}
      <button
        className={`flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors ${isGenerating ? 'opacity-75' : ''}`}
        onClick={handleGenerateClick}
        disabled={isGenerating}
      >
        {isGenerating && (
          <Loader size={18} className="mr-2 animate-spin" />
        )}
        {isGenerating ? 'Generating...' : 'Generate Acceptance Criteria'}
      </button>
    </>
  );
};

export default GenerateAcceptanceCriteriaButton; 