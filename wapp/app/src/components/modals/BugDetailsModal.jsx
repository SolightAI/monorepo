import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ContactFormModal from './ContactFormModal';
import axios from 'axios';
import { Loader, ExternalLink, Check, X, Bug, Calendar, User, AlertTriangle, Image, Calendar as CalendarIcon } from 'lucide-react';
import { getModalContainerProps, getModalContentProps } from '@/utils/modalUtils';

function BugDetailsModal({ bug, onClose, isRestricted }) {
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  // Add useEffect hook to handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (selectedScreenshot !== null) {
          setSelectedScreenshot(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, selectedScreenshot]);

  // Function to handle screenshot click
  const handleScreenshotClick = (screenshot) => {
    setSelectedScreenshot(screenshot);
  };

  // Function to close the full-size screenshot view
  const closeFullScreenshot = () => {
    setSelectedScreenshot(null);
  };

  // Function to mock creating a Jira ticket
  const createJiraTicket = () => {
    setIsCreatingTicket(true);

    // Simulate API call with timeout
    setTimeout(() => {
      setIsCreatingTicket(false);
      setTicketCreated(true);
      // In a real app, you would update the bug with the new ticket info from the API response
    }, 1500);
  };

  // Function to handle opening the contact form
  const handleUpgradeClick = () => {
    setShowContactForm(true);
  };

  // Function to handle closing the contact form
  const handleContactFormClose = () => {
    setShowContactForm(false);
  };

  return (
    <div {...getModalContainerProps(onClose)}>
      <div {...getModalContentProps('w-[800px]')}>
        {/* Header */}
        <div className="p-6 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{bug.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                BUG-{String(bug.id).padStart(3, "0")} • Detected on {bug.detectedAt}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* <div>
              <h3 className="text-sm font-medium text-gray-500">Page</h3>
              <p className="mt-1 text-sm text-gray-900">{bug.page}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Category</h3>
              <p className="mt-1 text-sm text-gray-900">{bug.category}</p>
            </div> */}
            <div>
              <h3 className="text-sm font-medium text-gray-500">Severity</h3>
              <span
                className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1
                ${bug.severity === "Critical" ? "bg-red-100 text-red-800" : ""}
                ${bug.severity === "High" ? "bg-orange-100 text-orange-800" : ""}
                ${bug.severity === "Medium" ? "bg-yellow-100 text-yellow-800" : ""}
              `}
              >
                {bug.severity === "Critical" && (
                  <svg className="mr-1 h-2 w-2 text-red-500" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                )}
                {bug.severity}
              </span>
            </div>
            {bug.url && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Page</h3>
                <a
                  href={bug.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View bug
                </a>
              </div>
            )}
            {/* <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                In Progress
              </span>
            </div> */}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p className="text-sm text-gray-600" {...props} />
              }}
            >
              {bug.description}
            </ReactMarkdown>
          </div>

          {/* Steps to Reproduce */}
          {/* <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Steps to Reproduce</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li className="text-sm text-gray-600">Navigate to the Products page</li>
              <li className="text-sm text-gray-600">Locate the price range slider in the filters section</li>
              <li className="text-sm text-gray-600">Adjust the minimum and maximum price values</li>
              <li className="text-sm text-gray-600">Observe that the product list does not update</li>
            </ol>
          </div> */}

          {/* AI Analysis */}
          {/* <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">AI Analysis</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <p className="text-sm text-amber-800">
                The price filter component is not triggering the filter update function when the slider values change.
                The event listener is attached to the 'change' event, but the slider component is using a custom event
                called 'slider-change' which is not being captured.
              </p>
            </div>
          </div> */}

          {/* Suggested Fix */}
          {/* <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Suggested Fix</h3>
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">
                Update the event listener to capture both 'change' and 'slider-change' events, or modify the slider
                component to dispatch a standard 'change' event.
              </p>
            </div>
          </div> */}

          {/* Jira Ticket Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Issue Tracking</h3>
            {isRestricted ? (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <div className="flex items-center">
                  <span className="mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <p className="text-sm text-gray-700">
                    Upgrade to connect bugs directly to <span className="font-medium">Jira</span>, <span className="font-medium">Notion</span>, or <span className="font-medium">Linear</span> for streamlined issue tracking.
                  </p>
                </div>
                <button
                  onClick={handleUpgradeClick}
                  className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Upgrade Now
                </button>
              </div>
            ) : (
              <div>
                {true ? (
                  <div className="flex items-center">
                    <span className="mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <a
                      href={bug.jiraTicket?.url || "https://your-jira-instance.atlassian.net/browse/PROJ-123"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                    >
                      {bug.jiraTicket?.key || "PROJ-244"}: {bug.jiraTicket?.summary || bug.name}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={createJiraTicket}
                    disabled={isCreatingTicket}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingTicket ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating ticket...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add to Jira
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Screenshots */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Screenshots</h3>
            {bug.screenshots && bug.screenshots.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {bug.screenshots.map((screenshot, index) => (
                  <div key={index}>
                    <img
                      src={screenshot}
                      alt={`Bug Screenshot ${index + 1}`}
                      className="w-full h-48 object-cover rounded-md bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleScreenshotClick(screenshot)}
                    />
                    <p className="text-sm text-gray-500 mt-1 text-center">Screenshot {index + 1}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No screenshots available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Full-size screenshot modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60]" onClick={closeFullScreenshot}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeFullScreenshot}
              className="absolute top-4 right-4 bg-white bg-opacity-80 rounded-full p-2 text-gray-800 hover:bg-opacity-100 transition-all"
            >
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <img
              src={selectedScreenshot}
              alt="Full-size screenshot"
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      {showContactForm && (
        <ContactFormModal
          onClose={handleContactFormClose}
          prefilledSubject="Upgrade Request: Issue Tracking Integration"
          prefilledMessage="I'm interested in integrating issue tracking with my bug reports."
        />
      )}
    </div>
  )
}

export default BugDetailsModal
