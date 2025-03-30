import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader, AlertCircle, ArrowLeft, TestTube, Plus,
  CheckCircle, XCircle, Sparkles, CheckSquare, Edit, Zap, Play
} from 'lucide-react';
import AddTestModal from '@/components/modals/AddTestModal';
import TestDetailsModal from '@/components/modals/TestDetailsModal';
import AddUserStoryModal from '@/components/modals/AddUserStoryModal';
import { triggerFeatureTestGeneration, getTestGenerationStatus } from '@/services/testService';
import { triggerUserStoriesGeneration, getUserStoriesGenerationStatus } from '@/services/userStoryService';
import { generateAcceptanceCriteria, getAcceptanceCriteriaGenerationStatus } from '@/api/acceptanceCriteriaGeneration';
import { createTestExecution } from '@/services/testExecutionService';
import EditFeatureModal from '@/components/modals/EditFeatureModal';
import EditUserStoryModal from '@/components/modals/EditUserStoryModal';
import EditAcceptanceCriteriaModal from '@/components/modals/EditAcceptanceCriteriaModal';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const FeatureDetails = () => {
  const { featureId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feature, setFeature] = useState(null);
  const [userStories, setUserStories] = useState([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState([]);

  // State for Add Test Modal
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false);
  const [isTestDetailsModalOpen, setIsTestDetailsModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [isAddUserStoryModalOpen, setIsAddUserStoryModalOpen] = useState(false);
  const [isEditFeatureModalOpen, setIsEditFeatureModalOpen] = useState(false);

  // Edit states for user stories and acceptance criteria
  const [isEditUserStoryModalOpen, setIsEditUserStoryModalOpen] = useState(false);
  const [selectedUserStory, setSelectedUserStory] = useState(null);
  const [isEditAcceptanceCriteriaModalOpen, setIsEditAcceptanceCriteriaModalOpen] = useState(false);
  const [selectedAcceptanceCriteria, setSelectedAcceptanceCriteria] = useState(null);

  // Sequential generation states
  const [isGeneratingSequential, setIsGeneratingSequential] = useState(false);
  const [sequentialGenerationMessage, setSequentialGenerationMessage] = useState(null);

  // Simplified generation state
  const [generationState, setGenerationState] = useState({
    isGenerating: false,
    type: null, // 'user-stories', 'acceptance-criteria', 'tests'
    taskId: null,
    message: null
  });

  // Simplified modal state
  const [modalState, setModalState] = useState({
    type: null,
    isOpen: false
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchFeatureDetails();
  }, [featureId]);

  const fetchFeatureDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch feature details
      const featureResponse = await axios.get(`${API_URL}/features/${featureId}`, {
        withCredentials: true
      });

      // Fetch tests by feature
      const testsResponse = await axios.get(`${API_URL}/tests/by-feature/${featureId}`, {
        withCredentials: true
      });

      // Fetch acceptance criteria for this feature
      const criteriaResponse = await axios.get(`${API_URL}/acceptance-criteria/by-feature/${featureId}`, {
        withCredentials: true
      });

      // Combine feature data with tests
      const featureData = featureResponse.data;
      featureData.tests = testsResponse.data;

      // IMPORTANT: Set user stories from the feature data
      if (featureData.user_stories) {
        setUserStories(featureData.user_stories);
      } else {
        // Make a dedicated request to get user stories
        try {
          const userStoriesResponse = await axios.get(`${API_URL}/user-stories/by-feature/${featureId}`, {
            withCredentials: true
          });
          if (userStoriesResponse.data && userStoriesResponse.data.length > 0) {
            setUserStories(userStoriesResponse.data);
          }
        } catch (userStoriesErr) {
          console.error('Error fetching user stories directly:', userStoriesErr);
        }
      }

      // Set acceptance criteria
      setAcceptanceCriteria(criteriaResponse.data);

      setFeature(featureData);
    } catch (err) {
      console.error('Error fetching feature details:', err);
      setError('Failed to fetch feature details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle test added
  const handleTestAdded = async (newTest) => {
    console.log("Test added:", newTest);

    try {
      // Make API call to save the test
      const response = await axios.post(
        `${API_URL}/tests/`,
        {
          ...newTest,
          feature_id: featureId
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Test saved to API:", response.data);

      // Update the feature state with the response data from the API
      setFeature(prevFeature => ({
        ...prevFeature,
        tests: [...(prevFeature.tests || []), response.data]
      }));
    } catch (err) {
      console.error('Error saving test:', err);
      // Could add error state and show error message to user here
    }

    // Ensure modal is closed
    setIsAddTestModalOpen(false);
  };

  // Handle user story added
  const handleUserStoryAdded = (newUserStory) => {
    // Update the user stories state with the new user story
    setUserStories(prevUserStories => [...prevUserStories, newUserStory]);
  };

  // Handle acceptance criteria added
  const handleAddAcceptanceCriteria = () => {
    // Implement the logic for adding acceptance criteria manually
    console.log('Add acceptance criteria clicked');
  };

  // Handle feature updated
  const handleFeatureUpdated = (updatedFeature) => {
    setFeature(updatedFeature);
    fetchFeatureDetails();
  };

  // Handle user story updated
  const handleUserStoryUpdated = (updatedUserStory) => {
    setUserStories(prevUserStories =>
      prevUserStories.map(story =>
        story.id === updatedUserStory.id ? updatedUserStory : story
      )
    );
    fetchFeatureDetails();
  };

  // Handle acceptance criteria updated
  const handleAcceptanceCriteriaUpdated = (updatedCriteria) => {
    setAcceptanceCriteria(prevCriteria =>
      prevCriteria.map(criteria =>
        criteria.id === updatedCriteria.id ? updatedCriteria : criteria
      )
    );
    fetchFeatureDetails();
  };

  // Handle edit user story click
  const handleEditUserStory = (userStory) => {
    setSelectedUserStory(userStory);
    setIsEditUserStoryModalOpen(true);
  };

  // Handle edit acceptance criteria click
  const handleEditAcceptanceCriteria = (criteria) => {
    setSelectedAcceptanceCriteria(criteria);
    setIsEditAcceptanceCriteriaModalOpen(true);
  };

  // Simplified generation handlers
  const handleGenerateUserStories = async () => {
    try {
      setGenerationState({
        isGenerating: true,
        type: 'user-stories',
        taskId: null,
        message: 'Generating user stories...'
      });

      const taskId = await triggerUserStoriesGeneration(featureId);

      setGenerationState({
        isGenerating: true,
        type: 'user-stories',
        taskId: taskId,
        message: 'Generating user stories...'
      });

      setModalState({
        type: 'user-stories',
        isOpen: true
      });
    } catch (err) {
      console.error('Error triggering user stories generation:', err);
      setError('Failed to trigger user stories generation. Please try again.');
      setGenerationState({
        isGenerating: false,
        type: null,
        taskId: null,
        message: null
      });
    }
  };

  const handleGenerateAcceptanceCriteria = async () => {
    try {
      // First set loading state
      setGenerationState({
        isGenerating: true,
        type: 'acceptance-criteria',
        taskId: null,
        message: 'Generating acceptance criteria...'
      });

      // Get the task ID
      const taskId = await generateAcceptanceCriteria(featureId);

      // Update state with taskId in a single update
      setGenerationState({
        isGenerating: true,
        type: 'acceptance-criteria',
        taskId: taskId,
        message: 'Generating acceptance criteria...'
      });

      setModalState({
        type: 'acceptance-criteria',
        isOpen: true
      });
    } catch (err) {
      console.error('Error triggering acceptance criteria generation:', err);
      setError('Failed to trigger acceptance criteria generation. Please try again.');
      setGenerationState({
        isGenerating: false,
        type: null,
        taskId: null,
        message: null
      });
    }
  };

  const handleGenerateTest = async () => {
    try {
      console.log("Starting test generation process...");

      // Set initial generation state
      setGenerationState({
        isGenerating: true,
        type: 'tests',
        taskId: null,
        message: 'Generating tests...'
      });

      console.log("Calling triggerFeatureTestGeneration...");
      const response = await triggerFeatureTestGeneration(featureId);
      console.log("Received test generation response:", response);

      // Handle different possible response formats
      let taskId;
      if (response && typeof response === 'object') {
        // If response is an object, try to extract taskId from common properties
        taskId = response.taskId || response.task_id || response.id;
        console.log("Extracted taskId from object:", taskId);
      } else if (response) {
        // If response is not an object but truthy, use it directly
        taskId = response;
        console.log("Using response directly as taskId:", taskId);
      }

      // Even if taskId is not what we expected, proceed anyway since the test appears to be starting
      console.log("Setting generationState with taskId/response:", taskId || response);

      // if taskid is null, console log the error
      if (!taskId) {
        console.error("No taskId received from triggerFeatureTestGeneration");
        setError('Failed to start test generation: No task ID received');
        return;
      }

      // Always proceed with polling, even without a specific taskId
      setGenerationState({
        isGenerating: true,
        type: 'tests',
        taskId: taskId, // Use 'polling' as a fallback
        message: 'Generating tests...'
      });

      // Set modal state
      setModalState({
        type: 'tests',
        isOpen: true
      });

      console.log("Test generation initiated");
    } catch (err) {
      console.error('Error triggering test generation:', err);
      setError('Failed to trigger test generation. Please try again.');
      setGenerationState({
        isGenerating: false,
        type: null,
        taskId: null,
        message: null
      });
    }
  };

  // Add polling effect for generation status
  useEffect(() => {
    if (generationState.isGenerating && generationState.taskId) {
      console.log(`Starting polling for ${generationState.type} generation with task ID: ${generationState.taskId}`);

      const interval = setInterval(async () => {
        try {
          console.log(`Checking status for ${generationState.type} generation...`);
          let statusResponse;

          switch (generationState.type) {
            case 'user-stories':
              statusResponse = await getUserStoriesGenerationStatus(generationState.taskId);
              break;
            case 'acceptance-criteria':
              statusResponse = await getAcceptanceCriteriaGenerationStatus(generationState.taskId);
              break;
            case 'tests':
              statusResponse = await getTestGenerationStatus(generationState.taskId);
              break;
            default:
              return;
          }

          console.log(`Status response for ${generationState.type}:`, statusResponse);

          if (statusResponse && statusResponse.status === 'completed') {
            console.log(`${generationState.type} generation completed!`);

            // Store the results for direct use
            const generatedResults = statusResponse.results || [];
            console.log(`Generated results:`, generatedResults);

            // Clear the interval immediately to prevent multiple calls
            clearInterval(interval);

            // Add a delay before fetching the updated data
            await new Promise(resolve => setTimeout(resolve, 2000));
            await fetchFeatureDetails();

            // Call handleGenerationComplete with the actual results
            handleGenerationComplete(generatedResults);
          } else if (statusResponse && statusResponse.status === 'error') {
            console.error('Generation error:', statusResponse);
            setError(`${generationState.type} generation failed. Please try again.`);

            // Clear the interval immediately
            clearInterval(interval);

            setGenerationState({
              isGenerating: false,
              type: null,
              taskId: null,
              message: null
            });
            setModalState({
              type: null,
              isOpen: false
            });
            if (isGeneratingSequential) {
              setIsGeneratingSequential(false);
              setSequentialGenerationMessage(null);
            }
          } else {
            console.log(`${generationState.type} generation still in progress...`);
          }
        } catch (err) {
          console.error('Error checking generation status:', err);
          setError('Failed to check generation status.');

          // Clear the interval immediately
          clearInterval(interval);

          setGenerationState({
            isGenerating: false,
            type: null,
            taskId: null,
            message: null
          });
          setModalState({
            type: null,
            isOpen: false
          });
          if (isGeneratingSequential) {
            setIsGeneratingSequential(false);
            setSequentialGenerationMessage(null);
          }
        }
      }, 3000); // Poll every 3 seconds

      return () => {
        console.log(`Cleaning up polling for ${generationState.type}`);
        clearInterval(interval);
      };
    }
  }, [generationState.isGenerating, generationState.taskId, generationState.type]);

  const handleGenerationComplete = async (generatedResults = []) => {
    console.log(`Generation complete for ${generationState.type} with results:`, generatedResults);

    // First fetch updated data
    await fetchFeatureDetails();

    // Then close the modal
    setModalState({
      type: null,
      isOpen: false
    });

    if (generationState.type === 'tests') {
      // If this was the final step in sequential generation
      if (isGeneratingSequential) {
        console.log("All sequential generation complete!");
        setIsGeneratingSequential(false);
        setSequentialGenerationMessage(null);
        setError(null);
      }
    } else if (isGeneratingSequential) {
      // Continue with the next step in the sequence
      if (generationState.type === 'user-stories') {
        console.log("User stories generation complete, processing results...");

        // Use the generated results directly if the API didn't return them
        if ((!userStories || userStories.length === 0) && generatedResults && generatedResults.length > 0) {
          console.log("Setting user stories directly from generated results:", generatedResults);
          // Ensure each story has a unique ID
          const storiesWithIds = generatedResults.map((story, index) =>
            story.id ? story : { ...story, id: `temp-${Date.now()}-${index}` }
          );
          setUserStories(storiesWithIds);
        }

        // Add a longer delay and fetch fresh data AGAIN before continuing
        setTimeout(async () => {
          console.log("Fetching updated data before continuing to acceptance criteria...");
          await fetchFeatureDetails();

          // Check if user stories are in the API response
          let currentUserStories = userStories;
          console.log("Current user stories after refresh:", currentUserStories);

          // If API still doesn't have user stories, use our generated ones
          if ((!currentUserStories || currentUserStories.length === 0) && generatedResults && generatedResults.length > 0) {
            console.log("API still doesn't have user stories, using generated ones");
            // Ensure each story has a unique ID
            const storiesWithIds = generatedResults.map((story, index) =>
              story.id ? story : { ...story, id: `temp-${Date.now()}-${index}` }
            );
            currentUserStories = storiesWithIds;
            setUserStories(storiesWithIds);
          }

          // Additional delay to ensure data is updated
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Only continue if we actually have user stories (either from API or generated)
          if (currentUserStories && currentUserStories.length > 0) {
            console.log("Continuing to acceptance criteria generation with user stories:", currentUserStories);
            continueWithAcceptanceCriteriaGeneration(currentUserStories);
          } else {
            console.error("No user stories available after generation");
            setError('User stories were generated but could not be loaded. Please try again or continue manually.');
            setIsGeneratingSequential(false);
          }
        }, 5000); // Increased delay
      } else if (generationState.type === 'acceptance-criteria') {
        // Use the generated results directly if the API didn't return them
        if ((!acceptanceCriteria || acceptanceCriteria.length === 0) && generatedResults && generatedResults.length > 0) {
          setAcceptanceCriteria(generatedResults);
        }

        // Add a longer delay and fetch fresh data AGAIN before continuing
        setTimeout(async () => {
          await fetchFeatureDetails();

          // Check if acceptance criteria are in the API response
          let currentAcceptanceCriteria = acceptanceCriteria;

          // If API still doesn't have acceptance criteria, use our generated ones
          if ((!currentAcceptanceCriteria || currentAcceptanceCriteria.length === 0) && generatedResults && generatedResults.length > 0) {
            currentAcceptanceCriteria = generatedResults;
            setAcceptanceCriteria(generatedResults);
          }

          // Additional delay to ensure data is updated
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Only continue if we actually have acceptance criteria (either from API or generated)
          if (currentAcceptanceCriteria && currentAcceptanceCriteria.length > 0) {
            continueWithTestGeneration(currentAcceptanceCriteria);
          } else {
            setError('Acceptance criteria were generated but could not be loaded. Please try again or continue manually.');
            setIsGeneratingSequential(false);
          }
        }, 5000); // Increased delay
      } else {
        console.error('Unknown generation step:', generationState.type);
      }
    }

    // Always reset the generation state at the end
    setGenerationState({
      isGenerating: false,
      type: null,
      taskId: null,
      message: null
    });
  };

  const getTestStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'FAILED':
        return <XCircle size={20} className="text-red-500" />;
      case 'PENDING':
        return <Loader size={20} className="text-yellow-500" />;
      case 'NOT_STARTED':
        return <TestTube size={20} className="text-gray-400" />;
      default:
        return <TestTube size={20} className="text-gray-400" />;
    }
  };

  const getTestStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PASSED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'NOT_STARTED':
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString();
  };

  // Handle test click to open details modal
  const handleTestClick = (test) => {
    setSelectedTest(test);
    setIsTestDetailsModalOpen(true);
  };

  // Handle sequential generation
  const handleSequentialGeneration = async () => {
    try {
      setIsGeneratingSequential(true);
      setError(null);

      // Check if user stories already exist
      if (userStories && userStories.length > 0) {
        setSequentialGenerationMessage('User stories already exist, continuing with acceptance criteria...');

        // Add a small delay before starting the next step
        await new Promise(resolve => setTimeout(resolve, 1000));
        continueWithAcceptanceCriteriaGeneration();
      } else {
        setSequentialGenerationMessage('Generating user stories...');

        try {
          // Trigger user stories generation
          const userStoriesTaskId = await triggerUserStoriesGeneration(featureId);

          // IMPORTANT: Set the generation state to trigger polling
          setGenerationState({
            isGenerating: true,
            type: 'user-stories',
            taskId: userStoriesTaskId,
            message: 'Generating user stories...'
          });

        } catch (err) {
          console.error('Error triggering user stories generation:', err);
          setError('Failed to trigger user stories generation. Sequential generation stopped.');
          setIsGeneratingSequential(false);
          return;
        }
      }
    } catch (err) {
      console.error('Error in sequential generation:', err);
      setError('Failed to complete sequential generation. Please try again.');
      setIsGeneratingSequential(false);
    }
  };

  // Add new function to continue with acceptance criteria generation
  const continueWithAcceptanceCriteriaGeneration = async (providedUserStories = null) => {
    try {

      // First fetch fresh data to ensure we have the latest user stories and acceptance criteria
      await fetchFeatureDetails();

      // Use provided user stories if they exist, otherwise use state
      const effectiveUserStories = providedUserStories || userStories;

      // Add a delay to ensure database is fully updated
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if acceptance criteria already exist
      if (acceptanceCriteria && acceptanceCriteria.length > 0) {
        setSequentialGenerationMessage('Acceptance criteria already exist, continuing with test generation...');

        // Add a small delay before starting the next step
        await new Promise(resolve => setTimeout(resolve, 1000));
        continueWithTestGeneration(acceptanceCriteria);
        return;
      }

      setSequentialGenerationMessage('Generating acceptance criteria...');

      // Double-check if we have user stories before proceeding
      if (!effectiveUserStories || effectiveUserStories.length === 0) {
        setError('No user stories found. Cannot generate acceptance criteria.');
        setIsGeneratingSequential(false);
        return;
      }

      try {
        // Generate acceptance criteria
        const taskId = await generateAcceptanceCriteria(featureId);

        // Set the generation state to trigger polling
        setGenerationState({
          isGenerating: true,
          type: 'acceptance-criteria',
          taskId: taskId,
          message: 'Generating acceptance criteria...'
        });

        // Set modal state to show progress
        setModalState({
          type: 'acceptance-criteria',
          isOpen: true
        });

      } catch (err) {
        console.error('Error generating acceptance criteria:', err);
        setError('Failed to generate acceptance criteria. Sequential generation stopped.');
        setIsGeneratingSequential(false);
        return;
      }
    } catch (err) {
      console.error('Error continuing with acceptance criteria generation:', err);
      setError('Failed to generate acceptance criteria. Sequential generation stopped.');
      setIsGeneratingSequential(false);
    }
  };

  // Add new function to continue with test generation
  const continueWithTestGeneration = async (providedAcceptanceCriteria = null) => {
    try {
      console.log("Starting sequential test generation...");
      setSequentialGenerationMessage('Generating tests...');

      // Fetch fresh data to ensure we have the latest acceptance criteria
      await fetchFeatureDetails();

      // Use provided acceptance criteria if they exist, otherwise use state
      const effectiveAcceptanceCriteria = providedAcceptanceCriteria || acceptanceCriteria;
      console.log("Effective acceptance criteria for test generation:", effectiveAcceptanceCriteria);

      // Add a delay to ensure database is fully updated
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if we have acceptance criteria before proceeding
      if (!effectiveAcceptanceCriteria || effectiveAcceptanceCriteria.length === 0) {
        console.error("No acceptance criteria found for test generation");
        setError('No acceptance criteria found. Cannot generate tests.');
        setIsGeneratingSequential(false);
        return;
      }

      try {
        // Generate tests
        console.log("Triggering test generation with featureId:", featureId);
        const response = await triggerFeatureTestGeneration(featureId);
        console.log("Received test generation response:", response);

        // Handle different possible response formats
        let taskId;
        if (response && typeof response === 'object') {
          // If response is an object, try to extract taskId from common properties
          taskId = response.taskId || response.task_id || response.id;
          console.log("Extracted taskId from object:", taskId);
        } else if (response) {
          // If response is not an object but truthy, use it directly
          taskId = response;
          console.log("Using response directly as taskId:", taskId);
        }

        // Even if we don't have a task ID, continue anyway since the generation appears to work
        console.log("Setting generationState with taskId/response:", taskId || response);

        // Set the generation state to trigger polling
        setGenerationState({
          isGenerating: true,
          type: 'tests',
          taskId: taskId || 'polling', // Use 'polling' as a fallback
          message: 'Generating tests...'
        });

        // Set modal state to show progress
        setModalState({
          type: 'tests',
          isOpen: true
        });

        console.log("Sequential test generation initiated");
      } catch (err) {
        console.error('Error triggering test generation:', err);
        setError('Failed to trigger test generation. Sequential generation stopped.');
        setIsGeneratingSequential(false);
        return;
      }
    } catch (err) {
      console.error('Error continuing with test generation:', err);
      setError('Failed to generate tests. Sequential generation stopped.');
      setIsGeneratingSequential(false);
    }
  };

  const handleRunSingleTest = async (test) => {
    try {
      const executionData = {
        test_id: test.id,
        status: 'PENDING',
        environment: 'development',
        executor_type: 'MANUAL',
        notes: null
      };

      await createTestExecution(executionData);

      // Refresh the feature details to update the test status
      await fetchFeatureDetails();
    } catch (err) {
      console.error('Error running test:', err);
      setError('Failed to run test. Please try again.');
    }
  };

  const handleRunAllTests = async () => {
    try {
      if (!feature || !feature.tests || feature.tests.length === 0) {
        setError('No tests available to run.');
        return;
      }

      // Show a loading indicator or message
      setError(null);

      // Run all tests sequentially
      for (const test of feature.tests) {
        const executionData = {
          test_id: test.id,
          status: 'PENDING',
          environment: 'development',
          executor_type: 'MANUAL',
          notes: null
        };

        await createTestExecution(executionData);
      }

      // Refresh the feature details to update the test statuses
      await fetchFeatureDetails();

      // Optional: Show success message
      setError(null);
    } catch (err) {
      console.error('Error running all tests:', err);
      setError('Failed to run all tests. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(`/epics/${feature?.epic_id}`)}
          className="flex items-center mb-6 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Epic
        </button>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
            <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-1" />
            <p>{error}</p>
          </div>
        )}

        {/* Sequential generation status message */}
        {isGeneratingSequential && (
          <div className="mb-6 p-4 bg-blue-100 border border-blue-200 text-blue-700 rounded-lg flex items-start">
            <Loader size={20} className="mr-2 flex-shrink-0 mt-1 animate-spin" />
            <p>{sequentialGenerationMessage || 'Generating content...'}</p>
          </div>
        )}

        {/* Loading indicator */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader size={40} className="text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Feature header */}
            {feature && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <TestTube size={24} className="text-purple-500 mr-3" />
                    <h1 className="text-3xl font-bold text-gray-800">{feature.name}</h1>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Add Generate All button */}
                    {((!userStories || userStories.length === 0) ||
                      (!acceptanceCriteria || acceptanceCriteria.length === 0) ||
                      (!feature?.tests || feature.tests.length === 0)) && (
                      <button
                        onClick={handleSequentialGeneration}
                        disabled={isGeneratingSequential || loading}
                        className={`flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150 ${(isGeneratingSequential || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Zap size={18} className="mr-2" />
                        {isGeneratingSequential ? 'Generating...' : 'Generate All'}
                      </button>
                    )}
                    <button
                      onClick={() => setIsEditFeatureModalOpen(true)}
                      className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-150"
                    >
                      <Edit size={16} className="mr-2" />
                      Edit Feature
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">{feature.description}</p>
                {feature.urls && feature.urls.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">URLs:</h3>
                    <ul className="list-disc pl-5">
                      {feature.urls.map((url, index) => (
                        <li key={index} className="text-blue-600 hover:underline">
                          <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* User Stories section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">User Stories</h2>
                <div className="flex space-x-2">
                  {(!userStories || userStories.length === 0) && (
                    <button
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                      onClick={handleGenerateUserStories}
                      disabled={loading}
                    >
                      <Sparkles size={18} className="mr-2" />
                      Generate User Stories
                    </button>
                  )}
                  <button
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                    onClick={() => setIsAddUserStoryModalOpen(true)}
                  >
                    <Plus size={18} className="mr-2" />
                    Add User Story
                  </button>
                </div>
              </div>

              {!userStories || userStories.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No user stories found for this feature</p>
                  <div className="flex justify-center space-x-4">
                    <button
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                      onClick={handleGenerateUserStories}
                      disabled={loading}
                    >
                      <Sparkles size={18} className="mr-2" />
                      Generate User Stories with AI
                    </button>
                    <button
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                      onClick={() => setIsAddUserStoryModalOpen(true)}
                    >
                      <Plus size={18} className="mr-2" />
                      Create Manually
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userStories.map((story, index) => (
                    <div
                      key={story.id || `temp-${index}`}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <CheckSquare size={20} className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                          <div>
                            <h3 className="text-lg font-medium text-gray-800 mb-1">{story.name}</h3>
                            {story.description && (
                              <p className="text-gray-600 mb-2">{story.description}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditUserStory(story)}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acceptance Criteria section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Acceptance Criteria</h2>
                <div className="flex space-x-2">
                  <button
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                    onClick={handleAddAcceptanceCriteria}
                  >
                    <Plus size={18} className="mr-2" />
                    Add Acceptance Criteria
                  </button>
                  {userStories && userStories.length > 0 && (!acceptanceCriteria || acceptanceCriteria.length === 0) && (
                    <button
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                      onClick={handleGenerateAcceptanceCriteria}
                      disabled={generationState.isGenerating}
                    >
                      <Sparkles size={18} className="mr-2" />
                      Generate Acceptance Criteria
                    </button>
                  )}
                </div>
              </div>

              {!acceptanceCriteria || acceptanceCriteria.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No acceptance criteria found for this feature</p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                    onClick={handleAddAcceptanceCriteria}
                  >
                    Create your first acceptance criteria
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {acceptanceCriteria.map((criteria) => (
                    <div
                      key={criteria.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <CheckSquare size={20} className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                          <div>
                            <h3 className="text-lg font-medium text-gray-800 mb-1">{criteria.name}</h3>
                            <p className="text-gray-600 mb-2">{criteria.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditAcceptanceCriteria(criteria)}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tests section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Tests</h2>
                <div className="flex space-x-3">
                  {acceptanceCriteria && acceptanceCriteria.length > 0 && (!feature?.tests || feature.tests.length === 0) && (
                    <button
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                      onClick={handleGenerateTest}
                      disabled={generationState.isGenerating}
                    >
                      <Sparkles size={18} className="mr-2" />
                      {generationState.isGenerating ? 'Generating...' : 'Generate Tests with AI'}
                    </button>
                  )}
                  {/* Add Run All Tests button */}
                  {feature?.tests && feature.tests.length > 0 && (
                    <button
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150"
                      onClick={handleRunAllTests}
                    >
                      <Play size={18} className="mr-2" />
                      Run All Tests
                    </button>
                  )}
                  <button
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                    onClick={() => setIsAddTestModalOpen(true)}
                  >
                    <Plus size={18} className="mr-2" />
                    Add Test Manually
                  </button>
                </div>
              </div>

              {!feature?.tests || feature.tests.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No tests found for this feature</p>
                  <div className="flex justify-center space-x-4">
                    {acceptanceCriteria && acceptanceCriteria.length > 0 && (!feature?.tests || feature.tests.length === 0) && (
                      <button
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                        onClick={handleGenerateTest}
                        disabled={generationState.isGenerating}
                      >
                        <Sparkles size={18} className="mr-2" />
                        {generationState.isGenerating ? 'Generating...' : 'Generate Tests with AI'}
                      </button>
                    )}
                    <button
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                      onClick={() => setIsAddTestModalOpen(true)}
                    >
                      <Plus size={18} className="mr-2" />
                      Create Test Manually
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Run</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {feature.tests.map((test) => (
                        <tr
                          key={test.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleTestClick(test)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getTestStatusIcon(test.status)}
                              <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTestStatusColor(test.status)}`}>
                                {test.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{test.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{test.category}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(test.ended_at) || 'Never run'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click event
                                handleRunSingleTest(test);
                              }}
                              className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-md flex items-center"
                            >
                              <Play size={16} className="mr-1" />
                              Run
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Other modals */}
      {isAddTestModalOpen && (
        <AddTestModal
          onClose={() => setIsAddTestModalOpen(false)}
          onAddTest={handleTestAdded}
          defaultUrl={feature?.urls?.[0] || ''}
        />
      )}

      {isTestDetailsModalOpen && selectedTest && (
        <TestDetailsModal
          onClose={() => setIsTestDetailsModalOpen(false)}
          test={selectedTest}
          onTestUpdated={fetchFeatureDetails}
        />
      )}

      {isAddUserStoryModalOpen && feature && (
        <AddUserStoryModal
          onClose={() => setIsAddUserStoryModalOpen(false)}
          featureId={featureId}
          featureName={feature.name}
          onUserStoryAdded={handleUserStoryAdded}
        />
      )}

      {isEditFeatureModalOpen && feature && (
        <EditFeatureModal
          onClose={() => setIsEditFeatureModalOpen(false)}
          feature={feature}
          onFeatureUpdated={handleFeatureUpdated}
        />
      )}

      {isEditUserStoryModalOpen && selectedUserStory && (
        <EditUserStoryModal
          onClose={() => setIsEditUserStoryModalOpen(false)}
          userStory={selectedUserStory}
          onUserStoryUpdated={handleUserStoryUpdated}
        />
      )}

      {isEditAcceptanceCriteriaModalOpen && selectedAcceptanceCriteria && (
        <EditAcceptanceCriteriaModal
          onClose={() => setIsEditAcceptanceCriteriaModalOpen(false)}
          criteria={selectedAcceptanceCriteria}
          onCriteriaUpdated={handleAcceptanceCriteriaUpdated}
        />
      )}
    </div>
  );
};

export default FeatureDetails;
