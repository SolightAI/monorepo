const FinalStep = ({ onComplete, prevStep, userData }) => {
  // Get user's name or use a default value
  const userName = userData.name ? userData.name.split(' ')[0] : 'there';

  // Get a list of interest labels based on IDs
  const getInterestLabels = () => {
    const interestMap = {
      "web-testing": "Web Testing",
      "mobile-testing": "Mobile Testing",
      "api-testing": "API Testing",
      "performance": "Performance Testing",
      "security": "Security Testing",
      "accessibility": "Accessibility Testing",
      "automation": "Test Automation",
      "ci-cd": "CI/CD Integration"
    };

    return userData.interests.map(id => interestMap[id] || id);
  };

  const interestLabels = getInterestLabels();

  return (
    <div className="text-center">
      <div className="mb-8 inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold text-gray-900 mb-3">You're all set, {userName}!</h2>
      <p className="text-gray-600 mb-8 max-w-xl mx-auto">
        Your QA Agent Dashboard is ready to help you streamline your testing process.
      </p>

      {(userData.role || userData.teamSize || interestLabels.length > 0) && (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 mb-8 max-w-md mx-auto text-left">
          <h3 className="text-lg font-medium text-blue-900 mb-4">Your Profile Summary</h3>
          {userData.role && (
            <div className="flex items-start mb-3">
              <div className="text-blue-500 mr-3 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Role</p>
                <p className="text-sm text-gray-600">{userData.role}</p>
              </div>
            </div>
          )}
          {userData.teamSize && (
            <div className="flex items-start mb-3">
              <div className="text-blue-500 mr-3 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Team Size</p>
                <p className="text-sm text-gray-600">{userData.teamSize}</p>
              </div>
            </div>
          )}
          {interestLabels.length > 0 && (
            <div className="flex items-start">
              <div className="text-blue-500 mr-3 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Areas of Interest</p>
                <div className="flex flex-wrap mt-1">
                  {interestLabels.map((interest, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-2"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
        <button
          onClick={prevStep}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Get Started with QA Agent
        </button>
      </div>
    </div>
  );
};

export default FinalStep;
