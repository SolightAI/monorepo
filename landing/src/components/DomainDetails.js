import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import BugDetailsModal from './BugDetailsModal';
import ContactFormModal from './ContactFormModal';

/**
 * Component to display the details of a domain from CSV data using AiDetectedBugs style
 */
const DomainDetails = ({ data }) => {
  const [selectedBug, setSelectedBug] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [sortBy, setSortBy] = useState("Sort by Severity");

  if (!data || data.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">
      <h2 className="text-2xl font-bold text-gray-700">Domain details not found</h2>
    </div>;
  }

  // Get domain name and link from the first row (should be the same for all rows)
  const domainName = data[0].Domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
  const domainLink = data[0].Domain || '#';

  // User authentication status (always false in this version)
  const userIsAuthenticated = false;
  // Content is not restricted for this version
  const contentIsRestricted = false;

  // Convert our CSV data format to the bug format expected by the component
  const bugs = data.map((issue, index) => ({
    id: index + 1,
    title: issue.Name,
    description: issue.Description,
    severity: issue.Severity,
    detectedAt: new Date().toLocaleDateString(), // Use current date or add date field to CSV
    category: "UX Issue",
    screenshots: issue.Screenshot && issue.Screenshot.length > 0 ? issue.Screenshot : [],
    suggestion: issue.Suggestion,
    conditions: issue.Conditions,
    url: issue.Link
  }));

  const getSortedBugs = () => {
    const sortedBugs = [...bugs];

    switch (sortBy) {
      case "Sort by Severity":
        return sortedBugs.sort((a, b) => {
          const severityOrder = { High: 3, Medium: 2, Low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        });
      case "Sort by Date":
        return sortedBugs.sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));
      case "Sort by Page":
        return sortedBugs.sort((a, b) => a.url.localeCompare(b.url));
      case "Sort by Status":
        return sortedBugs.sort((a, b) => a.status?.localeCompare(b.status || ""));
      case "Sort by Category":
        return sortedBugs.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
      default:
        return sortedBugs;
    }
  };

  const sortedBugs = getSortedBugs();

  // Determine which bugs should be restricted (none in this implementation)
  const restrictedStatus = sortedBugs.map(() => false);

  // Add a function to handle bug selection
  const handleBugSelect = (bug, index) => {
    if (restrictedStatus[index]) {
      setShowContactForm(true);
    } else {
      setSelectedBug(bug);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{domainName}</h1>
        <a
          href={domainLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {domainLink}
        </a>
        <p className="mt-2 text-gray-600">{bugs.length} issue{bugs.length !== 1 ? 's' : ''} found</p>
      </header>

      <div className="py-4">
        {/* Information banner about restrictions - only show when content is restricted */}
        {contentIsRestricted && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4 flex items-start">
            <div className="text-blue-500 mr-3 flex-shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Access Restriction</h3>
              <p className="text-sm text-blue-700 mt-1">
                Unlock full access to all critical bugs we've discovered! Contact us now to learn how these insights can protect your application and improve user experience.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">AI-Detected Bugs</h2>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option>Sort by Severity</option>
              <option>Sort by Date</option>
              <option>Sort by Page</option>
              <option>Sort by Status</option>
              <option>Sort by Category</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedBugs.map((bug, index) => {
            const isRestricted = restrictedStatus[index];
            return (
              <div
                key={bug.id}
                className={`border border-gray-200 rounded-lg p-4 bg-white cursor-pointer hover:border-gray-300 ${isRestricted ? "relative" : ""}`}
                onClick={() => handleBugSelect(bug, index)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-red-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      {!isRestricted ? (
                        <>
                          <h3 className="font-medium text-gray-900">{bug.title}</h3>
                        </>
                      ) : (
                        <>
                          <h3 className="font-medium text-gray-400 blur-sm select-none">Bug #{index + 1}</h3>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${bug.severity === "High" ? "bg-red-100 text-red-800" : ""}
                    ${bug.severity === "Medium" ? "bg-yellow-100 text-yellow-800" : ""}
                    ${bug.severity === "Low" ? "bg-green-100 text-green-800" : ""}
                  `}
                  >
                    {bug.severity === "High" && (
                      <svg className="mr-1 h-2 w-2 text-red-500" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                    )}
                    {bug.severity}
                  </span>
                </div>

                {!isRestricted ? (
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p className="text-sm text-gray-600 mb-3" {...props} />
                    }}
                  >
                    {bug.description}
                  </ReactMarkdown>
                ) : (
                  <div className="relative">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className="text-sm text-gray-400 mb-3 blur-sm select-none" {...props} />
                      }}
                    >
                      {bug.description.length > 100
                        ? bug.description.substring(0, 100) + "..."
                        : bug.description}
                    </ReactMarkdown>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Restricted Content
                      </span>
                    </div>
                  </div>
                )}

                {!isRestricted ? (
                  <div className="text-xs text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="inline h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Detected on {bug.detectedAt}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 blur-sm select-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="inline h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Detected on XX/XX/XXXX
                  </div>
                )}

                {isRestricted && (
                  <div className="absolute bottom-2 right-2">
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="inline h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Restricted
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedBug && <BugDetailsModal bug={selectedBug} onClose={() => setSelectedBug(null)} isRestricted={contentIsRestricted} />}
        {showContactForm && <ContactFormModal onClose={() => setShowContactForm(false)} />}
      </div>
    </div>
  );
};

export default DomainDetails;
