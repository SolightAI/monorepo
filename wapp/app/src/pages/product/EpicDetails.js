import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, Plus, ArrowLeft, Sparkles, Edit } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import AddFeatureModal from '@/components/modals/AddFeatureModal';
import FeatureGenerationModal from '@/components/modals/FeatureGenerationModal';
import EditFeatureModal from '@/components/modals/EditFeatureModal';

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back button to return to home */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center mb-6 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Product
        </button>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
            <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-1" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading indicator */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader size={40} className="text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Epic header */}
            {epic && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center mb-4">
                  <Sparkles size={24} className="text-purple-500 mr-3" />
                  <h1 className="text-3xl font-bold text-gray-800">{epic.name}</h1>
                </div>
                {epic.description && (
                  <p className="text-gray-700 mb-4">{epic.description}</p>
                )}
                {selectedProduct && (
                  <div className="text-sm text-gray-500">
                    Product: {selectedProduct.name}
                  </div>
                )}
              </div>
            )}

            {/* Features section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Features</h2>
                <div className="flex space-x-3">
                  <button
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                    onClick={() => setIsGenerateFeatureModalOpen(true)}
                  >
                    <Sparkles size={18} className="mr-2" />
                    Generate Features
                  </button>
                  <button
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
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
                            <div className="text-sm font-medium text-gray-900">{feature.name}</div>
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
                                  onClick={(e) => e.stopPropagation()} // Prevent row click when clicking link
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => handleEditFeature(feature, e)}
                              className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition duration-150"
                            >
                              <Edit size={14} className="mr-1" />
                              Edit
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

      {/* Add Feature Modal */}
      {isAddFeatureModalOpen && epic && (
        <AddFeatureModal
          onClose={() => setIsAddFeatureModalOpen(false)}
          epicId={epicId}
          epicName={epic.name}
          onFeatureAdded={handleFeatureAdded}
        />
      )}

      {/* Generate Features Modal */}
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

      {/* Edit Feature Modal */}
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
    </div>
  );
};

export default EpicDetails;
