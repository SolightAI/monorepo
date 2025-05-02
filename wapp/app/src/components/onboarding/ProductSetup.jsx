import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
import axios from 'axios';
import { API_URL } from '@/constants/api';

const ProductSetup = ({ onNext, onPrev, onSkip }) => {
  const { products, refreshProducts } = useProduct();
  const { selectedOrganization } = useOrganization();
  const [hasProducts, setHasProducts] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    documentation: '',
    organization_id: null
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);

  useEffect(() => {
    if (selectedOrganization) {
      setFormData(prevData => ({
        ...prevData,
        organization_id: selectedOrganization.id
      }));
    }
  }, [selectedOrganization]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const submitData = { ...formData };
      if (!submitData.organization_id && selectedOrganization) {
        submitData.organization_id = selectedOrganization.id;
      }

      await axios.post(
        `${API_URL}/products/`,
        submitData,
        { withCredentials: true }
      );

      setCreateSuccess(true);
      await refreshProducts(selectedOrganization.id);

      setTimeout(() => {
        onNext();
      }, 1000);
    } catch (err) {
      console.error('Error creating product:', err);
      let displayError = 'Failed to create product';
      const errorDetail = err.response?.data?.detail;
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          displayError = errorDetail;
        } else if (typeof errorDetail === 'object' && errorDetail !== null) {
          if (typeof errorDetail.msg === 'string') {
            displayError = errorDetail.msg;
          } else {
            try {
              displayError = JSON.stringify(errorDetail);
            } catch (stringifyError) {
              console.error("Failed to stringify error detail:", stringifyError);
            }
          }
        }
      } else if (err.message) {
        displayError = err.message;
      }
      setError(displayError);
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
            Continue to Test Credentials Setup
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

                  <div className="mb-4">
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                      Product URL <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="flex items-center">
                        <div className="relative flex-grow">
                          <input
                            type="url"
                            id="url"
                            name="url"
                            required
                            value={formData.url}
                            onChange={handleChange}
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="https://example.com"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the URL of your product's website.
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
                    className={`px-5 py-2 rounded-md flex items-center
                      ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                      text-white transition-colors`}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
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

            <div className="mb-4">
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                Product URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="flex items-center">
                  <div className="relative flex-grow">
                    <input
                      type="url"
                      id="url"
                      name="url"
                      required
                      value={formData.url}
                      onChange={handleChange}
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the URL of your product's website.
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
              className={`px-5 py-2 rounded-md flex items-center
                ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                text-white transition-colors`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
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
