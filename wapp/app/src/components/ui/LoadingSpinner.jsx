import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
    </div>
  );
}
