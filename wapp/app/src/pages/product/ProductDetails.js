import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, ArrowLeft, Building, Zap } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
import GenerationProgressModal from '@/components/modals/GenerationProgressModal';
import { triggerFullGeneration } from '@/services/generationService';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const ProductDetails = () => {
  const { productId } = useParams();
  const { selectedProduct, setSelectedProduct, loading: productLoading } = useProduct();
  const { selectedOrganization, loading: organizationLoading } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [epics, setEpics] = useState([]);

  // State for "Generate All" functionality
  const [isGenerateAllModalOpen, setIsGenerateAllModalOpen] = useState(false);
  const [generateAllTaskId, setGenerateAllTaskId] = useState(null);

  const navigate = useNavigate();

  // Fetch product details and epics
  const fetchProductDetails = useCallback(async () => {
    if (!productId || !selectedOrganization?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Get the product details
      const productResponse = await axios.get(
        `${API_URL}/products/${productId}?organization_id=${selectedOrganization.id}`,
        {
          withCredentials: true
        }
      );

      setSelectedProduct(productResponse.data);

      // Set epics from the product data
      if (productResponse.data.epics && productResponse.data.epics.length > 0) {
        setEpics(productResponse.data.epics);
      } else {
        setEpics([]);
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
      setError('Failed to fetch product details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [productId, selectedOrganization?.id, setSelectedProduct]);

  // Fetch product on mount or when product ID changes
  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails, productId]);

  // Handle "Generate All" button click
  const handleGenerateAll = async () => {
    if (!selectedProduct) {
      setError('No product selected. Please try again.');
      return;
    }

    if (!epics || epics.length === 0) {
      setError('No epics found. Please add or generate epics first.');
      return;
    }

    try {
      setError(null);

      // Call the unified generation endpoint for the product
      const response = await triggerFullGeneration('product', selectedProduct.id);

      // Store the task ID for tracking
      setGenerateAllTaskId(response.task_id);

      // Show the progress modal
      setIsGenerateAllModalOpen(true);
    } catch (err) {
      console.error('Error starting generation:', err);
      setError('Failed to start generation. Please try again.');
    }
  };

  // Handle generation completion
  const handleGenerationComplete = () => {
    // Refresh product details to show updated content
    fetchProductDetails();

    // Reset state
    setIsGenerateAllModalOpen(false);
    setGenerateAllTaskId(null);
  };

  // If loading organizations, show loading indicator
  if (organizationLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader size={40} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  // If no organization is selected, show message
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
        {/* Back button to return to home */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center mb-6 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Product Home
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
            {/* Product header */}
            {selectedProduct && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center mb-4">
                    <Building size={24} className="text-blue-500 mr-3" />
                    <h1 className="text-3xl font-bold text-gray-800">{selectedProduct.name}</h1>
                  </div>
                  <div className="flex space-x-3">
                    {/* Generate All button - only show if epics exist */}
                    {epics && epics.length > 0 && (
                      <button
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-150"
                        onClick={handleGenerateAll}
                      >
                        <Zap size={18} className="mr-2" />
                        Generate All
                      </button>
                    )}
                  </div>
                </div>
                {selectedProduct.description && (
                  <p className="text-gray-700 mb-4">{selectedProduct.description}</p>
                )}
                {selectedOrganization && (
                  <div className="text-sm text-gray-500">
                    Organization: {selectedOrganization.name}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h2 className="text-lg font-semibold mb-2">About This Page</h2>
                  <p className="text-gray-600">
                    This page provides a streamlined way to generate all content for this product using our unified generation API.
                    The "Generate All" button will create content for all epics, features, user stories, acceptance criteria, and tests.
                  </p>
                </div>
              </div>
            )}

            {/* Epics section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Epics</h2>
              </div>

              {/* Epic cards or empty state */}
              {!epics || epics.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No epics found for this product</p>
                  <p className="text-sm text-gray-600">
                    Return to the product home page to add or generate epics.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {epics.map(epic => (
                    <div
                      key={epic.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/epics/${epic.id}`)}
                    >
                      <div className="p-6">
                        <div className="flex items-center mb-3">
                          <h3 className="text-xl font-semibold text-gray-800 truncate">{epic.name}</h3>
                        </div>
                        {epic.description && (
                          <p className="text-gray-700 line-clamp-2 mb-4">{epic.description}</p>
                        )}

                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            {epic.features?.length || 0} features
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent triggering the parent div's onClick
                              navigate(`/epics/${epic.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Generate All Progress Modal */}
      {isGenerateAllModalOpen && generateAllTaskId && (
        <GenerationProgressModal
          taskId={generateAllTaskId}
          scope="product"
          onClose={() => {
            handleGenerationComplete();
          }}
        />
      )}
    </div>
  );
};

export default ProductDetails;
