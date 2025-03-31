import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useOnboarding } from '@/context/OnboardingContext';
import WelcomeScreen from './WelcomeScreen';
import ProductHierarchy from './ProductHierarchy';
import OrganizationSetup from './OrganizationSetup';
import ProductSetup from './ProductSetup';
import SecretCreation from './SecretCreation';
import FeaturesOverview from './FeaturesOverview';

const OnboardingModal = () => {
  const {
    showOnboarding,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipOnboarding,
    setTotalSteps
  } = useOnboarding();

  // Set total steps on mount
  useEffect(() => {
    setTotalSteps(6); // 6 steps in our onboarding
  }, [setTotalSteps]);

  // Don't render anything if onboarding is not shown
  if (!showOnboarding) {
    return null;
  }

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeScreen onNext={nextStep} onSkip={skipOnboarding} />;
      case 1:
        return <ProductHierarchy onNext={nextStep} onPrev={prevStep} onSkip={skipOnboarding} />;
      case 2:
        return <OrganizationSetup onNext={nextStep} onPrev={prevStep} onSkip={skipOnboarding} />;
      case 3:
        return <ProductSetup onNext={nextStep} onPrev={prevStep} onSkip={skipOnboarding} />;
      case 4:
        return <SecretCreation onNext={nextStep} onPrev={prevStep} onSkip={skipOnboarding} />;
      case 5:
        return <FeaturesOverview onNext={nextStep} onPrev={prevStep} onSkip={skipOnboarding} />;
      default:
        return <WelcomeScreen onNext={nextStep} onSkip={skipOnboarding} />;
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-800">Getting Started with Laneo</h2>
          <button
            onClick={skipOnboarding}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close onboarding"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          {renderStepContent()}
        </div>

        {/* Progress indicator */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-600">Step {currentStep + 1} of {totalSteps}</span>
            <button
              onClick={skipOnboarding}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Skip Onboarding
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
