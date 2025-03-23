import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Sparkles, Edit, Trash, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
import axios from 'axios';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const ProductSelector = ({ isMobile = false }) => {
  const { products, selectedProduct, selectProduct, loading, error, refreshProducts } = useProduct();
  const { selectedOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // State for product modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    documentation: '',
    links_to_documentation: [],
    organization_id: null
  });
  const [formError, setFormError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update products when organization changes
  useEffect(() => {
    if (selectedOrganization) {
      refreshProducts(selectedOrganization.id);
    }
  }, [selectedOrganization?.id, refreshProducts]);

  // Handle product selection
  const handleSelectProduct = (product) => {
    selectProduct(product);
    setIsOpen(false);
    navigate('/');
  };

  // Reset form for new product
  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      description: '',
      documentation: '',
      links_to_documentation: [],
      organization_id: selectedOrganization?.id || null
    });
    setFormError('');
    setIsEditing(false);
    setCurrentProductId(null);
  };

  // Open modal for adding a new product
  const handleAddProduct = () => {
    resetForm();
    setIsModalOpen(true);
    setIsOpen(false);
  };

  // Open modal for editing an existing product
  const handleEditProduct = (product) => {
    setIsEditing(true);
    setCurrentProductId(product.id);

    // Initialize form with product data
    setFormData({
      name: product.name || '',
      url: product.url || '',
      description: product.description || '',
      documentation: product.documentation || '',
      links_to_documentation: product.links_to_documentation || [],
      organization_id: selectedOrganization?.id || product.organization_id || null
    });

    setIsModalOpen(true);
    setIsOpen(false);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle documentation link changes
  const handleLinkChange = (index, field, value) => {
    const updatedLinks = [...formData.links_to_documentation];
    updatedLinks[index] = {
      ...updatedLinks[index],
      [field]: value
    };

    setFormData({
      ...formData,
      links_to_documentation: updatedLinks
    });
  };

  // Remove a documentation link
  const handleRemoveLink = (index) => {
    const updatedLinks = formData.links_to_documentation.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      links_to_documentation: updatedLinks
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validate URL field is not empty
    if (!formData.url || formData.url.trim() === '') {
      setFormError('URL is required. Please enter a valid URL for the product.');
      return;
    }

    try {
      let response;

      if (isEditing) {
        // Update existing product
        response = await axios.put(
          `${API_URL}/products/${currentProductId}`,
          formData,
          { withCredentials: true }
        );
      } else {
        // Create new product
        response = await axios.post(
          `${API_URL}/products/`,
          formData,
          { withCredentials: true }
        );

        // Auto-select the newly created product
        if (response.data) {
          selectProduct(response.data);
        }
      }

      // Refresh products list and close modal
      await refreshProducts();
      handleModalClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to save product. Please try again.';

      setFormError(errorMessage);
      console.error('Error saving product:', err);
    }
  };

  // Close the modal
  const handleModalClose = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // Handle product deletion
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/products/${productId}`, {
        withCredentials: true
      });

      // Refresh products
      await refreshProducts();
      setIsOpen(false);
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product. Please try again.');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white rounded-md border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors w-full"
      >
        {loading ? (
          <div className="animate-pulse h-5 w-32 bg-gray-200 rounded"></div>
        ) : (
          <>
            {selectedProduct ? (
              <span className="font-medium text-gray-800 truncate max-w-[180px]">
                {selectedProduct.name}
              </span>
            ) : (
              <span className="text-gray-500">Select a product</span>
            )}
            <ChevronDown size={18} className="text-gray-500 ml-auto" />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-60 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1 max-h-60 overflow-y-auto">
            {error && (
              <div className="px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {loading ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Loading products...
              </div>
            ) : (
              <>
                {products.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500">
                    No products found
                  </div>
                ) : (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                      YOUR PRODUCTS
                    </div>
                    {products.map((product) => (
                      <div key={product.id} className="group relative">
                        <button
                          onClick={() => handleSelectProduct(product)}
                          className={`flex items-center px-4 py-2 text-sm w-full hover:bg-gray-50 transition ${
                            selectedProduct?.id === product.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          <Sparkles size={16} className="mr-2 text-purple-500" />
                          <span className="truncate">{product.name}</span>
                        </button>
                        <div className="hidden group-hover:flex absolute right-2 top-1/2 transform -translate-y-1/2 bg-white shadow-sm rounded">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProduct(product);
                            }}
                            className="p-1 text-gray-500 hover:text-blue-600"
                            title="Edit product"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProduct(product.id);
                            }}
                            className="p-1 text-gray-500 hover:text-red-600"
                            title="Delete product"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-100 mt-1">
                  <button
                    onClick={handleAddProduct}
                    className="flex items-center px-4 py-2 text-sm w-full text-blue-600 hover:bg-blue-50 transition"
                  >
                    <Plus size={16} className="mr-2" />
                    Add Product
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto my-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {isEditing ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={handleModalClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
                  {typeof formError === 'string' ? formError : JSON.stringify(formError)}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                    URL *
                  </label>
                  <input
                    type="url"
                    id="url"
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://yourproduct.com"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    A URL is required.
                  </p>
                </div>

                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documentation Links
                  </label>

                  {formData.links_to_documentation && formData.links_to_documentation.map((link, index) => (
                    <div key={index} className="flex items-start space-x-2 mb-2">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          placeholder="Link Title"
                          value={link.title || ''}
                          onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <input
                          type="url"
                          placeholder="URL"
                          value={link.url || ''}
                          onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="p-2 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        links_to_documentation: [...(formData.links_to_documentation || []), { title: '', url: '' }]
                      });
                    }}
                    className="w-full mt-2 flex justify-center items-center py-2 px-4 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                  >
                    <Plus size={16} className="mr-1" /> Add Documentation Link
                  </button>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-md ${
                      !formData.name.trim() || !formData.url.trim()
                        ? 'bg-blue-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                    disabled={!formData.name.trim() || !formData.url.trim()}
                  >
                    {isEditing ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSelector;
