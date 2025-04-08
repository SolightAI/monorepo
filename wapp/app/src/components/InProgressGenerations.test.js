import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import InProgressGenerations from './InProgressGenerations';
import { API_URL } from '@/config';

// Mock axios
jest.mock('axios');

describe('InProgressGenerations', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    render(<InProgressGenerations />);
    expect(screen.getByText('Loading generations...')).toBeInTheDocument();
  });

  it('should display in-progress generations', async () => {
    const mockGenerations = [
      {
        id: '1',
        type: 'epic',
        status: 'in_progress',
        progress: 50,
        details: 'Generating epic content...',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        type: 'feature',
        status: 'in_progress',
        progress: 30,
        details: 'Generating feature content...',
        created_at: new Date().toISOString()
      }
    ];

    axios.get.mockResolvedValueOnce({ data: mockGenerations });

    render(<InProgressGenerations />);

    // Wait for the loading state to disappear
    await waitFor(() => {
      expect(screen.queryByText('Loading generations...')).not.toBeInTheDocument();
    });

    // Check if generations are displayed
    expect(screen.getByText('Generating epic content...')).toBeInTheDocument();
    expect(screen.getByText('Generating feature content...')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    axios.get.mockRejectedValueOnce(new Error('API Error'));

    render(<InProgressGenerations />);

    await waitFor(() => {
      expect(screen.getByText('Error loading generations')).toBeInTheDocument();
    });
  });

  it('should show empty state when no generations are in progress', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    render(<InProgressGenerations />);

    await waitFor(() => {
      expect(screen.getByText('No generations in progress')).toBeInTheDocument();
    });
  });

  it('should poll for updates every 3 seconds', async () => {
    jest.useFakeTimers();

    const mockGenerations = [
      {
        id: '1',
        type: 'epic',
        status: 'in_progress',
        progress: 50,
        details: 'Generating epic content...',
        created_at: new Date().toISOString()
      }
    ];

    axios.get.mockResolvedValueOnce({ data: mockGenerations });

    render(<InProgressGenerations />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Generating epic content...')).toBeInTheDocument();
    });

    // Fast forward 3 seconds
    jest.advanceTimersByTime(3000);

    // Verify that axios.get was called again
    expect(axios.get).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
}); 