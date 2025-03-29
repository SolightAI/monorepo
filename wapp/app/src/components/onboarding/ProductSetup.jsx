import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const ProductSetup = ({ onNext, onPrev, onSkip }) => {
  const { products, refreshProducts } = useProduct();
  const { selectedOrganization } = useOrganization();
  const [hasProducts, setHasProducts] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    documentation: '',
    links_to_documentation: [],
    organization_id: null
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);

  // Update form when organization changes
  useEffect(() => {
    if (selectedOrganization) {
      setFormData(prevData => ({
        ...prevData,
        organization_id: selectedOrganization.id
      }));
    }
  }, [selectedOrganization]);

  // Check if user already has products
  useEffect(() => {
    if (products && products.length > 0) {
      setHasProducts(true);
    }
  }, [products]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle adding a documentation link
  const handleAddLink = () => {
    setFormData({
      ...formData,
      links_to_documentation: [
        ...formData.links_to_documentation,
        { title: '', url: '' }
      ]
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate URL field is not empty
    if (!formData.url || formData.url.trim() === '') {
      setError('URL is required. Please enter a valid URL for the product.');
      setIsLoading(false);
      return;
    }

    try {
      // Create new product
      await axios.post(
        `${API_URL}/products/`,
        formData,
        { withCredentials: true }
      );

      // Refresh products list
      await refreshProducts(selectedOrganization.id);
      setCreateSuccess(true);

      // Proceed to next step after a short delay
      setTimeout(() => {
        onNext();
      }, 1500);
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? (typeof err.response.data.detail === 'string'
           ? err.response.data.detail
           : JSON.stringify(err.response.data.detail))
        : 'Failed to create product. Please try again.';

      setError(errorMessage);
      console.error('Error creating product:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    onNext();
  };

  const toggleNewProductForm = () => {
    setShowNewProductForm(!showNewProductForm);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Set Up Your First Product</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Create your first product to start organizing your testing workflow.
        </p>
      </div>

      {createSuccess ? (
        <div className="bg-green-50 p-6 rounded-lg border border-green-200 max-w-xl mx-auto text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-green-800 mb-2">Product Created!</h3>
          <p className="text-green-700 mb-6">
            Your product has been successfully created. You can now add epics, features, and tests.
          </p>
          <button
            onClick={onNext}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Continue to Features Overview
          </button>
        </div>
      ) : hasProducts ? (
        <div className="max-w-xl mx-auto">
          {!showNewProductForm ? (
            <>
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3">
                    <CheckCircle className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-blue-800 mb-2">You Already Have Products</h3>
                    <p className="text-blue-700">
                      You already have {products.length} product{products.length !== 1 ? 's' : ''} in your organization.
                      You can continue to the next step or create another product below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <button
                  onClick={handleContinue}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 transition-colors"
                >
                  Continue With Existing Products
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={toggleNewProductForm}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  or create a new product
                </button>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={onPrev}
                  className="px-5 py-2 border border-gray-300 rounded-md flex items-center hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center mb-6">
                <button
                  onClick={toggleNewProductForm}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Use existing products instead
                </button>
              </div>

              <form className="max-w-xl mx-auto" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-6 flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name*
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                      Product URL*
                    </label>
                    <div className="flex items-center">
                      <div className="mr-2">
                        <LinkIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="url"
                        name="url"
                        type="url"
                        required
                        value={formData.url}
                        onChange={handleChange}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="https://example.com"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      The URL where this product can be accessed
                    </p>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description*
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows="3"
                      required
                      value={formData.description}
                      onChange={handleChange}
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Describe what this product does"
                    />
                  </div>

                  <div>
                    <label htmlFor="documentation" className="block text-sm font-medium text-gray-700 mb-1">
                      Documentation
                    </label>
                    <textarea
                      id="documentation"
                      name="documentation"
                      rows="3"
                      value={formData.documentation}
                      onChange={handleChange}
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Add any documentation about the product (optional)"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Documentation Links
                      </label>
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Add Link
                      </button>
                    </div>

                    {formData.links_to_documentation.length > 0 ? (
                      <div className="space-y-3">
                        {formData.links_to_documentation.map((link, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={link.title}
                              onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                              placeholder="Link title"
                              className="appearance-none rounded-md relative block flex-1 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            <input
                              type="url"
                              value={link.url}
                              onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                              placeholder="https://..."
                              className="appearance-none rounded-md relative block flex-1 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(index)}
                              className="text-red-500 hover:text-red-700 p-2"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No documentation links added yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={onPrev}
                    className="px-5 py-2 border border-gray-300 rounded-md flex items-center hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`px-5 py-2 rounded-md flex items-center transition-colors ${
                      isLoading ? 'bg-blue-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        Create New Product
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      ) : (
        <form className="max-w-xl mx-auto" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-6 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Product Name*
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                Product URL*
              </label>
              <div className="flex items-center">
                <div className="mr-2">
                  <LinkIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="url"
                  name="url"
                  type="url"
                  required
                  value={formData.url}
                  onChange={handleChange}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="https://example.com"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                The URL where this product can be accessed
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description*
              </label>
              <textarea
                id="description"
                name="description"
                rows="3"
                required
                value={formData.description}
                onChange={handleChange}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Describe what this product does"
              />
            </div>

            <div>
              <label htmlFor="documentation" className="block text-sm font-medium text-gray-700 mb-1">
                Documentation
              </label>
              <textarea
                id="documentation"
                name="documentation"
                rows="3"
                value={formData.documentation}
                onChange={handleChange}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Add any documentation about the product (optional)"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Documentation Links
                </label>
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Link
                </button>
              </div>

              {formData.links_to_documentation.length > 0 ? (
                <div className="space-y-3">
                  {formData.links_to_documentation.map((link, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={link.title}
                        onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                        placeholder="Link title"
                        className="appearance-none rounded-md relative block flex-1 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                        placeholder="https://..."
                        className="appearance-none rounded-md relative block flex-1 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No documentation links added yet.</p>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={onPrev}
              className="px-5 py-2 border border-gray-300 rounded-md flex items-center hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-5 py-2 rounded-md flex items-center transition-colors ${
                isLoading ? 'bg-blue-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  Create Product
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ProductSetup;
