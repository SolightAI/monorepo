import React, { useState, useEffect, useRef } from 'react';

const PrivacyBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false); // State for settings view
  const [timedAcceptActive, setTimedAcceptActive] = useState(false); // State for *timed* accept button activation

  // Simulate activation delay for one accept button
  useEffect(() => {
    if (isVisible && !timedAcceptActive) { // Only run if banner is visible and not already active
      const timer = setTimeout(() => {
        setTimedAcceptActive(true);
      }, 1500); // 1.5 second delay
      return () => clearTimeout(timer);
    }
  }, [isVisible, timedAcceptActive]);

  const handleAccept = () => {
    // Add logic to handle acceptance (e.g., set a cookie)
    console.log('Cookies accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    // Add logic to handle decline
    console.log('Cookies declined');
    setIsVisible(false);
  };

  const handleSettings = () => {
    // Add logic to open a detailed cookie settings modal
    console.log('Toggle cookie settings view');
    setShowSettings(!showSettings); // Toggle settings view
  };

  const handleSavePreferences = () => {
    // Add logic to save selected preferences
    console.log('Saving cookie preferences...');
    // You would typically read the state of the checkboxes here
    setShowSettings(false); // Close settings view after saving
    setIsVisible(false); // Optionally close the banner after saving
  };

  if (!isVisible) {
    return null;
  }

  // Base button styles
  const baseButtonStyles = "border-transparent hover:no-underline hover:shadow cursor-pointer btn inline-flex justify-center items-center border font-medium rounded focus:outline-none whitespace-nowrap px-4 py-2 text-xs md:text-sm text-white";
  // Specific styles to make accept/decline initially similar
  const acceptDeclineInitialStyle = "bg-gray-500 hover:bg-gray-600";


  return (
    <div className="privacy-banner fixed z-50 left-0 bottom-0 right-0 p-6 bg-gray-800 text-white shadow-lg">
      <div className="container mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center">
        <div className="mb-4 lg:mb-0 lg:mr-6 flex-grow">
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
          <div className="w-full mt-4 pt-4 border-t border-gray-600">
            <h4 className="text-md font-semibold mb-2">Manage Cookie Preferences</h4>
            <div className="space-y-2 text-sm mb-4">
              <label className="flex items-center">
                <input type="checkbox" className="form-checkbox h-4 w-4 text-green-500 border-gray-500 rounded mr-2 focus:ring-green-400" defaultChecked disabled />
                <span>Necessary Cookies (Required)</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="form-checkbox h-4 w-4 text-green-500 border-gray-500 rounded mr-2 focus:ring-green-400" defaultChecked />
                <span>Analytics Cookies</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="form-checkbox h-4 w-4 text-green-500 border-gray-500 rounded mr-2 focus:ring-green-400" />
                <span>Marketing Cookies</span>
              </label>
            </div>
          </div>
        )}

        {/* Action Buttons Container */}
        <div className="flex flex-shrink-0 space-x-2 md:space-x-3 mt-4 lg:mt-0 items-center">
          {/* Close button as div */}
          <div
            onClick={() => setIsVisible(false)}
            className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none lg:static lg:order-last lg:ml-3 cursor-pointer"
            role="button"
            tabIndex="0"
            aria-label="Close banner"
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          {showSettings ? (
             <div
              onClick={handleSavePreferences}
              className={`${baseButtonStyles} bg-blue-500 hover:bg-blue-600`}
              role="button"
              tabIndex="0"
            >
               {/* Save Preferences button as div */}
              <span>Save </span><span>Preferences</span>
            </div>
          ) : (
            <>
              <div
                onClick={handleSettings}
                className={`${baseButtonStyles} bg-gray-600 hover:bg-gray-700`}
                role="button"
                tabIndex="0"
              >
                 {/* Cookie Settings button as div */}
                <span>Cookie </span><span>Settings</span>
              </div>

              <div
                onClick={timedAcceptActive ? handleAccept : undefined}
                className={`${baseButtonStyles} ${ timedAcceptActive ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 cursor-not-allowed opacity-70' }`}
                role="button"
                tabIndex={timedAcceptActive ? 0 : -1}
                aria-disabled={!timedAcceptActive}
                title={!timedAcceptActive ? "Waiting..." : "Accept all cookies"}
              >
                {/* Accept All button (Time Delayed) - Kept original logic */}
                <span>Accept </span><span className="ml-1">All</span>
              </div>

              <div
                onClick={handleDecline}
                 className={`${baseButtonStyles} ${acceptDeclineInitialStyle} hover:bg-red-600`} // Changes to red on hover
                role="button"
                tabIndex="0"
              >
                 {/* Decline button as div */}
                 <span>Dec</span><span>line</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyBanner;
