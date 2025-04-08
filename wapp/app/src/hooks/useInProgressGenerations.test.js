import { renderHook, act } from '@testing-library/react-hooks';
import axios from 'axios';
import { useInProgressGenerations } from './useInProgressGenerations';
import { API_URL } from '@/config';

// Mock axios
jest.mock('axios');

describe('useInProgressGenerations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch generations on mount', async () => {
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

    const { result } = renderHook(() => useInProgressGenerations());

    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.generations).toEqual([]);

    // Wait for the data to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Check final state
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.generations).toEqual(mockGenerations);
  });

  it('should handle API errors', async () => {
    const error = new Error('API Error');
    axios.get.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useInProgressGenerations());

    // Wait for the error to be set
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Error loading generations');
    expect(result.current.generations).toEqual([]);
  });

  it('should poll for updates every 3 seconds', async () => {
    jest.useFakeTimers();

    const mockGenerations1 = [
      {
        id: '1',
        type: 'epic',
        status: 'in_progress',
        progress: 50,
        details: 'Generating epic content...',
        created_at: new Date().toISOString()
      }
    ];

    const mockGenerations2 = [
      {
        id: '1',
        type: 'epic',
        status: 'in_progress',
        progress: 75,
        details: 'Still generating epic content...',
        created_at: new Date().toISOString()
      }
    ];

    axios.get
      .mockResolvedValueOnce({ data: mockGenerations1 })
      .mockResolvedValueOnce({ data: mockGenerations2 });

    const { result } = renderHook(() => useInProgressGenerations());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.generations).toEqual(mockGenerations1);

    // Fast forward 3 seconds
    await act(async () => {
      jest.advanceTimersByTime(3000);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.generations).toEqual(mockGenerations2);
    expect(axios.get).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
}); 