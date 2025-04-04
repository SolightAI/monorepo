import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, Plus, ArrowLeft, Sparkles, Edit, Zap, Trash2, Play } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import AddFeatureModal from '@/components/modals/AddFeatureModal';
import FeatureGenerationModal from '@/components/modals/FeatureGenerationModal';
import EditFeatureModal from '@/components/modals/EditFeatureModal';
import GenerationProgressModal from '@/components/modals/GenerationProgressModal';
import InProgressGenerations from '@/components/InProgressGenerations';
import { triggerFullGeneration } from '@/services/generationService';
import { generateFeatures, getFeatureGenerationStatus } from '@/api/featureGeneration';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const EpicDetails = () => {
  const { epicId } = useParams();
  const { selectedProduct } = useProduct();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [epic, setEpic] = useState(null);

  // State for Add Feature Modal
  const [isAddFeatureModalOpen, setIsAddFeatureModalOpen] = useState(false);
  // State for Feature Generation Modal
  const [isGenerateFeatureModalOpen, setIsGenerateFeatureModalOpen] = useState(false);
  // State for Edit Feature Modal
  const [isEditFeatureModalOpen, setIsEditFeatureModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // State for "Generate All" functionality
  const [isGenerateAllModalOpen, setIsGenerateAllModalOpen] = useState(false);
  const [generateAllTaskId, setGenerateAllTaskId] = useState(null);

  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [featureToDelete, setFeatureToDelete] = useState(null);

  // Add a new state for success messages at the top with the other state declarations
  const [successMessage, setSuccessMessage] = useState(null);

  const navigate = useNavigate();

  // Fetch epic details
  useEffect(() => {
    fetchEpicDetails();
  }, [epicId]);

  const fetchEpicDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get the epic details (which includes features)
      const epicResponse = await axios.get(`${API_URL}/epics/${epicId}`, {
        withCredentials: true
      });

      setEpic(epicResponse.data);
    } catch (err) {
      console.error('Error fetching epic details:', err);
      setError('Failed to fetch epic details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle feature added
  const handleFeatureAdded = (newFeature) => {
    // Update the epic state with the new feature
    setEpic(prevEpic => ({
      ...prevEpic,
      features: [...(prevEpic.features || []), newFeature]
    }));
  };

  // Handle feature generation completed
  const handleFeatureGenerationComplete = (generatedFeatures) => {
    // Refresh epic details to show the newly generated features
    fetchEpicDetails();
  };

  // Handle feature updated
  const handleFeatureUpdated = (updatedFeature) => {
    // Update the epic state with the updated feature
    setEpic(prevEpic => ({
      ...prevEpic,
      features: prevEpic.features.map(feature =>
        feature.id === updatedFeature.id ? updatedFeature : feature
      )
    }));
  };

  // Handle feature edit
  const handleEditFeature = (feature, e) => {
    e.stopPropagation(); // Prevent row click from navigating
    setSelectedFeature(feature);
    setIsEditFeatureModalOpen(true);
  };

  // Handle feature delete
  const handleDeleteFeature = (feature, e) => {
    e.stopPropagation(); // Prevent row click from navigating
    setFeatureToDelete(feature);
    setShowDeleteConfirm(true);
  };

  // Confirm feature deletion
  const confirmDeleteFeature = async () => {
    if (!featureToDelete) return;

    try {
      await axios.delete(`${API_URL}/features/${featureToDelete.id}`, {
        withCredentials: true
      });

      // Update the epic state by removing the deleted feature
      setEpic(prevEpic => ({
        ...prevEpic,
        features: prevEpic.features.filter(f => f.id !== featureToDelete.id)
      }));

      // Reset state
      setFeatureToDelete(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting feature:', err);
      setError('Failed to delete feature. Please try again.');
    }
  };

  // Handle "Generate All" button click
  const handleGenerateAll = async () => {
    try {
      setError(null);
      console.log('Starting Generate All process', { epicId, hasFeatures: !!(epic?.features?.length) });

      // Check if there are any features
      if (!epic?.features || epic.features.length === 0) {
        console.log('No features found, initiating feature generation first');
        // No features exist, trigger feature generation first
        const featureTaskId = await generateFeatures(epicId);
        console.log('Feature generation initiated with taskId:', featureTaskId);

        // Show the generation progress modal with the feature generation task
        setGenerateAllTaskId(featureTaskId);
        // Set specific task type for feature generation
        setIsGenerateAllModalOpen(true);

        // Poll the feature generation task status
        let isCompleted = false;
        let attempts = 0;
        const maxAttempts = 60; // 10 minutes (10s intervals)

        console.log('Starting polling loop for feature generation status');
        while (!isCompleted && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10-second polling
          attempts++;
          console.log(`Polling attempt ${attempts}/${maxAttempts} for taskId: ${featureTaskId}`);

          try {
            const status = await getFeatureGenerationStatus(featureTaskId);
            console.log('Feature generation status:', status);

            if (status.status === 'completed') {
              console.log('Feature generation completed successfully');
              isCompleted = true;

              // Refresh epic details to get the new features
              console.log('Refreshing epic details to get newly generated features');
              // Get fresh data directly from the API response
              try {
                const epicResponse = await axios.get(`${API_URL}/epics/${epicId}`, {
                  withCredentials: true
                });

                const freshEpicData = epicResponse.data;
                console.log('Epic details refreshed directly', {
                  featureCount: freshEpicData?.features?.length
                });

                // Update state (though we won't rely on it immediately)
                setEpic(freshEpicData);

                // Now that features exist, trigger full generation - using the fresh data
                if (freshEpicData?.features && freshEpicData.features.length > 0) {
                  console.log('Features found after refresh, triggering full generation');
                  const response = await triggerFullGeneration('epic', epicId);
                  console.log('Full generation triggered with taskId:', response.task_id);
                  setGenerateAllTaskId(response.task_id);
                  // Reset modal with new task ID and general type
                  setIsGenerateAllModalOpen(false);
                  setTimeout(() => setIsGenerateAllModalOpen(true), 100);
                } else {
                  // Still no features, show error
                  console.error('Feature generation completed but no features were created');
                  setError('Feature generation completed but no features were created.');
                  setIsGenerateAllModalOpen(false);
                }
              } catch (fetchError) {
                console.error('Error fetching refreshed epic details:', fetchError);
                console.error('Error details:', fetchError.response?.data || fetchError.message);
                setError('Error fetching updated epic data. Please try again.');
                setIsGenerateAllModalOpen(false);
              }
            } else if (status.status === 'error') {
              // Feature generation failed
              console.error('Feature generation failed with error:', status.error);
              setError(`Feature generation failed: ${status.error || 'Unknown error'}`);
              setIsGenerateAllModalOpen(false);
              break;
            } else if (status.status === 'in_progress') {
              console.log(`Feature generation in progress: ${status.progress || 0}%`);
            } else {
              console.log(`Feature generation status: ${status.status}`);
            }
          } catch (err) {
            console.error('Error checking feature generation status:', err);
            console.error('Error details:', err.response?.data || err.message);
            attempts++;
          }
        }

        if (!isCompleted && attempts >= maxAttempts) {
          console.error('Feature generation timed out after maximum attempts');
          setError('Feature generation timed out. Please try again.');
          setIsGenerateAllModalOpen(false);
        }
      } else {
        console.log('Features already exist, triggering full generation directly');
        // Features already exist, trigger full generation directly
        const response = await triggerFullGeneration('epic', epicId);
        console.log('Full generation triggered with taskId:', response.task_id);
        setGenerateAllTaskId(response.task_id);
        setIsGenerateAllModalOpen(true);
      }
    } catch (err) {
      console.error('Error in handleGenerateAll:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to start generation. Please try again.');
      setIsGenerateAllModalOpen(false);
    }
  };

  // Handle generation completion
  const handleGenerationComplete = () => {
    // Refresh epic details to show updated features
    fetchEpicDetails();

    // Reset state
    setIsGenerateAllModalOpen(false);
    setGenerateAllTaskId(null);
  };

  // Handle run all tests for all features in the epic
  const handleRunAllTests = async () => {
    try {
      if (!epic?.features || epic.features.length === 0) {
        setError('No features available to run tests.');
        setSuccessMessage(null);
        return;
      }

      setError(null);
      setSuccessMessage(null);
      setLoading(true);

      let testCount = 0;
      let featuresWithTests = 0;

      // For each feature, run all its tests
      for (const feature of epic.features) {
        try {
          // Fetch tests for this feature
          const testsResponse = await axios.get(`${API_URL}/tests/by-feature/${feature.id}`, {
            withCredentials: true
          });

          const tests = testsResponse.data;

          if (tests && tests.length > 0) {
            featuresWithTests++;

            // Run each test
            for (const test of tests) {
              const executionData = {
                test_id: test.id,
                status: 'PENDING',
                environment: 'development',
                executor_type: 'MANUAL',
                notes: null
              };

              await axios.post(`${API_URL}/test-executions/`, executionData, {
                withCredentials: true
              });

              testCount++;
            }
          }
        } catch (featureErr) {
          console.error(`Error running tests for feature ${feature.id}:`, featureErr);
          // Continue with other features
        }
      }

      // Show appropriate message based on results
      if (testCount > 0) {
        setSuccessMessage(`Successfully started ${testCount} tests across ${featuresWithTests} features.`);
        setError(null);
      } else {
        setError('No tests found for any features in this epic.');
        setSuccessMessage(null);
      }
    } catch (err) {
      console.error('Error running all tests:', err);
      setError('Failed to run all tests. Please try again.');
      setSuccessMessage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <InProgressGenerations />
      
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center mb-6 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Product
          </button>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
              <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-1" />
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-700 rounded-lg flex items-start">
              <p>{successMessage}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader size={40} className="text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              {epic && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <div className="flex items-center mb-4 flex-wrap">
                    <Sparkles size={24} className="text-purple-500 mr-3 flex-shrink-0" />
                    <h1 className="text-3xl font-bold text-gray-800 break-words overflow-hidden">{epic.name}</h1>
                  </div>
                  {epic.description && (
                    <p className="text-gray-700 mb-4 break-words overflow-hidden max-h-40 overflow-y-auto">{epic.description}</p>
                  )}
                  {selectedProduct && (
                    <div className="text-sm text-gray-500 break-words overflow-hidden">
                      Product: {selectedProduct.name}
                    </div>
                  )}
                  {/* Generate All button - only show if NO features exist */}
                  {epic?.features.length !== 0 && (<button
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                    onClick={() => setIsAddFeatureModalOpen(true)}
                  >
                    <Plus size={18} className="mr-2" />
                    Add Feature
                  </button>)}
                </div>
              )}

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">Features</h2>
                  <div className="flex space-x-3">
                    {epic?.features && epic.features.length > 0 && (
                      <button
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150"
                        onClick={handleRunAllTests}
                      >
                        <Play size={18} className="mr-2" />
                        Run All Tests
                      </button>
                    )}
                    {(!epic?.features || epic.features.length === 0) && (
                      <button
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150"
                        onClick={handleGenerateAll}
                      >
                        <Zap size={18} className="mr-2" />
                        Generate All
                      </button>
                    )}
                    {(!epic?.features || epic.features.length === 0) && (
                      <button
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                        onClick={() => setIsGenerateFeatureModalOpen(true)}
                      >
                        <Sparkles size={18} className="mr-2" />
                        Generate Features
                      </button>
                    )}
                    <button
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150"
                      onClick={handleGenerateAll}
                    >
                      <Zap size={18} className="mr-2" />
                      Generate All
                    </button>
                    <button
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                      onClick={() => setIsGenerateFeatureModalOpen(true)}
                    >
                      <Sparkles size={18} className="mr-2 inline-block" />
                      Generate features
                    </button>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                      onClick={() => setIsAddFeatureModalOpen(true)}
                    >
                      <Plus size={18} className="mr-2" />
                      Add Feature
                    </button>
                  </div>
                </div>

                {!epic?.features || epic.features.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-4">No features found for this epic</p>
                    <div className="flex justify-center space-x-4">
                      <button
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                        onClick={() => setIsGenerateFeatureModalOpen(true)}
                      >
                        <Sparkles size={18} className="mr-2 inline-block" />
                        Generate features automatically
                      </button>
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                        onClick={() => setIsAddFeatureModalOpen(true)}
                      >
                        Create feature manually
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            URLs
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {epic.features.map((feature) => (
                          <tr
                            key={feature.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => navigate(`/features/${feature.id}`)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 truncate max-w-[300px]" title={feature.name}>
                                {feature.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500 truncate max-w-xs">{feature.description}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                {feature.urls?.map((url, index) => (
                                  <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 truncate max-w-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {url}
                                  </a>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => handleEditFeature(feature, e)}
                                  className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition duration-150"
                                >
                                  <Edit size={14} className="mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => handleDeleteFeature(feature, e)}
                                  className="flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition duration-150"
                                >
                                  <Trash2 size={14} className="mr-1" />
                                  Delete
                                </button>
                              </div>
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
      </div>

      {isAddFeatureModalOpen && epic && (
        <AddFeatureModal
          onClose={() => setIsAddFeatureModalOpen(false)}
          epicId={epicId}
          epicName={epic.name}
          onFeatureAdded={handleFeatureAdded}
        />
      )}

      {isGenerateFeatureModalOpen && epic && (
        <FeatureGenerationModal
          onClose={() => {
            setIsGenerateFeatureModalOpen(false);
            fetchEpicDetails();
          }}
          epicId={epicId}
          epicName={epic.name}
          onComplete={handleFeatureGenerationComplete}
        />
      )}

      {isEditFeatureModalOpen && selectedFeature && (
        <EditFeatureModal
          onClose={() => {
            setIsEditFeatureModalOpen(false);
            setSelectedFeature(null);
          }}
          feature={selectedFeature}
          onFeatureUpdated={handleFeatureUpdated}
        />
      )}

      {isGenerateAllModalOpen && generateAllTaskId && (
        <GenerationProgressModal
          taskId={generateAllTaskId}
          scope="epic"
          taskType={!epic?.features || epic.features.length === 0 ? 'feature' : 'general'}
          onClose={() => {
            setIsGenerateAllModalOpen(false);
            fetchEpicDetails();
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Delete Feature</h3>
            <p className="mb-6">Are you sure you want to delete "{featureToDelete?.name}"? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-150"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setFeatureToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-150"
                onClick={confirmDeleteFeature}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpicDetails;
