import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Users, Building, Briefcase, GraduationCap, CheckCircle, AlertCircle } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';

const OrganizationSetup = ({ onNext, onPrev, onSkip }) => {
  const { createOrganization, organizations } = useOrganization();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'individual',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasOrganizations, setHasOrganizations] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [showNewOrgForm, setShowNewOrgForm] = useState(false);

  // Check if user already has organizations
  useEffect(() => {
    if (organizations && organizations.length > 0) {
      setHasOrganizations(true);
    }
  }, [organizations]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call the createOrganization method from the context
      await createOrganization(formData);
      setCreateSuccess(true);

      // Proceed to next step after a short delay
      setTimeout(() => {
        onNext();
      }, 1500);
    } catch (err) {
      // Extract error message from the API response
      const errorMessage = err.response?.data?.detail ||
                          err.response?.data?.msg ||
                          err.message ||
                          'An error occurred while creating the organization. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    onNext();
  };

  const toggleNewOrgForm = () => {
    setShowNewOrgForm(!showNewOrgForm);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Organization Setup</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Create your organization to start managing products and collaborating with your team.
        </p>
      </div>

      {createSuccess ? (
        <div className="bg-green-50 p-6 rounded-lg border border-green-200 max-w-xl mx-auto text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-green-800 mb-2">Organization Created!</h3>
          <p className="text-green-700 mb-6">
            Your organization has been successfully created. You can now add products and invite team members.
          </p>
          <button
            onClick={onNext}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Continue to Product Setup
          </button>
        </div>
      ) : hasOrganizations ? (
        <div className="max-w-xl mx-auto">
          {!showNewOrgForm ? (
            <>
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3">
                    <CheckCircle className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-blue-800 mb-2">You're Already Set Up</h3>
                    <p className="text-blue-700">
                      You already have {organizations.length} organization{organizations.length !== 1 ? 's' : ''}.
                      You can continue to the next step or create another organization below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <button
                  onClick={handleContinue}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 transition-colors"
                >
                  Continue With Existing Organization
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={toggleNewOrgForm}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  or create a new organization
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
                  onClick={toggleNewOrgForm}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Use existing organization instead
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
                      Organization Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter your organization name"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This will be the name displayed throughout the application.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Type
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <TypeCard
                        id="individual"
                        name="type"
                        value="individual"
                        title="Individual"
                        icon={<Users className="h-5 w-5" />}
                        description="Personal use or solo testing"
                        checked={formData.type === 'individual'}
                        onChange={handleChange}
                      />
                      <TypeCard
                        id="startup"
                        name="type"
                        value="startup"
                        title="Startup"
                        icon={<Briefcase className="h-5 w-5" />}
                        description="Small teams and growing companies"
                        checked={formData.type === 'startup'}
                        onChange={handleChange}
                      />
                      <TypeCard
                        id="enterprise"
                        name="type"
                        value="enterprise"
                        title="Enterprise"
                        icon={<Building className="h-5 w-5" />}
                        description="Large organizations with multiple teams"
                        checked={formData.type === 'enterprise'}
                        onChange={handleChange}
                      />
                      <TypeCard
                        id="education"
                        name="type"
                        value="education"
                        title="Education"
                        icon={<GraduationCap className="h-5 w-5" />}
                        description="Schools, universities and training"
                        checked={formData.type === 'education'}
                        onChange={handleChange}
                      />
                    </div>
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
                        Create New Organization
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
                Organization Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your organization name"
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be the name displayed throughout the application.
              </p>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <TypeCard
                  id="individual"
                  name="type"
                  value="individual"
                  title="Individual"
                  icon={<Users className="h-5 w-5" />}
                  description="Personal use or solo testing"
                  checked={formData.type === 'individual'}
                  onChange={handleChange}
                />
                <TypeCard
                  id="startup"
                  name="type"
                  value="startup"
                  title="Startup"
                  icon={<Briefcase className="h-5 w-5" />}
                  description="Small teams and growing companies"
                  checked={formData.type === 'startup'}
                  onChange={handleChange}
                />
                <TypeCard
                  id="enterprise"
                  name="type"
                  value="enterprise"
                  title="Enterprise"
                  icon={<Building className="h-5 w-5" />}
                  description="Large organizations with multiple teams"
                  checked={formData.type === 'enterprise'}
                  onChange={handleChange}
                />
                <TypeCard
                  id="education"
                  name="type"
                  value="education"
                  title="Education"
                  icon={<GraduationCap className="h-5 w-5" />}
                  description="Schools, universities and training"
                  checked={formData.type === 'education'}
                  onChange={handleChange}
                />
              </div>
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
                  Create Organization
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

const TypeCard = ({ id, name, value, title, icon, description, checked, onChange }) => {
  return (
    <label
      htmlFor={id}
      className={`cursor-pointer border rounded-lg p-4 flex items-start hover:border-blue-500 transition-colors ${
        checked ? 'bg-blue-50 border-blue-500' : 'border-gray-200'
      }`}
    >
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-md ${checked ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
          {icon}
        </div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    </label>
  );
};

export default OrganizationSetup;
