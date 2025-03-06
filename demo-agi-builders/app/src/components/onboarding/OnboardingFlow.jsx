import { useState } from 'react';
import WelcomeStep from './steps/WelcomeStep';
import PersonalizationStep from './steps/PersonalizationStep';
import FinalStep from './steps/FinalStep';
import LoadingScreen from './LoadingScreen';
import OnboardingProgress from './OnboardingProgress';

const OnboardingFlow = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    role: '',
    teamSize: '',
    interests: [],
    projects: []
  });

  // Total number of steps in the onboarding process
  const totalSteps = 3;

  // Handle next step navigation
  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Show loading screen before completing the onboarding process
      setIsLoading(true);
      // The loading will continue infinitely until user takes action
    }
  };

  // Handle previous step navigation
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle user data updates
  const updateUserData = (data) => {
    setUserData({ ...userData, ...data });
  };

  // Skip onboarding altogether
  const skipOnboarding = () => {
    onComplete();
  };
  
  // Complete the onboarding from the loading state
  const completeOnboarding = () => {
    onComplete(userData);
  };

  // Render the current step
  const renderStep = () => {
    // If in loading state, show the loading screen
    if (isLoading) {
      return (
        <div>
          <LoadingScreen />
          {/* Optional: Add a button to complete the loading process */}
          <div className="mt-6 text-center">
            <button
              onClick={completeOnboarding}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Complete Setup
            </button>
          </div>
        </div>
      );
    }

    // Otherwise, show the appropriate step
    switch (currentStep) {
      case 0:
        return <WelcomeStep 
                 nextStep={nextStep} 
                 skipOnboarding={skipOnboarding} 
               />;
    //   case 1:
        // return <FeatureStep 
        //          nextStep={nextStep} 
        //          prevStep={prevStep} 
        //          userData={userData}
        //        />;
      case 1:
        return <PersonalizationStep 
                 nextStep={nextStep} 
                 prevStep={prevStep} 
                 userData={userData} 
                 updateUserData={updateUserData}
               />;
      case 2:
        return <FinalStep 
                 onComplete={nextStep} 
                 prevStep={prevStep} 
                 userData={userData}
               />;
      default:
        return <WelcomeStep nextStep={nextStep} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
        <div className="p-6">
          {!isLoading && <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} />}
          <div className="mt-6">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow; 