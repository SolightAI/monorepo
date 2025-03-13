import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, Plus, ArrowLeft, Sparkles, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import AddFeatureModal from '@/components/modals/AddFeatureModal';

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

  // Get status icon based on feature status
  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'FAILED':
        return <XCircle size={18} className="text-red-500" />;
      case 'IN_PROGRESS':
        return <Clock size={18} className="text-yellow-500" />;
      default:
        return <Clock size={18} className="text-gray-400" />;
    }
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
          Back to Epics
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
                <button
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                  onClick={() => setIsAddFeatureModalOpen(true)}
                >
                  <Plus size={18} className="mr-2" />
                  Add Feature
                </button>
              </div>

              {!epic?.features || epic.features.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No features found for this epic</p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150"
                    onClick={() => setIsAddFeatureModalOpen(true)}
                  >
                    Create your first feature
                  </button>
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
    </div>
  );
};

export default EpicDetails;
