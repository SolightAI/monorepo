import React from 'react';
import { X } from 'lucide-react';

const GenerationModal = ({ onClose, featureName, type }) => {
  const titles = {
    'user-stories': 'Generate User Stories',
    'acceptance-criteria': 'Generate Acceptance Criteria',
    'tests': 'Generate Tests'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {titles[type]}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Generating {type.replace('-', ' ')} for feature: <span className="font-semibold">{featureName}</span>
          </p>

          <div className="flex justify-end">
            <button
              onClick={onClose}
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

export default GenerationModal; 