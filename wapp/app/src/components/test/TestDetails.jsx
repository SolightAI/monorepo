import React from 'react';
import { createTestExecution } from '@/services/testExecutionService';
import { getStatusColorClasses, TEST_STATUS, EXECUTOR_TYPE } from '@/utils/testExecutionUtils';
import { formatDate } from '@/utils/dateUtils';

function TestDetails({ test, onClose }) {
    // Function to get a descriptive name for a secret type
    const getSecretTypeDisplay = (type) => {
      const typeMap = {
        'username_password': 'Credentials',
        // 'api_key': 'API Key',
        // 'environment_variable': 'Environment Variable',
        // 'connection_string': 'Connection String',
        // 'oauth_credential': 'OAuth Credentials',
        // 'other': 'Other'
      };
      return typeMap[type] || type;
    }

    // Function to parse steps either as an array or a string
    const parseSteps = (steps) => {
      if (!steps) return [];

      // If steps is already an array, return it
      if (Array.isArray(steps)) return steps;

      try {
        // Try to parse it as JSON
        const parsedSteps = JSON.parse(steps);
        if (Array.isArray(parsedSteps)) return parsedSteps;
        return [steps]; // If parsed but not an array, wrap in array
      } catch (e) {
        // If not JSON, split by newlines or just return as a single item
        if (steps.includes('\n')) {
          return steps.split('\n').filter(step => step.trim() !== '');
        }
        return [steps];
      }
    };

    // Add function to run the test again
    const handleRunTest = async () => {
      try {
        const executionData = {
          test_id: test.id,
          status: TEST_STATUS.PENDING,
          environment: 'development',
          executor_type: EXECUTOR_TYPE.MANUAL,
          notes: null
        };

        // Import this at the top of your file
        await createTestExecution(executionData);

        // Close the modal and trigger a refresh
        onClose();
      } catch (err) {
        console.error('Error running test:', err);
        // You could add error state and show a message here
      }
    };

    return (
      <div>
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{test.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColorClasses(test.status)}`}>
              {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
            </span>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Page</p>
            <p className="font-medium">{test.page}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Category</p>
            <p className="font-medium">{test.category}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Type</p>
            <p className="font-medium">{test.type}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Created</p>
            <p className="font-medium">{formatDate(test.createdAt, true)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Last Run</p>
            <p className="font-medium">{test.lastRun ? formatDate(test.lastRun, true) : "Not run yet"}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Description</h3>
          <p className="text-gray-700 whitespace-pre-line">{test.description}</p>
        </div>

        {/* Display associated secrets */}
        {test.secrets && test.secrets.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Associated Test Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {test.secrets.map((secret) => (
                <div key={secret.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-medium text-gray-700">{secret.name}</h4>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {getSecretTypeDisplay(secret.type)}
                    </span>
                  </div>
                  {secret.description && (
                    <p className="text-sm text-gray-600 mb-2">{secret.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {test.steps && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Test Steps</h3>
            <div className="space-y-2">
              {parseSteps(test.steps).map((step, index) => (
                <div key={index} className="text-gray-700">
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {test.results && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Test Results</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{test.results}</pre>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end space-x-3">
          <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg" onClick={onClose}>
            Close
          </button>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            onClick={handleRunTest}
          >
            Run Test Again
          </button>
        </div>
      </div>
    )
  }

  export default TestDetails
