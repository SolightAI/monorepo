import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
import { isValidUrl } from '@/utils/urlUtils';
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
    links_to_documentation: [],
    organization_id: null
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);

  // State for URL validation
  const [validationTaskId, setValidationTaskId] = useState(null);

  // States for tracking URL validation success
  const [loginPageFound, setLoginPageFound] = useState(false);
  const [detectedLoginUrl, setDetectedLoginUrl] = useState('');

  // New states for manual login page entry
  const [loginPageNotFound, setLoginPageNotFound] = useState(false);

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

    // When URL field changes in loginPageNotFound state, consider it a manual URL entry
    if (name === 'url' && loginPageNotFound && isValidUrl(value)) {
      // We'll treat this as the login URL
      setDetectedLoginUrl(value);
    }
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Add organization ID to form data
      const submitData = {
        ...formData,
        organization_id: selectedOrganization.id
      };

      // Create product
      const response = await axios.post(
        `${API_URL}/products/`,
        submitData,
        { withCredentials: true }
      );

      // Update state for success
      setCreateSuccess(true);
      await refreshProducts(selectedOrganization.id);

      // Check if the response contains a task_id for URL validation
      if (response.data && response.data.task_id) {
        // Store the task ID and product ID for validation monitoring
        setValidationTaskId(response.data.task_id);
        console.log("URL validation initiated with task ID:", response.data.task_id);
      }

      // Move to next step after 1 second
      setTimeout(() => {
        onNext();
      }, 1000);
    } catch (err) {
      console.error('Error creating product:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to create product';
      setError(errorMessage);
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

  // Check if URL is valid for testing
  const validateUrl = async (url) => {
    try {
      // Skip validation if already in progress or if login page was already found
      if (validationTaskId || loginPageFound) {
        return false;
      }

      if (!isValidUrl(url)) {
        return false;
      }

      // Reset not found state when starting a new validation
      setLoginPageNotFound(false);

      // Direct validation of URL without creating a product
      const response = await axios.post(
        `${API_URL}/products/validate-url/`,
        { url },
        { withCredentials: true }
      );

      if (response.data && response.data.task_id) {
        // Store the task ID for validation monitoring
        setValidationTaskId(response.data.task_id);
        console.log("URL validation initiated with task ID:", response.data.task_id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error validating URL:', err);
      return false;
    }
  };

  // Handle URL field blur - validate URL when user finishes typing
  const handleUrlBlur = async (e) => {
    const url = e.target.value;
    if (url && isValidUrl(url)) {
      if (loginPageNotFound) {
        // If login page was not found previously and user modified the URL,
        // treat this as a manual login page URL entry
        setLoginPageFound(true);
        setDetectedLoginUrl(url);
        console.log("Manual login URL accepted:", url);
      } else {
        // Normal validation flow
        await validateUrl(url);
      }
    }
  };

  // Function to check validation status
  const checkValidationStatus = async (taskId) => {
    try {
      const response = await axios.get(
        `${API_URL}/products/url-validation-status/${taskId}`,
        { withCredentials: true }
      );

      // If validation is completed
      if (response.data && response.data.status === 'completed') {
        // If login page was found
        if (response.data.results && response.data.results.valid) {
          setLoginPageFound(true);
          setDetectedLoginUrl(response.data.results.login_url || '');
          // Clear the task ID since validation is complete and successful
          setValidationTaskId(null);

          // Reset the not found state if it was previously set
          setLoginPageNotFound(false);
          return true;
        }
        // If login page was not found
        else {
          // Mark as not found and clear task ID
          setLoginPageNotFound(true);
          setValidationTaskId(null);
          console.log("Login page was not found for the URL");
          return true; // Still return true to stop polling
        }
      }
      return false;
    } catch (err) {
      console.error('Error checking validation status:', err);
      setValidationTaskId(null);
      setLoginPageNotFound(true);
      return false;
    }
  };

  // Poll for validation results when taskId is available
  useEffect(() => {
    if (!validationTaskId) return;

    let intervalId;
    const pollValidation = () => {
      intervalId = setInterval(async () => {
        const success = await checkValidationStatus(validationTaskId);
        if (success) {
          clearInterval(intervalId);
        }
      }, 5000); // Check every 5 seconds
    };

    pollValidation();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [validationTaskId]);

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
                            onBlur={handleUrlBlur}
                            className={`appearance-none rounded-md relative block w-full px-3 py-2 pr-10 border ${
                              loginPageFound ? 'border-green-300 bg-green-50' :
                              loginPageNotFound ? 'border-amber-300 bg-amber-50' :
                              validationTaskId ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
                            } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                            placeholder={loginPageNotFound ? "Enter product URL or login page URL directly" : "https://example.com"}
                          />
                          {validationTaskId && !loginPageFound && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            </div>
                          )}
                          {loginPageFound && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                          )}
                          {loginPageNotFound && !loginPageFound && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            </div>
                          )}
                        </div>
                        {formData.url && isValidUrl(formData.url) && !validationTaskId && !loginPageFound && (
                          <button
                            type="button"
                            onClick={() => validateUrl(formData.url)}
                            className="ml-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 whitespace-nowrap"
                          >
                            Validate URL
                          </button>
                        )}
                        {loginPageNotFound && !loginPageFound && (
                          <button
                            type="button"
                            onClick={() => {
                              setLoginPageNotFound(false);
                              validateUrl(formData.url);
                            }}
                            className="ml-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-md text-sm hover:bg-amber-200 whitespace-nowrap"
                          >
                            Retry Detection
                          </button>
                        )}
                      </div>
                      {validationTaskId && !loginPageFound && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center">
                            <div className="animate-spin mr-3 h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium text-blue-700">
                                Validating URL and searching for login page...
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                This may take a few moments. We're checking if this website has a login page we can use for testing.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {loginPageNotFound && !loginPageFound && (
                        <p className="mt-1 text-sm text-amber-600">
                          No login page detected. Try entering the login URL directly in the field above.
                        </p>
                      )}
                      {loginPageFound && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-green-800">Login page detected!</p>
                              {detectedLoginUrl && (
                                <div className="mt-1 flex items-center text-sm text-green-700">
                                  <LinkIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                                  <a
                                    href={detectedLoginUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-green-800"
                                  >
                                    {detectedLoginUrl}
                                  </a>
                                </div>
                              )}
                              <p className="text-xs text-green-600 mt-1">
                                We'll use this for automated testing. You'll be able to add login credentials in the next step.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
                    disabled={isLoading || (validationTaskId && !loginPageFound)}
                    className={`px-5 py-2 rounded-md flex items-center
                      ${isLoading ? 'bg-gray-400 cursor-not-allowed' :
                        loginPageFound ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
                      text-white transition-colors`}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Creating...
                      </>
                    ) : validationTaskId && !loginPageFound ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Validating URL...
                      </>
                    ) : loginPageFound ? (
                      <>
                        Create Product with Login Page
                        <CheckCircle className="ml-2 h-5 w-5" />
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
                      onBlur={handleUrlBlur}
                      className={`appearance-none rounded-md relative block w-full px-3 py-2 pr-10 border ${
                        loginPageFound ? 'border-green-300 bg-green-50' :
                        loginPageNotFound ? 'border-amber-300 bg-amber-50' :
                        validationTaskId ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
                      } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      placeholder={loginPageNotFound ? "Enter product URL or login page URL directly" : "https://example.com"}
                    />
                    {validationTaskId && !loginPageFound && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                    {loginPageFound && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                    {loginPageNotFound && !loginPageFound && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      </div>
                    )}
                  </div>
                  {formData.url && isValidUrl(formData.url) && !validationTaskId && !loginPageFound && (
                    <button
                      type="button"
                      onClick={() => validateUrl(formData.url)}
                      className="ml-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 whitespace-nowrap"
                    >
                      Validate URL
                    </button>
                  )}
                  {loginPageNotFound && !loginPageFound && (
                    <button
                      type="button"
                      onClick={() => {
                        setLoginPageNotFound(false);
                        validateUrl(formData.url);
                      }}
                      className="ml-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-md text-sm hover:bg-amber-200 whitespace-nowrap"
                    >
                      Retry Detection
                    </button>
                  )}
                </div>
                {validationTaskId && !loginPageFound && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center">
                      <div className="animate-spin mr-3 h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">
                          Validating URL and searching for login page...
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          This may take a few moments. We're checking if this website has a login page we can use for testing.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {loginPageNotFound && !loginPageFound && (
                  <p className="mt-1 text-sm text-amber-600">
                    No login page detected. Try entering the login URL directly in the field above.
                  </p>
                )}
                {loginPageFound && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Login page detected!</p>
                        {detectedLoginUrl && (
                          <div className="mt-1 flex items-center text-sm text-green-700">
                            <LinkIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            <a
                              href={detectedLoginUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-green-800"
                            >
                              {detectedLoginUrl}
                            </a>
                          </div>
                        )}
                        <p className="text-xs text-green-600 mt-1">
                          We'll use this for automated testing. You'll be able to add login credentials in the next step.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Enter the URL of your product's website. We'll automatically check if there's a login page.
                </p>
              </div>
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
              disabled={isLoading || (validationTaskId && !loginPageFound)}
              className={`px-5 py-2 rounded-md flex items-center
                ${isLoading ? 'bg-gray-400 cursor-not-allowed' :
                  loginPageFound ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
                text-white transition-colors`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Creating...
                </>
              ) : validationTaskId && !loginPageFound ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Validating URL...
                </>
              ) : loginPageFound ? (
                <>
                  Create Product with Login Page
                  <CheckCircle className="ml-2 h-5 w-5" />
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
