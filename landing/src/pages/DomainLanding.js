import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseCSV, extractRouteFromUrl } from '../utils/csvParser';
import Header from '../components/Header';

/**
 * Landing page displaying all domains from the CSV data
 */
const DomainLanding = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        const csvData = await parseCSV();

        if (!Array.isArray(csvData)) {
          setError('Invalid CSV data format');
          return;
        }

        // Group issues by domain
        const domainGroups = {};

        csvData.forEach(row => {
          if (!row || !row.Link) return;

          const route = extractRouteFromUrl(row.Link);
          if (!route || route === 'unknown') return;

          if (!domainGroups[route]) {
            // Initialize new domain group
            domainGroups[route] = {
              route: route,
              name: row.Link.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0],
              link: row.Link,
              issues: [],
              highSeverityCount: 0,
              mediumSeverityCount: 0,
              lowSeverityCount: 0
            };
          }

          // Add issue to domain group
          domainGroups[route].issues.push(row);

          // Count severities
          if (row.Severity === 'High') {
            domainGroups[route].highSeverityCount++;
          } else if (row.Severity === 'Medium') {
            domainGroups[route].mediumSeverityCount++;
          } else if (row.Severity === 'Low') {
            domainGroups[route].lowSeverityCount++;
          }
        });

        // Convert groups to array
        const processedDomains = Object.values(domainGroups);

        if (processedDomains.length === 0) {
          setError('No valid domains found in the CSV data');
          return;
        }

        setDomains(processedDomains);
      } catch (err) {
        console.error('Error loading domains:', err);
        setError('Failed to process CSV data. Please check the file format.');
      } finally {
        setLoading(false);
      }
    };

    fetchDomains();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{error}</h2>
        <p className="text-gray-600 max-w-lg text-center mb-4">
          Make sure the data.csv file exists in the public directory and has the correct column format.
        </p>
        <Link to="/" className="text-blue-600 hover:text-blue-800 underline">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Available Domains ({domains.length})</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {domains.map((domain, index) => (
            <Link
              key={index}
              to={`/${domain.route}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2 truncate">{domain.name}</h2>
                <p className="text-sm text-gray-600 mb-3 truncate">{domain.link}</p>

                <div className="mb-4">
                  <div className="text-sm text-gray-700 mb-1">
                    {domain.issues.length} issue{domain.issues.length !== 1 ? 's' : ''} found
                  </div>
                  <div className="flex gap-2">
                    {domain.highSeverityCount > 0 && (
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {domain.highSeverityCount} High
                      </span>
                    )}
                    {domain.mediumSeverityCount > 0 && (
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        {domain.mediumSeverityCount} Medium
                      </span>
                    )}
                    {domain.lowSeverityCount > 0 && (
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {domain.lowSeverityCount} Low
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <span className="text-blue-600 text-sm font-medium">View Details</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DomainLanding;
