import React from 'react';
import { ArrowRight, ArrowLeft, Check, Play, BugPlay, Key, Link as LinkIcon, BarChart } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import { Link } from 'react-router-dom';

const FeaturesOverview = ({ onNext, onPrev, onSkip }) => {
  const { completeOnboarding } = useOnboarding();

  const handleFinish = () => {
    completeOnboarding();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">What to do next</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Let's explore the main features of Laneo that will help you organize and execute your testing workflow.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <FeatureCard
          title="Test Creation and Management"
          icon={<Check className="h-6 w-6 text-green-500" />}
          description="Create comprehensive tests with detailed steps, expected outcomes, and actual results. Categorize tests to organize your test suite."
          links={[
            { label: "Create a Test", path: "/tests" }
          ]}
        />

        <FeatureCard
          title="Bug Tracking"
          icon={<BugPlay className="h-6 w-6 text-red-500" />}
          description="Log bugs with severity levels, screenshots, and detailed descriptions. Link bugs directly to failed tests for easy traceability."
          links={[
            { label: "View Bugs", path: "/bugs" }
          ]}
        />

        <FeatureCard
          title="Secure Secret Management"
          icon={<Key className="h-6 w-6 text-purple-500" />}
          description="Safely store and manage test credentials and sensitive information with encrypted storage and controlled access."
          links={[
            { label: "Manage Secrets", path: "/secrets" }
          ]}
        />

        <FeatureCard
          title="Organization Management"
          icon={<LinkIcon className="h-6 w-6 text-indigo-500" />}
          description="Organize testing by products, epics, features, and acceptance criteria. Create clear hierarchies for all your test assets."
          links={[
            { label: "Organization Dashboard", path: "/organizations/dashboard" }
          ]}
        />
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onPrev}
          className="px-5 py-2 border border-gray-300 rounded-md flex items-center hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </button>
        <button
          onClick={handleFinish}
          className="px-6 py-3 bg-green-600 text-white rounded-md flex items-center hover:bg-green-700 transition-colors"
        >
          Complete Onboarding
          <ArrowRight className="ml-2 h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

const FeatureCard = ({ title, icon, description, links = [] }) => {
  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center mb-3">
        <div className="mr-3">{icon}</div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 mb-4">{description}</p>
      {links.length > 0 && (
        <div className="mt-auto pt-2 border-t border-gray-100">
          {links.map((link, index) => (
            <Link
              key={index}
              to={link.path}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center mt-2"
            >
              {link.label}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturesOverview;
