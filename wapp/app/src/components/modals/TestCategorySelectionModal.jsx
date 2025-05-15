import React, { useState } from 'react';
import { X } from 'lucide-react';

const testCategories = [
  {
    id: 'SMOKE',
    label: 'Smoke Tests',
    description: 'Basic tests to verify critical functionality'
  },
  {
    id: 'NEGATIVE',
    label: 'Negative Tests',
    description: 'Tests to verify system behavior with invalid inputs'
  }
];

const TestCategorySelectionModal = ({ isOpen, onClose, onGenerate }) => {
  const [selectedCategories, setSelectedCategories] = useState([]);

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleGenerate = () => {
    onGenerate(selectedCategories);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Select Test Categories</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Choose the types of tests you want to generate with AI. You can select multiple categories.
          </p>

          <div className="space-y-3 mb-6">
            {testCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryToggle(category.id)}
                className={`p-4 border rounded-lg transition-all cursor-pointer
                  ${selectedCategories.includes(category.id)
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
              >
                <div>
                  <h3 className="font-medium text-gray-900">{category.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={selectedCategories.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300 disabled:cursor-not-allowed"
            >
              Generate Tests
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCategorySelectionModal;

