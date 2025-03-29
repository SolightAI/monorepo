import React, { useState, useEffect, useRef } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Loader, X, Check, AlertTriangle, Clock, Zap } from 'lucide-react';
import { generateEpics, getEpicGenerationStatus } from '@/api/epicGeneration';
import { generateFeatures, getFeatureGenerationStatus } from '@/api/featureGeneration';
import { triggerUserStoriesGeneration, getUserStoriesGenerationStatus } from '@/services/userStoryService';
import { generateAcceptanceCriteria, getAcceptanceCriteriaGenerationStatus } from '@/api/acceptanceCriteriaGeneration';
import axios from 'axios';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Helper functions for test generation
const generateTests = async (featureId) => {
  try {
    const testResponse = await axios.post(
      `${API_URL}/test-generation/${featureId}`,
      {},
      { withCredentials: true }
    );
    return testResponse.data.task_id;
  } catch (error) {
    console.error("Error generating tests:", error);
    throw error;
  }
};

const getTestsGenerationStatus = async (taskId) => {
  try {
    const testStatus = await axios.get(
      `${API_URL}/test-generation/status/${taskId}`,
      { withCredentials: true }
    );
    return testStatus.data;
  } catch (error) {
    console.error("Error checking test generation status:", error);
    throw error;
  }
};

// Utility function to process items in parallel with limited concurrency
const processBatch = async (items, processFn, batchSize = 3) => {
  const results = [];

  // Process items in batches to limit concurrency
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(processFn);

    // Wait for the current batch to complete before proceeding to the next
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
};

const ComprehensiveGenerationModal = ({ onClose, productId, productName, onComplete }) => {
  const [status, setStatus] = useState('preparing'); // preparing, generating-epics, generating-features, generating-user-stories, generating-acceptance-criteria, generating-tests, completed, error
  const [error, setError] = useState(null);
  const [generatedEpics, setGeneratedEpics] = useState([]);
  const [generatedFeatures, setGeneratedFeatures] = useState([]);
  const [generatedUserStories, setGeneratedUserStories] = useState([]);
  const [generatedAcceptanceCriteria, setGeneratedAcceptanceCriteria] = useState([]);
  const [generatedTests, setGeneratedTests] = useState([]);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [currentTask, setCurrentTask] = useState(null);
  const [message, setMessage] = useState('Preparing to generate everything...');
  const hasStartedGeneration = useRef(false);
  const { selectedOrganization, loading: organizationLoading } = useOrganization();

  // Add state for detailed status tracking
  const [statusLogs, setStatusLogs] = useState([]);
  const [detailedProgress, setDetailedProgress] = useState('');

  // Helper function to add status logs
  const addStatusLog = (log, type = 'info') => {
    setStatusLogs(prevLogs => {
      const newLogs = [...prevLogs, {
        time: new Date().toLocaleTimeString(),
        message: log,
        type: type // 'info', 'warning', 'error'
      }];
      // Keep only the last 10 logs to avoid overwhelming the UI
      return newLogs//;.slice(-10);
    });
  };

  // Helper to add a warning log
  const addWarningLog = (log) => {
    addStatusLog(log, 'warning');
  };

  // Helper to add an error log
  const addErrorLog = (log) => {
    addStatusLog(log, 'error');
  };

  // Start the comprehensive generation process
  useEffect(() => {
    const startComprehensiveGeneration = async () => {
      // Skip if we've already started generation (prevents double execution in StrictMode)
      if (hasStartedGeneration.current) return;

      hasStartedGeneration.current = true;

      try {
        // Step 1: Generate Epics
        setStatus('generating-epics');
        setMessage('Step 1/5: Checking for existing epics...');
        setProgress(10);

        // Check if epics already exist
        let epicResults = [];
        try {
          const epicsResponse = await axios.get(
            `${API_URL}/products/${productId}?organization_id=${selectedOrganization.id}`,
            { withCredentials: true }
          );
          epicResults = epicsResponse.data.epics || [];
          console.log(`Retrieved ${epicResults.length} existing epics for product ${productId}`);
        } catch (err) {
          addErrorLog(`Error fetching existing epics: ${err.message}`);
          // Continue with empty epicResults
        }

        if (epicResults.length === 0) {
          // Only generate epics if none exist
          setMessage('Step 1/5: Generating epics...');
          addStatusLog(`Starting epic generation for product: ${productName}`);
          const epicTaskId = await generateEpics(productId);
          let epicsCompleted = false;
          let epicPollCounter = 0;

          // Poll for epic generation completion
          while (!epicsCompleted) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between polls
            epicPollCounter++;
            setDetailedProgress(`Waiting for epics to be generated (poll #${epicPollCounter})`);

            const epicStatus = await getEpicGenerationStatus(epicTaskId);

            if (epicStatus.status === 'completed' && epicStatus.results) {
              // Epic generation is complete, but we need to fetch the epics with their IDs
              // because the task manager just returns epics without IDs (they're saved to DB separately)
              const epicsResponse = await axios.get(
                `${API_URL}/products/${productId}?organization_id=${selectedOrganization.id}`,
                { withCredentials: true }
              );
              epicResults = epicsResponse.data.epics || [];
              console.log(`Retrieved ${epicResults.length} epics for product ${productId}`);
              setGeneratedEpics(epicResults);
              epicsCompleted = true;
              setProgress(20);
              setDetailedProgress('');
              addStatusLog(`Successfully generated ${epicResults.length} epics`);
            } else if (epicStatus.status === 'error') {
              addErrorLog(`Error generating epics: ${epicStatus.error || 'Unknown error'}`);
              // Instead of throwing an error, we'll set epicsCompleted to true to exit the loop
              // and continue with an empty epicResults array
              epicsCompleted = true;
              epicResults = [];
            } else {
              // Still in progress
              if (epicPollCounter % 2 === 0) { // Only log every 6 seconds to avoid spam
                addStatusLog(`Still waiting for epics (${epicPollCounter * 3}s elapsed)`);
              }
            }
          }
        } else {
          // Use existing epics
          setGeneratedEpics(epicResults);
          setProgress(20);
          addStatusLog(`Using ${epicResults.length} existing epics`);
        }

        // Step 2: Generate Features for each Epic that doesn't already have features
        setStatus('generating-features');
        setMessage('Step 2/5: Generating features for epics that need them...');
        setProgress(30);

        let allFeatures = [];

        // Make sure we have epics to work with
        if (!epicResults || epicResults.length === 0) {
          console.warn("No epics were generated or found for this product");
          addWarningLog("No epics were found. Skipping feature generation.");
        } else {
          addStatusLog(`Starting parallel feature generation for ${epicResults.length} epics`);

          // Function to process a single epic
          const processEpic = async (epic) => {
            try {
              if (!epic || !epic.id) {
                console.warn("Skipping invalid epic:", epic);
                addStatusLog(`Skipping invalid epic: ${epic ? epic.name || 'Unnamed' : 'Unknown'}`);
                return { epic, features: [] };
              }

              console.log(`Processing epic ${epic.id}: ${epic.name}`);
              addStatusLog(`Processing epic: ${epic.name}`);

              // Check if epic already has features
              let existingFeatures = [];
              try {
                const existingFeaturesResponse = await axios.get(
                  `${API_URL}/epics/${epic.id}`,
                  { withCredentials: true }
                );
                existingFeatures = existingFeaturesResponse.data.features || [];
                console.log(`Epic ${epic.id} has ${existingFeatures.length} existing features`);
              } catch (err) {
                addErrorLog(`Error fetching existing features for epic ${epic.name}: ${err.message}`);
                // Continue with empty existing features
              }

              if (existingFeatures.length === 0) {
                // Only generate features if none exist
                console.log(`Generating features for epic ${epic.id}`);
                addStatusLog(`Generating features for epic: ${epic.name}`);

                try {
                  const featureTaskId = await generateFeatures(epic.id);
                  let featuresCompleted = false;
                  let pollCounter = 0;
                  let epicFeatures = [];

                  while (!featuresCompleted) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    pollCounter++;

                    try {
                      const featureStatus = await getFeatureGenerationStatus(featureTaskId);

                      if (featureStatus.status === 'completed' && featureStatus.results) {

                        // wait 5.1s before fetching features to give the DB time to update
                        await new Promise(resolve => setTimeout(resolve, 5100));

                        // Fetch features from database to get their IDs
                        try {
                          const featuresResponse = await axios.get(
                            `${API_URL}/epics/${epic.id}`,
                            { withCredentials: true }
                          );
                          epicFeatures = featuresResponse.data.features || [];
                        } catch (err) {
                          addErrorLog(`Error fetching features for epic ${epic.name}: ${err.message}`);
                          // Continue with empty features
                        }

                        featuresCompleted = true;
                        addStatusLog(`Generated ${epicFeatures.length} features for epic: ${epic.name}`);

                        // Check if any features were actually generated
                        if (epicFeatures.length === 0) {
                          addWarningLog(`No features were generated for epic: ${epic.name}`);
                        }
                      } else if (featureStatus.status === 'error') {
                        addErrorLog(`Error generating features for epic ${epic.name}: ${featureStatus.error || 'Unknown error'}`);
                        featuresCompleted = true;
                        // epicFeatures is already an empty array
                      } else {
                        // It's still in progress
                        if (pollCounter % 2 === 0) { // Log less frequently to avoid spam
                          console.log(`Still generating features for epic ${epic.name} (${pollCounter * 3}s elapsed)`);
                        }
                      }
                    } catch (err) {
                      addErrorLog(`Error checking feature generation status for epic ${epic.name}: ${err.message}`);
                      featuresCompleted = true;
                      // Continue with empty features
                    }
                  }

                  return { epic, features: epicFeatures };
                } catch (err) {
                  addErrorLog(`Error initiating feature generation for epic ${epic.name}: ${err.message}`);
                  return { epic, features: [] };
                }
              } else {
                // Return existing features if they already exist
                addStatusLog(`Epic ${epic.name} already has ${existingFeatures.length} features`);
                return { epic, features: existingFeatures };
              }
            } catch (err) {
              console.error(`Error processing epic ${epic.id}:`, err);
              addErrorLog(`Error processing epic ${epic.name}: ${err.message}`);
              return { epic, features: [] };
            }
          };

          // Process epics in parallel with limited concurrency
          setDetailedProgress(`Processing ${epicResults.length} epics in parallel batches...`);

          // Track progress for updating UI
          let processedEpics = 0;
          const totalEpics = epicResults.length;
          const updateProgress = () => {
            processedEpics++;
            const epicProgress = 30 + (20 * (processedEpics / totalEpics));
            setProgress(Math.min(50, epicProgress));
            setDetailedProgress(`Processed ${processedEpics} of ${totalEpics} epics`);
          };

          // Wrap the processEpic function to track progress
          const processEpicWithProgress = async (epic) => {
            const result = await processEpic(epic);
            updateProgress();
            return result;
          };

          // Process epics in parallel batches
          const epicProcessResults = await processBatch(epicResults, processEpicWithProgress, 3);

          // Flatten the features array
          allFeatures = epicProcessResults.flatMap(result => result.features);
        }

        setDetailedProgress('');
        setGeneratedFeatures(allFeatures);
        setProgress(50);
        addStatusLog(`Completed feature generation with ${allFeatures.length} total features`);

        // Step 3: Generate User Stories for each Feature that doesn't already have user stories
        setStatus('generating-user-stories');
        setMessage('Step 3/5: Generating user stories for features that need them...');

        let allUserStories = [];

        // Make sure we have features to work with
        if (!allFeatures || allFeatures.length === 0) {
          console.warn("No features were generated or found for this product");
          addWarningLog("No features available for user story generation");
        } else {
          addStatusLog(`Starting parallel user story generation for ${allFeatures.length} features`);

          // Function to process a single feature for user stories
          const processFeatureForUserStories = async (feature) => {
            try {
              if (!feature || !feature.id) {
                console.warn("Skipping invalid feature:", feature);
                addStatusLog(`Skipping invalid feature for user stories: ${feature ? feature.name || 'Unnamed' : 'Unknown'}`);
                return { feature, userStories: [] };
              }

              console.log(`Processing feature ${feature.id}: ${feature.name}`);
              addStatusLog(`Processing user stories for feature: ${feature.name}`);

              // Check if feature already has user stories
              let existingUserStories = [];
              try {
                const existingUserStoriesResponse = await axios.get(
                  `${API_URL}/features/${feature.id}`,
                  { withCredentials: true }
                );
                existingUserStories = existingUserStoriesResponse.data.user_stories || [];
                console.log(`Feature ${feature.id} has ${existingUserStories.length} existing user stories`);
              } catch (err) {
                addErrorLog(`Error fetching existing user stories for feature ${feature.name}: ${err.message}`);
                // Continue with empty existing user stories
              }

              if (existingUserStories.length === 0) {
                // Only generate user stories if none exist
                console.log(`Generating user stories for feature ${feature.id}`);
                addStatusLog(`Generating user stories for feature: ${feature.name}`);

                try {
                  const userStoryTaskId = await triggerUserStoriesGeneration(feature.id);
                  let userStoriesCompleted = false;
                  let pollCounter = 0;
                  let featureUserStories = [];

                  while (!userStoriesCompleted) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    pollCounter++;

                    try {
                      const userStoryStatus = await getUserStoriesGenerationStatus(userStoryTaskId);

                      if (userStoryStatus.status === 'completed' && userStoryStatus.results) {
                        // Fetch user stories from database to get their IDs
                        try {
                          const userStoriesResponse = await axios.get(
                            `${API_URL}/features/${feature.id}`,
                            { withCredentials: true }
                          );
                          featureUserStories = userStoriesResponse.data.user_stories || [];
                        } catch (err) {
                          addErrorLog(`Error fetching user stories for feature ${feature.name}: ${err.message}`);
                          // Continue with empty user stories
                        }

                        userStoriesCompleted = true;
                        addStatusLog(`Generated ${featureUserStories.length} user stories for feature: ${feature.name}`);

                        // Check if any user stories were actually generated
                        if (featureUserStories.length === 0) {
                          addWarningLog(`No user stories were generated for feature: ${feature.name}`);
                        }
                      } else if (userStoryStatus.status === 'error') {
                        addErrorLog(`Error generating user stories for feature ${feature.name}: ${userStoryStatus.error || 'Unknown error'}`);
                        userStoriesCompleted = true;
                        // featureUserStories is already an empty array
                      } else {
                        // It's still in progress
                        if (pollCounter % 2 === 0) { // Log less frequently to avoid spam
                          console.log(`Still generating user stories for feature ${feature.name} (${pollCounter * 3}s elapsed)`);
                        }
                      }
                    } catch (err) {
                      addErrorLog(`Error checking user story generation status for feature ${feature.name}: ${err.message}`);
                      userStoriesCompleted = true;
                      // Continue with empty user stories
                    }
                  }

                  return { feature, userStories: featureUserStories };
                } catch (err) {
                  addErrorLog(`Error initiating user story generation for feature ${feature.name}: ${err.message}`);
                  return { feature, userStories: [] };
                }
              } else {
                // Return existing user stories if they already exist
                addStatusLog(`Feature ${feature.name} already has ${existingUserStories.length} user stories`);
                return { feature, userStories: existingUserStories };
              }
            } catch (err) {
              console.error(`Error processing feature ${feature.id}:`, err);
              addErrorLog(`Error generating user stories for feature ${feature ? feature.name : 'unknown'}: ${err.message}`);
              return { feature, userStories: [] };
            }
          };

          // Process features in parallel with limited concurrency
          setDetailedProgress(`Processing ${allFeatures.length} features in parallel batches for user stories...`);

          // Track progress for updating user story generation
          let processedUserStoryFeatures = 0;
          const totalFeatures = allFeatures.length;
          const updateUserStoryProgress = () => {
            processedUserStoryFeatures++;
            const featureProgress = 50 + (20 * (processedUserStoryFeatures / totalFeatures));
            setProgress(Math.min(70, featureProgress));
            setDetailedProgress(`Processed ${processedUserStoryFeatures} of ${totalFeatures} features for user stories`);
          };

          // Wrap the processFeature function to track progress
          const processFeatureWithProgress = async (feature) => {
            const result = await processFeatureForUserStories(feature);
            updateUserStoryProgress();
            return result;
          };

          // Process features in parallel batches
          const userStoryProcessResults = await processBatch(allFeatures, processFeatureWithProgress, 3);

          // Flatten the user stories array
          allUserStories = userStoryProcessResults.flatMap(result => result.userStories);
        }

        setDetailedProgress('');
        setGeneratedUserStories(allUserStories);
        setProgress(70);
        addStatusLog(`Completed user story generation with ${allUserStories.length} total user stories`);

        // Step 4: Generate Acceptance Criteria for each Feature that doesn't already have acceptance criteria
        setStatus('generating-acceptance-criteria');
        setMessage('Step 4/5: Generating acceptance criteria for features that need them...');

        let allAcceptanceCriteria = [];

        // Make sure we have features to work with
        if (!allFeatures || allFeatures.length === 0) {
          console.warn("No features available for acceptance criteria generation");
          addWarningLog("No features available for acceptance criteria generation");
        } else {
          addStatusLog(`Starting parallel acceptance criteria generation for ${allFeatures.length} features`);

          // Function to process a single feature for acceptance criteria
          const processFeatureForAC = async (feature) => {
            try {
              if (!feature || !feature.id) {
                console.warn("Skipping invalid feature for acceptance criteria:", feature);
                addStatusLog(`Skipping invalid feature for acceptance criteria: ${feature ? feature.name || 'Unnamed' : 'Unknown'}`);
                return { feature, acceptanceCriteria: [] };
              }

              console.log(`Processing acceptance criteria for feature ${feature.id}: ${feature.name}`);
              addStatusLog(`Processing acceptance criteria for feature: ${feature.name}`);

              // Check if feature already has acceptance criteria
              let existingAC = [];
              try {
                const existingACResponse = await axios.get(
                  `${API_URL}/acceptance-criteria/by-feature/${feature.id}`,
                  { withCredentials: true }
                );
                existingAC = existingACResponse.data;
                console.log(`Feature ${feature.id} has ${existingAC.length} existing acceptance criteria`);
              } catch (err) {
                addErrorLog(`Error fetching existing acceptance criteria for feature ${feature.name}: ${err.message}`);
                // Continue with empty existing criteria
              }

              if (existingAC.length === 0) {
                // Only generate acceptance criteria if none exist
                console.log(`Generating acceptance criteria for feature ${feature.id}`);
                addStatusLog(`Generating acceptance criteria for feature: ${feature.name}`);

                try {
                  const acTaskId = await generateAcceptanceCriteria(feature.id);
                  let acCompleted = false;
                  let pollCounter = 0;
                  let featureAC = [];

                  while (!acCompleted) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    pollCounter++;

                    try {
                      const acStatus = await getAcceptanceCriteriaGenerationStatus(acTaskId);

                      if (acStatus.status === 'completed' && acStatus.results) {
                        // Fetch acceptance criteria from database to get their IDs
                        try {
                          const acResponse = await axios.get(
                            `${API_URL}/acceptance-criteria/by-feature/${feature.id}`,
                            { withCredentials: true }
                          );
                          featureAC = acResponse.data;
                        } catch (err) {
                          addErrorLog(`Error fetching acceptance criteria for feature ${feature.name}: ${err.message}`);
                          // Continue with empty criteria
                        }

                        acCompleted = true;
                        addStatusLog(`Generated ${featureAC.length} acceptance criteria for feature: ${feature.name}`);

                        // Check if any acceptance criteria were actually generated
                        if (featureAC.length === 0) {
                          addWarningLog(`No acceptance criteria were generated for feature: ${feature.name}`);
                        }
                      } else if (acStatus.status === 'error') {
                        addErrorLog(`Error generating acceptance criteria for feature ${feature.name}: ${acStatus.error || 'Unknown error'}`);
                        acCompleted = true;
                        // featureAC is already an empty array
                      } else {
                        // It's still in progress
                        if (pollCounter % 2 === 0) { // Log less frequently to avoid spam
                          console.log(`Still generating acceptance criteria for feature ${feature.name} (${pollCounter * 3}s elapsed)`);
                        }
                      }
                    } catch (err) {
                      addErrorLog(`Error checking acceptance criteria generation status for feature ${feature.name}: ${err.message}`);
                      acCompleted = true;
                      // Continue with empty criteria
                    }
                  }

                  return { feature, acceptanceCriteria: featureAC };
                } catch (err) {
                  addErrorLog(`Error initiating acceptance criteria generation for feature ${feature.name}: ${err.message}`);
                  return { feature, acceptanceCriteria: [] };
                }
              } else {
                // Return existing acceptance criteria if they already exist
                addStatusLog(`Feature ${feature.name} already has ${existingAC.length} acceptance criteria`);
                return { feature, acceptanceCriteria: existingAC };
              }
            } catch (err) {
              console.error(`Error processing acceptance criteria for feature ${feature.id}:`, err);
              addErrorLog(`Error generating acceptance criteria for feature ${feature ? feature.name : 'unknown'}: ${err.message}`);
              return { feature, acceptanceCriteria: [] };
            }
          };

          // Process features in parallel with limited concurrency
          setDetailedProgress(`Processing ${allFeatures.length} features in parallel batches for acceptance criteria...`);

          // Track progress for updating UI
          let processedACFeatures = 0;
          const totalFeatures = allFeatures.length;
          const updateACProgress = () => {
            processedACFeatures++;
            const featureProgress = 70 + (15 * (processedACFeatures / totalFeatures));
            setProgress(Math.min(85, featureProgress));
            setDetailedProgress(`Processed ${processedACFeatures} of ${totalFeatures} features for acceptance criteria`);
          };

          // Wrap the processFeature function to track progress
          const processFeatureForACWithProgress = async (feature) => {
            const result = await processFeatureForAC(feature);
            updateACProgress();
            return result;
          };

          // Process features in parallel batches
          const acProcessResults = await processBatch(allFeatures, processFeatureForACWithProgress, 3);

          // Flatten the acceptance criteria array
          allAcceptanceCriteria = acProcessResults.flatMap(result => result.acceptanceCriteria);
        }

        setDetailedProgress('');
        setGeneratedAcceptanceCriteria(allAcceptanceCriteria);
        setProgress(85);
        addStatusLog(`Completed acceptance criteria generation with ${allAcceptanceCriteria.length} total acceptance criteria`);

        // Step 5: Generate Tests for each Feature that doesn't already have tests
        setStatus('generating-tests');
        setMessage('Step 5/5: Generating tests for features that need them...');

        let allTests = [];

        // Make sure we have features to work with
        if (!allFeatures || allFeatures.length === 0) {
          console.warn("No features available for test generation");
          addWarningLog("No features available for test generation");
        } else {
          addStatusLog(`Starting parallel test generation for ${allFeatures.length} features`);

          // Function to process a single feature for tests
          const processFeatureForTests = async (feature) => {
            try {
              if (!feature || !feature.id) {
                console.warn("Skipping invalid feature for tests:", feature);
                addStatusLog(`Skipping invalid feature for tests: ${feature ? feature.name || 'Unnamed' : 'Unknown'}`);
                return { feature, tests: [] };
              }

              console.log(`Processing tests for feature ${feature.id}: ${feature.name}`);
              addStatusLog(`Processing tests for feature: ${feature.name}`);

              // Check if feature already has tests
              let existingTests = [];
              try {
                const existingTestsResponse = await axios.get(
                  `${API_URL}/tests/by-feature/${feature.id}`,
                  { withCredentials: true }
                );
                existingTests = existingTestsResponse.data;
                console.log(`Feature ${feature.id} has ${existingTests.length} existing tests`);
              } catch (err) {
                addErrorLog(`Error fetching existing tests for feature ${feature.name}: ${err.message}`);
                // Continue with empty existing tests
              }

              if (existingTests.length === 0) {
                // Only generate tests if none exist
                console.log(`Generating tests for feature ${feature.id}`);
                addStatusLog(`Generating tests for feature: ${feature.name}`);

                try {
                  const testTaskId = await generateTests(feature.id);
                  let testsCompleted = false;
                  let pollCounter = 0;
                  let featureTests = [];

                  while (!testsCompleted) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    pollCounter++;

                    try {
                      const testStatus = await getTestsGenerationStatus(testTaskId);

                      if (testStatus.status === 'completed' && testStatus.results) {
                        // Fetch tests from database to get their IDs
                        try {
                          const testsResponse = await axios.get(
                            `${API_URL}/tests/by-feature/${feature.id}`,
                            { withCredentials: true }
                          );
                          featureTests = testsResponse.data;
                        } catch (err) {
                          addErrorLog(`Error fetching tests for feature ${feature.name}: ${err.message}`);
                          // Continue with empty tests
                        }

                        testsCompleted = true;
                        addStatusLog(`Generated ${featureTests.length} tests for feature: ${feature.name}`);

                        // Check if any tests were actually generated
                        if (featureTests.length === 0) {
                          addWarningLog(`No tests were generated for feature: ${feature.name}`);
                        }
                      } else if (testStatus.status === 'error') {
                        addErrorLog(`Error generating tests for feature ${feature.name}: ${testStatus.error || 'Unknown error'}`);
                        testsCompleted = true;
                        // featureTests is already an empty array
                      } else {
                        // It's still in progress
                        if (pollCounter % 2 === 0) { // Log less frequently to avoid spam
                          console.log(`Still generating tests for feature ${feature.name} (${pollCounter * 3}s elapsed)`);
                        }
                      }
                    } catch (err) {
                      addErrorLog(`Error checking test generation status for feature ${feature.name}: ${err.message}`);
                      testsCompleted = true;
                      // Continue with empty tests
                    }
                  }

                  return { feature, tests: featureTests };
                } catch (err) {
                  addErrorLog(`Error initiating test generation for feature ${feature.name}: ${err.message}`);
                  return { feature, tests: [] };
                }
              } else {
                // Return existing tests if they already exist
                addStatusLog(`Feature ${feature.name} already has ${existingTests.length} tests`);
                return { feature, tests: existingTests };
              }
            } catch (err) {
              console.error(`Error processing tests for feature ${feature.id}:`, err);
              addErrorLog(`Error generating tests for feature ${feature ? feature.name : 'unknown'}: ${err.message}`);
              return { feature, tests: [] };
            }
          };

          // Process features in parallel with limited concurrency
          setDetailedProgress(`Processing ${allFeatures.length} features in parallel batches for tests...`);

          // Track progress for updating UI
          let processedTestFeatures = 0;
          const totalFeatures = allFeatures.length;
          const updateTestProgress = () => {
            processedTestFeatures++;
            const featureProgress = 85 + (15 * (processedTestFeatures / totalFeatures));
            setProgress(Math.min(100, featureProgress));
            setDetailedProgress(`Processed ${processedTestFeatures} of ${totalFeatures} features for tests`);
          };

          // Wrap the processFeature function to track progress
          const processFeatureForTestsWithProgress = async (feature) => {
            const result = await processFeatureForTests(feature);
            updateTestProgress();
            return result;
          };

          // Process features in parallel batches
          const testProcessResults = await processBatch(allFeatures, processFeatureForTestsWithProgress, 3);

          // Flatten the tests array
          allTests = testProcessResults.flatMap(result => result.tests);
        }

        setDetailedProgress('');
        setGeneratedTests(allTests);
        setProgress(100);
        addStatusLog(`Completed test generation with ${allTests.length} total tests`);

        console.log('Generation completed successfully!');
        addStatusLog('Generation completed successfully!');
        console.log(`Generated: ${generatedEpics.length} epics, ${generatedFeatures.length} features, ${generatedUserStories.length} user stories, ${generatedAcceptanceCriteria.length} acceptance criteria, ${generatedTests.length} tests`);
        addStatusLog(`Generated: ${generatedEpics.length} epics, ${generatedFeatures.length} features, ${generatedUserStories.length} user stories, ${generatedAcceptanceCriteria.length} acceptance criteria, ${generatedTests.length} tests`);

        setStatus('completed');
        setMessage('Generation completed successfully!');

        // Call the onComplete callback if provided
        if (typeof onComplete === 'function') {
          onComplete();
        }
      } catch (err) {
        console.error('Error in comprehensive generation:', err);
        const errorMessage = typeof err === 'string' ? err : err.message || 'An unexpected error occurred during generation';
        console.error(`Generation failed at stage: ${status} with error: ${errorMessage}`);
        addErrorLog(`Generation failed at ${status} stage: ${errorMessage}`);
        setError(errorMessage);
        setStatus('error');
        setMessage('Generation failed!');
      }
    };

    startComprehensiveGeneration();
  }, [onClose, productId, productName, onComplete]);

  // Generate a summary of what was created
  const generateSummary = () => {
    return (
      <div className="mt-4">
        <p className="text-green-600 font-medium mb-2">Successfully generated:</p>
        <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
          <li>{generatedEpics.length} epics</li>
          <li>{generatedFeatures.length} features</li>
          <li>{generatedUserStories.length} user stories</li>
          <li>{generatedAcceptanceCriteria.length} acceptance criteria</li>
          <li>{generatedTests.length} tests</li>
        </ul>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {status === 'completed'
              ? 'Generation Complete'
              : status === 'error'
                ? 'Generation Error'
                : 'Generating Product Hierarchy'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600">
            Product: <span className="font-medium">{productName}</span>
          </p>
        </div>

        {/* Progress bar */}
        {status !== 'completed' && status !== 'error' && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% complete</p>

            {/* Detailed progress for long-running operations */}
            {detailedProgress && (
              <p className="text-sm text-blue-600 mt-1 font-medium">{detailedProgress}</p>
            )}
          </div>
        )}

        {/* Status and Messages */}
        <div className="mb-6">
          {status === 'preparing' && (
            <div className="flex items-center text-blue-600">
              <Clock size={20} className="mr-2" />
              <span>Preparing generation process...</span>
            </div>
          )}

          {(status === 'generating-epics' ||
            status === 'generating-features' ||
            status === 'generating-user-stories' ||
            status === 'generating-acceptance-criteria' ||
            status === 'generating-tests') && (
            <div className="flex items-center text-blue-600">
              <Loader size={20} className="animate-spin mr-2" />
              <span>{message}</span>
            </div>
          )}

          {status === 'completed' && (
            <div className="flex items-center text-green-600">
              <Check size={20} className="mr-2" />
              <span>{message}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center text-red-600">
              <AlertTriangle size={20} className="mr-2" />
              <span>{error || 'An error occurred during generation'}</span>
            </div>
          )}
        </div>

        {/* Status Logs - Always show logs if we have any */}
        {statusLogs.length > 0 && (
          <div className="mb-6 border rounded-lg p-3 bg-gray-50 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-700">Activity Log:</p>
              <span className="text-xs text-gray-500">{statusLogs.length} {statusLogs.length === 1 ? 'entry' : 'entries'}</span>
            </div>
            <ul className="text-xs space-y-1">
              {statusLogs.map((log, index) => {
                // Determine class based on log type
                const messageColorClass =
                  log.type === 'warning' ? 'text-amber-600' :
                  log.type === 'error' ? 'text-red-600' :
                  'text-gray-600';

                return (
                  <li key={index} className={`${messageColorClass} py-1 border-b border-gray-100 last:border-b-0`}>
                    <span className="text-gray-500 font-mono">{log.time}</span> - {log.message}
                    {log.type === 'warning' && <span className="inline-block ml-1">⚠️</span>}
                    {log.type === 'error' && <span className="inline-block ml-1">❌</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Display generation summary if completed */}
        {status === 'completed' && (
          <div className="border rounded-lg p-4 bg-gray-50">
            {generateSummary()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end">
          {status === 'completed' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Done
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveGenerationModal;
