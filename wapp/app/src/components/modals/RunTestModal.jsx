import React, { useState } from 'react';
import { X, Play, Server, AlertCircle } from 'lucide-react';
import { createTestExecution } from '@/services/testExecutionService';

/**
 * Modal for running a test with environment selection
 */
const RunTestModal = ({ test, onClose, onTestExecutionCreated }) => {
  const [environment, setEnvironment] = useState('development');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Common environments that can be selected
  const environments = [
    { id: 'development', name: 'Development' },
    { id: 'staging', name: 'Staging' },
    { id: 'uat', name: 'User Acceptance Testing' },
    { id: 'production', name: 'Production' }
  ];

  const handleRunTest = async () => {
    try {
      setLoading(true);
      setError(null);

      const executionData = {
        test_id: test.id,
        status: 'PENDING',
        environment: environment,
        executor_type: 'MANUAL',
        notes: notes || null
      };

      const execution = await createTestExecution(executionData);

      // Notify parent component about the new execution
      if (onTestExecutionCreated) {
        onTestExecutionCreated(execution);
      }

      onClose();
    } catch (err) {
      console.error('Error starting test execution:', err);
      setError('Failed to start test execution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Modal header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Run Test</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-4">
          <div className="mb-4">
            <h3 className="font-medium text-lg mb-2">{test.name}</h3>
            <p className="text-gray-600 text-sm">{test.description}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
              <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Environment
            </label>
            <div className="flex items-center">
              <Server size={18} className="text-gray-500 mr-2" />
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this test execution..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 h-24"
            />
          </div>
        </div>

        {/* Modal footer */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md mr-2"
          >
            Cancel
          </button>
          <button
            onClick={handleRunTest}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Running...
              </>
            ) : (
              <>
                <Play size={18} className="mr-2" />
                Run Test
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RunTestModal;
