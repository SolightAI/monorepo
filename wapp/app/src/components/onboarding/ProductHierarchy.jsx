import React from 'react';
import { ArrowRight, ArrowLeft, Package, Layout, Layers, User, CheckSquare, Beaker } from 'lucide-react';

const ProductHierarchy = ({ onNext, onPrev, onSkip }) => {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Understanding Product Structure</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Laneo uses a hierarchical structure to organize your testing workflow.
          This helps you maintain a clear relationship between product features and their tests.
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="relative w-full max-w-3xl">
          {/* Hierarchy Diagram */}
          <div className="flex flex-col items-center">
            <HierarchyNode
              icon={<Package className="h-6 w-6" />}
              title="Product"
              description="Your software application or system"
              color="blue"
              isFirst
            />
            <HierarchyConnector />
            <HierarchyNode
              icon={<Layout className="h-6 w-6" />}
              title="Epic"
              description="Major product area or theme"
              color="indigo"
            />
            <HierarchyConnector />
            <HierarchyNode
              icon={<Layers className="h-6 w-6" />}
              title="Feature"
              description="Specific functionality within an epic"
              color="purple"
            />
            <HierarchyConnector />
            <HierarchyNode
              icon={<User className="h-6 w-6" />}
              title="User Story"
              description="User-centric description of feature behavior"
              color="pink"
            />
            <HierarchyConnector />
            <HierarchyNode
              icon={<CheckSquare className="h-6 w-6" />}
              title="Acceptance Criteria"
              description="Requirements for feature completion"
              color="red"
            />
            <HierarchyConnector />
            <HierarchyNode
              icon={<Beaker className="h-6 w-6" />}
              title="Test"
              description="Verification of criteria fulfillment"
              color="green"
              isLast
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 max-w-3xl mx-auto">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Why This Structure Matters</h3>
        <p className="text-blue-700">
          This hierarchical approach ensures that all tests are tied to specific features and requirements.
          It makes tracking test coverage easier and helps identify which features need more testing.
          During onboarding, we'll help you set up your first organization and product to get started.
        </p>
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
          onClick={onNext}
          className="px-5 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 transition-colors"
        >
          Continue to Organization Setup
          <ArrowRight className="ml-2 h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

const HierarchyNode = ({ icon, title, description, color, isFirst, isLast }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    pink: 'bg-pink-100 text-pink-800 border-pink-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    green: 'bg-green-100 text-green-800 border-green-300',
  };

  return (
    <div className={`w-64 p-4 rounded-lg shadow-sm border ${colorClasses[color]} z-10`}>
      <div className="flex items-center mb-2">
        <div className="mr-3">{icon}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className={`text-sm ${color === 'blue' ? 'text-blue-600' : color === 'indigo' ? 'text-indigo-600' : color === 'purple' ? 'text-purple-600' : color === 'pink' ? 'text-pink-600' : color === 'red' ? 'text-red-600' : 'text-green-600'}`}>
        {description}
      </p>
    </div>
  );
};

const HierarchyConnector = () => (
  <div className="h-8 w-0.5 bg-gray-300 my-2"></div>
);

export default ProductHierarchy;
