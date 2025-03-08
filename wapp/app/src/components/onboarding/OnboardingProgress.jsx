const OnboardingProgress = ({ currentStep, totalSteps }) => {
  // Create an array of step numbers
  const steps = Array.from({ length: totalSteps }, (_, i) => i);

  return (
    <div className="flex items-center justify-between">
      <div className="flex-grow flex">
        {steps.map((step) => (
          <div key={step} className="flex-grow flex items-center">
            <div 
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                step < currentStep 
                  ? 'bg-blue-600 text-white' 
                  : step === currentStep 
                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' 
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step < currentStep ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                step + 1
              )}
            </div>
            {step < steps.length - 1 && (
              <div 
                className={`flex-grow h-0.5 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="ml-4 text-sm font-medium text-gray-500">
        Step {currentStep + 1} of {totalSteps}
      </div>
    </div>
  );
};

export default OnboardingProgress; 