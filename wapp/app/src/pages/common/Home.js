import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, Plus, Sparkles, Building, Zap, Rocket } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
import EpicCreationModal from '@/components/modals/EpicCreationModal';
import EpicGenerationModal from '@/components/modals/EpicGenerationModal';
import ComprehensiveGenerationModal from '@/components/modals/ComprehensiveGenerationModal';
import EditEpicModal from '@/components/modals/EditEpicModal';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const Home = () => {
  const { selectedProduct, loading: productLoading } = useProduct();
  const { selectedOrganization, loading: organizationLoading } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [epics, setEpics] = useState([]);
  const [showEpicModal, setShowEpicModal] = useState(false);
  const [showEpicGenerationModal, setShowEpicGenerationModal] = useState(false);
  const [showComprehensiveGenerationModal, setShowComprehensiveGenerationModal] = useState(false);
  const [showEditEpicModal, setShowEditEpicModal] = useState(false);
  const [selectedEpic, setSelectedEpic] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [epicToDelete, setEpicToDelete] = useState(null);

  const navigate = useNavigate();

  // Memoize the fetchEpics function to prevent unnecessary re-renders
  const fetchEpics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get the product with its epics
      const productResponse = await axios.get(
        `${API_URL}/products/${selectedProduct.id}?organization_id=${selectedOrganization.id}`,
        {
          withCredentials: true
        }
      );

      if (productResponse.data.epics && productResponse.data.epics.length > 0) {
        setEpics(productResponse.data.epics);
      } else {
        setEpics([]);
      }
    } catch (err) {
      console.error('Error fetching product epics:', err);
      setError('Failed to fetch epics for this product. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedProduct?.id, selectedOrganization?.id]);

  // Fetch epics for the selected product
  useEffect(() => {
    if (selectedProduct) {
      fetchEpics();
    } else if (!productLoading) {
      // If product loading is complete but no product is selected
      setLoading(false);
    }
  }, [selectedProduct, productLoading, fetchEpics]);

  const handleEpicCreationComplete = async (createdEpics) => {
    setShowEpicModal(false);
    await fetchEpics();
  };

  const handleEpicGenerationComplete = async (generatedEpics) => {
    setShowEpicGenerationModal(false);
    await fetchEpics();
  };

  const handleComprehensiveGenerationComplete = async () => {
    setShowComprehensiveGenerationModal(false);
    await fetchEpics();
  };

  const handleGenerateEpics = () => {
    setShowEpicGenerationModal(true);
  };

  const handleGenerateEverything = () => {
    setShowComprehensiveGenerationModal(true);
  };

  const handleEditEpic = (epic) => {
    setSelectedEpic(epic);
    setShowEditEpicModal(true);
  };

  const handleEditEpicComplete = async (updatedEpic) => {
    setShowEditEpicModal(false);
    setSelectedEpic(null);
    await fetchEpics();
  };

  const handleDeleteEpic = (epic) => {
    setEpicToDelete(epic);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEpic = async () => {
    if (!epicToDelete) return;

    try {
      await axios.delete(
        `${API_URL}/epics/${epicToDelete.id}`,
        { withCredentials: true }
      );
      setShowDeleteConfirm(false);
      setEpicToDelete(null);
      await fetchEpics();
    } catch (err) {
      console.error('Error deleting epic:', err);
      setError('Failed to delete epic. Please try again.');
    }
  };

  // If we're loading organizations, show a loading indicator
  if (organizationLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader size={40} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  // If no organization is selected, show a message
  if (!selectedOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Organization Selected</h2>
            <p className="text-gray-500 mb-6">You need to create or join an organization to start using the application.</p>
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <Building size={24} className="text-gray-700" />
              </div>
              <button
                onClick={() => navigate('/organization/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150 mb-4"
              >
                Create Organization
              </button>
              <p className="text-sm text-gray-600">Once created, you'll be able to add products and manage your projects.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {productLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader size={40} className="text-blue-500 animate-spin" />
          </div>
        ) : !selectedProduct ? (
          <div className="text-center py-20 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Product Selected</h2>
            <p className="text-gray-500 mb-6">Please use the product selector in the navigation bar to choose a product or create a new one.</p>
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <Sparkles size={24} className="text-purple-500" />
              </div>
              <p className="text-sm text-gray-600">The product selector is located in the top navigation bar.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{selectedProduct.name} Epics</h1>
                {selectedProduct.description && (
                  <p className="text-gray-600 mt-2">{selectedProduct.description}</p>
                )}
                <button
                  onClick={() => navigate(`/products/${selectedProduct.id}`)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 flex items-center"
                >
                  View Product Details
                </button>
              </div>
              <div className="flex space-x-3">
                {/* Only show generate buttons when no epics exist */}
                {epics.length === 0 && (
                  <>
                    <button
                      onClick={handleGenerateEverything}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg shadow hover:from-green-700 hover:to-blue-700 transition duration-150"
                    >
                      <Rocket size={20} className="mr-2" />
                      Generate Everything
                    </button>
                    <button
                      onClick={handleGenerateEpics}
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition duration-150"
                    >
                      <Zap size={20} className="mr-2" />
                      Generate Epics
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowEpicModal(true)}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                >
                  <Plus size={20} className="mr-2" />
                  Add Epic
                </button>
              </div>
            </div>

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
                {/* Epic cards */}
                {epics.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-lg shadow">
                    <p className="text-gray-500 mb-4">No epics found for this product</p>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={handleGenerateEverything}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg shadow hover:from-green-700 hover:to-blue-700 transition duration-150 flex items-center"
                      >
                        <Rocket size={18} className="mr-2" />
                        Generate everything
                      </button>
                      <button
                        onClick={handleGenerateEpics}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition duration-150 flex items-center"
                      >
                        <Zap size={18} className="mr-2" />
                        Generate epics
                      </button>
                      <button
                        onClick={() => setShowEpicModal(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150 flex items-center"
                      >
                        <Plus size={18} className="mr-2" />
                        Create epics manually
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {epics.map(epic => (
                      <div
                        key={epic.id}
                        className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="p-6">
                          <div className="flex items-center mb-3">
                            <Sparkles size={18} className="text-purple-500 mr-2" />
                            <h3 className="text-xl font-semibold text-gray-800 truncate">{epic.name}</h3>
                          </div>
                          <p className="text-gray-700">{epic.description}</p>

                          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                            <button
                              onClick={() => navigate(`/epics/${epic.id}`)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View Features
                            </button>
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditEpic(epic);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEpic(epic);
                                }}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Epic Creation Modal */}
      {showEpicModal && selectedProduct && (
        <EpicCreationModal
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          productLinks={selectedProduct.links_to_documentation}
          existingEpics={epics}
          isEditing={epics.length > 0}
          onClose={() => {
            setShowEpicModal(false);
            fetchEpics();
          }}
          onComplete={handleEpicCreationComplete}
        />
      )}

      {/* Epic Generation Modal */}
      {showEpicGenerationModal && selectedProduct && (
        <EpicGenerationModal
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          onClose={() => {
            setShowEpicGenerationModal(false);
            fetchEpics();
          }}
          onComplete={handleEpicGenerationComplete}
        />
      )}

      {/* Comprehensive Generation Modal */}
      {showComprehensiveGenerationModal && selectedProduct && (
        <ComprehensiveGenerationModal
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          onClose={() => {
            setShowComprehensiveGenerationModal(false);
            fetchEpics();
          }}
          onComplete={handleComprehensiveGenerationComplete}
        />
      )}

      {/* Edit Epic Modal */}
      {showEditEpicModal && selectedEpic && selectedProduct && (
        <EditEpicModal
          epic={selectedEpic}
          productName={selectedProduct.name}
          onClose={() => {
            setShowEditEpicModal(false);
            setSelectedEpic(null);
          }}
          onComplete={handleEditEpicComplete}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && epicToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Delete Epic</h3>
            <p className="mb-6">Are you sure you want to delete "{epicToDelete.name}"? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-150"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setEpicToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-150"
                onClick={confirmDeleteEpic}
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

export default Home;
