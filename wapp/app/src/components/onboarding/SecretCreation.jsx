import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Key, ShieldAlert, User, Lock } from 'lucide-react';
import { useSecret } from '@/context/SecretContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useProduct } from '@/context/ProductContext';
import { v4 as uuidv4 } from 'uuid';

const SecretCreation = ({ onNext, onPrev, onSkip }) => {
  const { selectedOrganization } = useOrganization();
  const { selectedProduct } = useProduct();
  const { createSecret, loading } = useSecret();

  const [step, setStep] = useState('intro');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: 'My Credentials',
    description: 'Credentials to use when logging into the application',
    type: 'username_password',
    organization_id: selectedOrganization?.id,
    product_id: selectedProduct?.id,
  });

  // Secret values state
  const [secretValues, setSecretValues] = useState({
    username: '',
    password: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset secretValues when type changes
    if (name === 'type') {
      if (value === 'username_password') {
        setSecretValues({
          username: '',
          password: ''
        });
      } else if (value === 'oauth_credential') {
        setSecretValues({
          provider: '',
          username: '',
          password: ''
        });
      }
    }
  };

  const handleValueChange = (e) => {
    const { name, value } = e.target;
    setSecretValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateSecret = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (formData.type === 'username_password' && (!secretValues.username || !secretValues.password)) {
      setError('Please fill in both username and password fields');
      return;
    } else if (formData.type === 'oauth_credential' && (!secretValues.provider || !secretValues.username || !secretValues.password)) {
      setError('Please fill in all OAuth credential fields');
      return;
    }

    try {
      // Create the secret
      await createSecret({
        ...formData,
        organization_id: selectedOrganization?.id,
        product_id: selectedProduct?.id,
        values: secretValues
      });

      setSuccess(true);
      setStep('success');
    } catch (err) {
      console.error('Error creating secret:', err);
      setError(err.message || 'Failed to create secret. Please try again.');
    }
  };

  const renderIntroduction = () => (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Create Your First Secret</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Secrets are a secure way to store sensitive information like login credentials.
        </p>
      </div>

      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 max-w-3xl mx-auto mb-6">
        <h3 className="text-lg font-medium text-amber-800 mb-2">Why Secrets Matter</h3>
        <p className="text-amber-700">
          Using the Secrets Manager keeps your sensitive information encrypted and secure.
          These secrets will be used by the AI agents to generate and run the tests
          Without them, the AI agents will not be able to login to the application.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <FeatureCard
          icon={<ShieldAlert className="h-6 w-6 text-blue-500" />}
          title="Secure Storage"
          description="All secrets are encrypted at rest using industry-standard encryption"
        />
        <FeatureCard
          icon={<User className="h-6 w-6 text-purple-500" />}
          title="Access Control"
          description="Control who can access which secrets with role-based permissions"
        />
        <FeatureCard
          icon={<Lock className="h-6 w-6 text-green-500" />}
          title="Credential Management"
          description="Store usernames, passwords, tokens, and more"
        />
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={onPrev}
          className="px-5 py-2 border border-gray-300 rounded-md flex items-center hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Product Setup
        </button>

        <button
          onClick={() => setStep('form')}
          className="px-5 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 transition-colors"
        >
          Create Your First Secret
          <ArrowRight className="ml-2 h-5 w-5" />
        </button>

        <button
          onClick={onSkip}
          className="px-5 py-2 border border-gray-300 rounded-md flex items-center hover:bg-gray-50 transition-colors"
        >
          Skip this step
          <ArrowRight className="ml-2 h-5 w-5" />
        </button>
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Create Secret</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Let's create your first secret that you can use in your tests.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleCreateSecret} className="max-w-md mx-auto">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Secret Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Secret Type
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="username_password">Username/Password</option>
            <option value="oauth_credential">OAuth Credentials</option>
          </select>
        </div>

        {formData.type === 'username_password' ? (
          <>
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={secretValues.username}
                onChange={handleValueChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={secretValues.password}
                onChange={handleValueChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
                required
              />
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
                OAuth Provider
              </label>
              <select
                id="provider"
                name="provider"
                value={secretValues.provider || ''}
                onChange={handleValueChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Provider</option>
                <option value="Google">Google</option>
                <option value="GitHub">GitHub</option>
                <option value="Microsoft">Microsoft</option>
                <option value="Apple">Apple</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={secretValues.username}
                onChange={handleValueChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={secretValues.password}
                onChange={handleValueChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
                required
              />
            </div>
          </>
        )}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setStep('intro')}
            className="px-5 py-2 border border-gray-300 rounded-md flex items-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </button>

          <button
            type="submit"
            disabled={loading}
            className={`px-5 py-2 rounded-md flex items-center transition-colors ${
              loading ? 'bg-blue-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                Create Secret
                <Key className="ml-2 h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderSuccess = () => (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Key className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Secret Created Successfully!</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Your first secret has been securely stored in the platform. You can now use it in your tests
          without exposing sensitive information.
        </p>
      </div>

      <div className="bg-green-50 p-4 rounded-lg border border-green-200 max-w-3xl mx-auto mb-6">
        <p className="text-green-700">
          <strong>Pro tip:</strong> You can create different types of secrets including API keys,
          connection strings, environment variables, and more from the Secrets section after completing onboarding.
        </p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onNext}
          className="px-5 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 transition-colors"
        >
          Continue to Features Overview
          <ArrowRight className="ml-2 h-5 w-5" />
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (step) {
      case 'intro':
        return renderIntroduction();
      case 'form':
        return renderForm();
      case 'success':
        return renderSuccess();
      default:
        return renderIntroduction();
    }
  };

  return (
    <div className="onboarding-step">
      {renderContent()}

      {step !== 'intro' && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-between">
            {step === 'form' && (
              <button
                onClick={() => setStep('intro')}
                className="px-5 py-2 border border-gray-300 rounded-md flex items-center hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back
              </button>
            )}
            <button
              onClick={onSkip}
              className="px-5 py-2 border border-gray-300 rounded-md flex items-center hover:bg-gray-50 transition-colors ml-auto"
            >
              Skip this step
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3">{icon}</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </div>
  );
};

export default SecretCreation;
