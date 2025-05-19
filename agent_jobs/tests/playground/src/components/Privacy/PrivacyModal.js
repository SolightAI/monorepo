import React, { useState, useRef, useEffect } from 'react';

const PrivacyModal = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false); // State for settings view
  // State to track checkbox interaction for enabling Save
  const [prefsChanged, setPrefsChanged] = useState(false);
  // State to hold checkbox values (example)
  const [analyticsChecked, setAnalyticsChecked] = useState(true);
  const [marketingChecked, setMarketingChecked] = useState(false);

  // Handlers remain the same, console logs for demonstration
  const handleAccept = () => {
    console.log('Cookies accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    console.log('Cookies declined');
    setIsVisible(false);
  };

  const handleSettings = () => {
    console.log('Toggle cookie settings view');
    setShowSettings(!showSettings);
  };

  const handleSavePreferences = () => {
    console.log('Saving cookie preferences...');
    // Example: Log the state that would be saved
    console.log(`Analytics: ${analyticsChecked}, Marketing: ${marketingChecked}`);
    setShowSettings(false);
    setIsVisible(false);
  };

  // Handle checkbox changes
  const handleCheckboxChange = (setter, value) => {
    setter(value);
    setPrefsChanged(true); // Mark preferences as changed
  };

  if (!isVisible) {
    return null;
  }

  // Base button styles (reuse from Banner or define locally)
  const baseButtonStyles = "cursor-pointer btn inline-flex justify-center items-center border font-medium rounded focus:outline-none whitespace-nowrap px-4 py-2 text-xs md:text-sm text-white border-transparent hover:no-underline hover:shadow";
  // Specific styles to make accept/decline initially similar
  const acceptDeclineInitialStyle = "bg-gray-500 hover:bg-gray-600";

  return (
    // Overlay to block background interaction
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4">
      {/* Modal Container */}
      <div className="bg-gray-800 text-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden relative">

        {/* Close Button (Top Right) */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
          aria-label="Close"
        >
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Your Privacy Matters</h3>
            <p className="text-sm mb-2">
              We use cookies and similar technologies to enhance your browsing experience, personalize content and ads, provide social media features, and analyze our traffic. By clicking "Accept All", you consent to the use of all the cookies. You can change your cookie settings at any time.
            </p>
            {!showSettings && (
              <p className="text-xs">
                Read our <a href="/privacy-policy" className="underline hover:text-gray-300">Privacy Policy</a> and <a href="/cookie-policy" className="underline hover:text-gray-300">Cookie Policy</a> for more details.
              </p>
            )}
          </div>

          {/* Settings View */}
          {showSettings && (
            <div className="mt-4 pt-4 border-t border-gray-600">
              <h4 className="text-md font-semibold mb-2">Manage Cookie Preferences</h4>
              <div className="space-y-2 text-sm mb-4">
                <label className="flex items-center">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-green-500 border-gray-500 rounded mr-2 focus:ring-green-400" defaultChecked disabled />
                  <span>Necessary Cookies (Required)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-green-500 border-gray-500 rounded mr-2 focus:ring-green-400"
                    checked={analyticsChecked}
                    onChange={(e) => handleCheckboxChange(setAnalyticsChecked, e.target.checked)}
                  />
                  <span>Analytics Cookies</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-green-500 border-gray-500 rounded mr-2 focus:ring-green-400"
                    checked={marketingChecked}
                    onChange={(e) => handleCheckboxChange(setMarketingChecked, e.target.checked)}
                  />
                  <span>Marketing Cookies</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Area */}
        <div className="bg-gray-700 px-6 py-4 flex flex-wrap justify-end items-center space-x-2 md:space-x-3">
          {showSettings ? (
            // Replace Save button with div, conditionally enabled
            <div
              onClick={prefsChanged ? handleSavePreferences : undefined} // Only allow click if prefsChanged
              className={`${baseButtonStyles} ${ prefsChanged ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 cursor-not-allowed opacity-50' }`}
              role="button"
              tabIndex={prefsChanged ? 0 : -1}
              aria-disabled={!prefsChanged}
              title={!prefsChanged ? "Change a preference to enable saving" : "Save your cookie preferences"}
            >
              {/* Save Preferences button - already a div */}
              <span>Save </span><span>Preferences</span>
            </div>
          ) : (
            <>
              {/* Replace Settings button with div */}
              <div
                onClick={handleSettings}
                className={`${baseButtonStyles} bg-gray-600 hover:bg-gray-700`}
                role="button"
                tabIndex={0}
              >
                {/* Settings button - already a div */}
                <span>Cookie </span><span>Settings</span>
              </div>
              {/* Standard Accept Button */}
              <div
                onClick={handleAccept} // Always active now
                className={`${baseButtonStyles} bg-green-500 hover:bg-green-600`} // Standard active green style
                role="button"
                tabIndex={0} // Always focusable
                title={"Accept all cookies"}
              >
                {/* Accept button - hover logic removed */}
                <span>Accept </span><span className="ml-1">All</span>
              </div>
              {/* Standard Decline Button */}
              <div
                onClick={handleDecline}
                className={`${baseButtonStyles} ${acceptDeclineInitialStyle} hover:bg-red-600`} // Changes to red on hover
                role="button"
                tabIndex={0}
              >
                {/* Decline button */}
                <span>Dec</span><span>line</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal;
