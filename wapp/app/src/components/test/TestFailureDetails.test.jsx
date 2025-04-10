import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestFailureDetails from './TestFailureDetails';
import { estimateSeverityLevel } from '../../utils/severityUtils';

// Mock the severity modal component
jest.mock('../modals/TestSeverityModal', () => {
  return function MockTestSeverityModal({ onClose }) {
    return (
      <div data-testid="severity-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    );
  };
});

// Mock the severity estimation function
jest.mock('../../utils/severityUtils', () => {
  const originalModule = jest.requireActual('../../utils/severityUtils');
  return {
    ...originalModule,
    estimateSeverityLevel: jest.fn(() => 'P1'),
    getSeverityInfo: jest.fn(() => ({
      name: 'Critical',
      description: 'Critical issue blocking core functionality',
      colorClasses: 'bg-red-100 text-red-800 border-red-200',
    })),
  };
});

describe('TestFailureDetails', () => {
  const defaultProps = {
    testData: {
      name: 'Login Test',
      description: 'Test user login functionality',
      url: 'https://example.com/login',
    },
    errorDetails: {
      message: 'Authentication failed',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with error message', () => {
    render(<TestFailureDetails {...defaultProps} />);
    
    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    expect(screen.getByText(/P1 - Critical/i)).toBeInTheDocument();
  });

  test('calls estimateSeverityLevel with correct parameters', () => {
    render(<TestFailureDetails {...defaultProps} />);
    
    expect(estimateSeverityLevel).toHaveBeenCalledWith(
      defaultProps.testData,
      defaultProps.errorDetails
    );
  });

  test('opens severity modal when clicked', () => {
    render(<TestFailureDetails {...defaultProps} />);
    
    // Initially, the modal should not be visible
    expect(screen.queryByTestId('severity-modal')).not.toBeInTheDocument();
    
    // Click on the component to open the modal
    fireEvent.click(screen.getByText(/P1 - Critical/i));
    
    // Now the modal should be visible
    expect(screen.getByTestId('severity-modal')).toBeInTheDocument();
  });

  test('closes severity modal when close handler is called', () => {
    render(<TestFailureDetails {...defaultProps} />);
    
    // Open the modal first
    fireEvent.click(screen.getByText(/P1 - Critical/i));
    
    // The modal should be visible
    expect(screen.getByTestId('severity-modal')).toBeInTheDocument();
    
    // Click the close button in the modal
    fireEvent.click(screen.getByText('Close Modal'));
    
    // The modal should no longer be visible
    expect(screen.queryByTestId('severity-modal')).not.toBeInTheDocument();
  });

  test('handles missing error message', () => {
    render(
      <TestFailureDetails
        testData={defaultProps.testData}
        errorDetails={{}}
      />
    );
    
    // Should show default message
    expect(screen.getByText(/Test failed. No additional details available/i)).toBeInTheDocument();
  });
}); 