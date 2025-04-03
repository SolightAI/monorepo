import React from 'react';
import { ArrowRight, Check, Search, Activity, Lock } from 'lucide-react';

const WelcomeScreen = ({ onNext, onSkip }) => {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Laneo</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Your comprehensive platform for managing test products, tracking bugs, and organizing testing workflows.
          Let's get you started with a quick tour of the key features.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <FeatureCard
          icon={<Search className="h-8 w-8 text-blue-500" />}
          title="Organized Testing Structure"
          description="Manage your testing with our hierarchical structure: Products → Epics → Features → User Stories → Acceptance Criteria → Tests"
        />
        <FeatureCard
          icon={<Check className="h-8 w-8 text-green-500" />}
          title="Comprehensive Test Management"
          description="Create, track, and manage tests with detailed steps, expected results, and actual outcomes"
        />
        <FeatureCard
          icon={<Activity className="h-8 w-8 text-purple-500" />}
          title="Bug Tracking and Reporting"
          description="Track bugs with severity levels, screenshots, and link them directly to failed tests"
        />
        <FeatureCard
          icon={<Lock className="h-8 w-8 text-amber-500" />}
          title="Secure Test Credentials Management"
          description="Safely store and manage test credentials and sensitive information for your testing environments"
        />
      </div>

      <div className="flex justify-center mt-10">
        <button
          onClick={onNext}
          className="px-6 py-3 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 transition-colors"
        >
          Continue to Product Structure
          <ArrowRight className="ml-2 h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-4">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
