import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, Plus, Sparkles } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import EpicCreationModal from '@/components/modals/EpicCreationModal';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const Home = () => {
  const { selectedProduct, loading: productLoading } = useProduct();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [epics, setEpics] = useState([]);
  const [showEpicModal, setShowEpicModal] = useState(false);

  const navigate = useNavigate();

  // Fetch epics for the selected product
  useEffect(() => {
    if (selectedProduct) {
      fetchEpics();
    } else if (!productLoading) {
      // If product loading is complete but no product is selected
      setLoading(false);
    }
  }, [selectedProduct, productLoading]);

  const fetchEpics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get the product with its epics
      const productResponse = await axios.get(`${API_URL}/products/${selectedProduct.id}`, {
        withCredentials: true
      });

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
  };

  const handleEpicCreationComplete = async (createdEpics) => {
    // Hide the epic creation modal
    setShowEpicModal(false);

    // Refresh epics to show the updated data
    await fetchEpics();
  };

  const handleManageEpics = () => {
    setShowEpicModal(true);
  };

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
            <p className="text-gray-500 mb-6">Please use the product selector in the sidebar to choose a product or create a new one.</p>
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <Sparkles size={24} className="text-purple-500" />
              </div>
              <p className="text-sm text-gray-600">The product selector is located in the sidebar on the left side of the screen.</p>
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
              </div>
              <button
                onClick={handleManageEpics}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
              >
                <Plus size={20} className="mr-2" />
                {epics.length > 0 ? 'Manage Epics' : 'Add Epics'}
              </button>
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
                    <button
                      onClick={handleManageEpics}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition duration-150"
                    >
                      Create your first epic
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {epics.map(epic => (
                      <div
                        key={epic.id}
                        className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/epics/${epic.id}`)}
                      >
                        <div className="p-6">
                          <div className="flex items-center mb-3">
                            <Sparkles size={18} className="text-purple-500 mr-2" />
                            <h3 className="text-xl font-semibold text-gray-800 truncate">{epic.name}</h3>
                          </div>
                          <p className="text-gray-700">{epic.description}</p>

                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent triggering the parent div's onClick
                                navigate(`/epics/${epic.id}`);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View Features
                            </button>
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
    </div>
  );
};

export default Home;
