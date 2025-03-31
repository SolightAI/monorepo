import React from 'react';
import { X } from 'lucide-react';
import { getModalContainerProps, getModalContentProps } from '@/utils/modalUtils';

const GenerationModal = ({ title, description, onClose, children }) => {
  return (
    <div {...getModalContainerProps(onClose)}>
      <div {...getModalContentProps('w-full max-w-xl')}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {description && <p className="text-gray-600 mb-6">{description}</p>}

          {children}
        </div>
      </div>
    </div>
  );
};

export default GenerationModal;
