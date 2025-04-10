import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestSeverityModal from './TestSeverityModal';
import { SEVERITY_LEVELS } from '../../utils/severityUtils';

describe('TestSeverityModal', () => {
  const mockOnClose = jest.fn();
  const defaultProps = {
    severityLevel: SEVERITY_LEVELS.P1,
    testData: {
      name: 'Login Test',
      description: 'Test user login functionality'
    },
    errorDetails: {
      message: 'Authentication failed. Unable to login.'
    },
    onClose: mockOnClose
  };

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  test('renders with P1 severity level correctly', () => {
    render(<TestSeverityModal {...defaultProps} />);
    
    // Check title
    expect(screen.getByText(/Test Failed - Critical Issue/i)).toBeInTheDocument();
    
    // Check severity level display
    expect(screen.getByText(/Severity Level: P1 - Critical/i)).toBeInTheDocument();
    
    // Check that test information is displayed
    expect(screen.getByText('Login Test')).toBeInTheDocument();
    expect(screen.getByText('Test user login functionality')).toBeInTheDocument();
    
    // Check that error details are displayed
    expect(screen.getByText('Authentication failed. Unable to login.')).toBeInTheDocument();
  });

  test('renders with P2 severity level correctly', () => {
    render(
      <TestSeverityModal
        {...defaultProps}
        severityLevel={SEVERITY_LEVELS.P2}
        testData={{
          name: 'Dashboard Test',
          description: 'Test dashboard metrics display'
        }}
        errorDetails={{
          message: 'Dashboard metrics failed to load'
        }}
      />
    );
    
    expect(screen.getByText(/Test Failed - High Issue/i)).toBeInTheDocument();
    expect(screen.getByText(/Severity Level: P2 - High/i)).toBeInTheDocument();
  });

  test('renders with P3 severity level correctly', () => {
    render(
      <TestSeverityModal
        {...defaultProps}
        severityLevel={SEVERITY_LEVELS.P3}
        testData={{
          name: 'UI Test',
          description: 'Test button styling'
        }}
        errorDetails={{
          message: 'Button has incorrect color'
        }}
      />
    );
    
    expect(screen.getByText(/Test Failed - Medium Issue/i)).toBeInTheDocument();
    expect(screen.getByText(/Severity Level: P3 - Medium/i)).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(<TestSeverityModal {...defaultProps} />);
    
    // Find and click the close button (X icon)
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when bottom close button is clicked', () => {
    render(<TestSeverityModal {...defaultProps} />);
    
    // Find and click the bottom "Close" button
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
}); 