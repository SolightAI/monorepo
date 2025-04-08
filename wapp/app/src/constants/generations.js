// API Endpoints
export const GENERATIONS_API = {
  IN_PROGRESS: '/api/generations/in-progress'
};

// Polling Configuration
export const POLLING = {
  INTERVAL: 3000, // 3 seconds
  INITIAL_DELAY: 1000 // 1 second
};

// Generation Types
export const GENERATION_TYPES = {
  EPIC: 'epic',
  EPIC_ALL: 'epic_all',
  FEATURE: 'feature',
  FEATURE_ALL: 'feature_all',
  USER_STORY: 'user_story',
  USER_STORY_ALL: 'user_story_all'
};

// Error Messages
export const ERROR_MESSAGES = {
  NOT_FOUND: 'No in-progress generations found',
  UNAUTHORIZED: 'Please log in to view in-progress generations',
  SERVER_ERROR: 'Server error while fetching generations',
  CONNECTION_ERROR: 'Unable to connect to the server',
  DEFAULT_ERROR: 'Error loading generations',
  CHECKING_ERROR: 'Error checking for in-progress generations'
};

// Loading Messages
export const LOADING_MESSAGES = {
  CHECKING: 'Checking for in-progress generations...'
};

// UI Constants
export const UI = {
  TOGGLE_BUTTON: {
    SHOW: 'Show In Progress Generations',
    HIDE: 'Hide In Progress Generations'
  },
  SECTIONS: {
    EPICS: 'Epics',
    FEATURES: 'Features',
    USER_STORIES: 'User Stories'
  }
}; 