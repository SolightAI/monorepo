import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Link as LinkIcon, Info, AlertTriangle, Target, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ReactMarkdown from 'react-markdown'
import BugDetailsModal from "@/components/modals/BugDetailsModal"
import ContactFormModal from "@/components/modals/ContactFormModal"

function AiDetectedBugs({ bugs = [] }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [selectedBug, setSelectedBug] = useState(null)
  const [showContactForm, setShowContactForm] = useState(false)
  const [sortBy, setSortBy] = useState("Sort by Severity")
  const [expandedBugId, setExpandedBugId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);

  // Get authentication status when component renders
  const userIsAuthenticated = useMemo(() => isAuthenticated, [isAuthenticated]);
  // Content is restricted for non-authenticated users
  const contentIsRestricted = !userIsAuthenticated;

  // Group bugs by category
  const bugsByCategory = useMemo(() => {
    const grouped = {};
    bugs.forEach(bug => {
      if (!bug.category) {
        bug.category = 'Uncategorized';
      }
      if (!grouped[bug.category]) {
        grouped[bug.category] = [];
      }
      grouped[bug.category].push(bug);
    });
    return grouped;
  }, [bugs]);

  // Toggle expanded state for a bug
  const toggleExpandBug = (bugId) => {
    setExpandedBugId(expandedBugId === bugId ? null : bugId);
  };

  // Toggle expanded state for a category
  const toggleExpandCategory = (category) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Initially expand all categories if there are few bugs
  React.useEffect(() => {
    if (bugs.length > 0 && bugs.length <= 5) {
      setExpandedCategories(Object.keys(bugsByCategory));
    }
  }, [bugs.length, bugsByCategory]);

  const getSortedBugs = () => {
    const sortedBugs = [...bugs]

    switch (sortBy) {
      case "Sort by Severity":
        return sortedBugs.sort((a, b) => {
          const severityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 }
          return severityOrder[b.severity] - severityOrder[a.severity]
        })
      case "Sort by Date":
        return sortedBugs.sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt))
      case "Sort by Page":
        return sortedBugs.sort((a, b) => a.page.localeCompare(b.page))
      case "Sort by Status":
        return sortedBugs.sort((a, b) => a.status?.localeCompare(b.status || ""))
      case "Sort by Category":
        return sortedBugs.sort((a, b) => a.category.localeCompare(b.category))
      default:
        return sortedBugs
    }
  }

  const sortedBugs = getSortedBugs();

  // Determine which bugs should be restricted
  const getRestrictedStatus = () => {
    if (!contentIsRestricted) {
      return sortedBugs.map(() => false);
    }

    let visibleCount = 0;
    let criticalCount = 0;

    return sortedBugs.map(bug => {
      const isCritical = bug.severity === "Critical";

      // First critical bug is visible
      if (isCritical && criticalCount === 0) {
        criticalCount++;
        visibleCount++;
        return false; // Not restricted
      }

      // All other critical bugs are restricted
      if (isCritical) {
        criticalCount++;
        return true; // Restricted
      }

      // Show non-critical bugs until we have 3 total visible
      if (visibleCount < 3) {
        visibleCount++;
        return false; // Not restricted
      }

      // All remaining bugs are restricted
      return true; // Restricted
    });
  };

  const restrictedStatus = getRestrictedStatus();

  // Add a function to handle bug selection with restrictions
  const handleBugSelect = (bug, index) => {
    if (restrictedStatus[index]) {
      setShowContactForm(true);
    } else {
      setSelectedBug(bug);
    }
  };

  // Render different UI based on authentication status
  if (!userIsAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">AI-Detected Issues</h2>
        <div className="space-y-4">
          {bugs.length === 0 ? (
            <p className="text-gray-500 italic">No issues detected yet.</p>
          ) : (
            Object.entries(bugsByCategory).map(([category, categoryBugs]) => (
              <div key={category} className="border rounded-lg overflow-hidden">
                <div
                  className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpandCategory(category)}
                >
                  <div className="font-medium flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    {category}
                    <span className="ml-2 text-sm text-gray-500">({categoryBugs.length})</span>
                  </div>
                  {expandedCategories.includes(category) ?
                    <ChevronUp className="h-4 w-4" /> :
                    <ChevronDown className="h-4 w-4" />
                  }
                </div>

                {expandedCategories.includes(category) && (
                  <div className="divide-y">
                    {categoryBugs.map((bug) => (
                      <div key={bug.id} className="p-4">
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-medium">{bug.title}</h3>
                            <p className="text-gray-600 mt-1 text-sm">{bug.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-center text-blue-800">
            Sign in to see full issue details and solutions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">AI-Detected Issues</h2>

      {bugs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No issues detected</h3>
          <p className="mt-2 text-gray-600">The AI has not detected any issues with your product yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(bugsByCategory).map(([category, categoryBugs]) => (
            <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
              <div
                className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
                onClick={() => toggleExpandCategory(category)}
              >
                <div className="font-medium flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  {category}
                  <span className="ml-2 text-sm text-gray-500">({categoryBugs.length})</span>
                </div>
                {expandedCategories.includes(category) ?
                  <ChevronUp className="h-4 w-4" /> :
                  <ChevronDown className="h-4 w-4" />
                }
              </div>

              {expandedCategories.includes(category) && (
                <div className="divide-y">
                  {categoryBugs.map((bug) => (
                    <div key={bug.id} className="p-4">
                      <div
                        className="flex items-start cursor-pointer"
                        onClick={() => toggleExpandBug(bug.id)}
                      >
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h3 className="font-medium">{bug.title}</h3>
                            {expandedBugId === bug.id ?
                              <ChevronUp className="h-4 w-4" /> :
                              <ChevronDown className="h-4 w-4" />
                            }
                          </div>
                          <p className="text-gray-600 mt-1 text-sm">{bug.description}</p>
                        </div>
                      </div>

                      {expandedBugId === bug.id && (
                        <div className="mt-4 pl-8">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-sm flex items-center mb-2">
                              <Info className="h-4 w-4 mr-1" />
                              Details
                            </h4>
                            <p className="text-sm text-gray-700 mb-4">{bug.details || "No additional details available."}</p>

                            <h4 className="font-medium text-sm flex items-center mb-2">
                              <Target className="h-4 w-4 mr-1" />
                              Suggested Fix
                            </h4>
                            <p className="text-sm text-gray-700 mb-4">{bug.solution || "No suggested fix available yet."}</p>

                            {bug.code_snippet && (
                              <div className="mb-4">
                                <h4 className="font-medium text-sm flex items-center mb-2">
                                  <FileText className="h-4 w-4 mr-1" />
                                  Code Snippet
                                </h4>
                                <pre className="bg-gray-800 text-gray-100 p-3 rounded text-sm overflow-x-auto">
                                  <code>{bug.code_snippet}</code>
                                </pre>
                              </div>
                            )}

                            {bug.links && bug.links.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm flex items-center mb-2">
                                  <LinkIcon className="h-4 w-4 mr-1" />
                                  Related Resources
                                </h4>
                                <ul className="space-y-1">
                                  {bug.links.map((link, index) => (
                                    <li key={index} className="text-sm">
                                      <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                      >
                                        {link.title || link.url}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedBug && <BugDetailsModal bug={selectedBug} onClose={() => setSelectedBug(null)} isRestricted={contentIsRestricted} />}
      {showContactForm && <ContactFormModal onClose={() => setShowContactForm(false)} />}
    </div>
  );
}

export default AiDetectedBugs;
