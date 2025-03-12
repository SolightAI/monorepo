const WelcomeStep = ({ nextStep, skipOnboarding }) => {
  return (
    <div className="text-center">
      <div className="mb-8 inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome to QA Agent Dashboard</h2>
      <p className="text-gray-600 mb-8 max-w-xl mx-auto">
        Your intelligent testing assistant that helps you catch bugs before they reach production.
        Let's set up your personalized dashboard in just a few steps.
      </p>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:space-x-4 justify-center">
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4 md:mb-0 md:w-1/3">
            <div className="text-blue-600 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Automated Testing</h3>
            <p className="text-sm text-gray-500">Run tests automatically and monitor results in real-time</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4 md:mb-0 md:w-1/3">
            <div className="text-amber-600 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">AI Bug Detection</h3>
            <p className="text-sm text-gray-500">Intelligently identify potential bugs and issues</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 md:w-1/3">
            <div className="text-green-600 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">Insightful Analytics</h3>
            <p className="text-sm text-gray-500">Track your test coverage and quality metrics</p>
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
        <button
          onClick={skipOnboarding}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Skip for Now
        </button>
        <button
          onClick={nextStep}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;
