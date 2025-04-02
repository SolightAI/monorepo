import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { parseCSV, extractRouteFromUrl } from '../utils/csvParser';
import AiDetectedBugs from '../components/AiDetectedBugs';

/**
 * Page component for displaying domain details from CSV data
 */
const DomainPage = () => {
  const { domainRoute } = useParams();
  const [domainData, setDomainData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [domainInfo, setDomainInfo] = useState({ name: '', link: '' });

  useEffect(() => {
    const fetchAndProcessData = async () => {
      try {
        setLoading(true);
        const csvData = await parseCSV();

        if (!Array.isArray(csvData) || csvData.length === 0) {
          setError('No domain data found');
          return;
        }

        // Find ALL matching domain rows based on Domain column, not Link
        const matchingDomains = csvData.filter(row => {
          if (!row || !row.Domain) return false;
          const route = extractRouteFromUrl(row.Domain);
          return route === domainRoute;
        });

        if (matchingDomains && matchingDomains.length > 0) {
          setDomainData(matchingDomains);

          // Extract domain name and link from the first row's Domain field
          const firstRow = matchingDomains[0];
          setDomainInfo({
            name: firstRow.Domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0],
            link: firstRow.Domain
          });
        } else {
          setError(`Domain "${domainRoute}" not found`);
        }
      } catch (err) {
        console.error('Error loading domain data:', err);
        setError('Failed to process CSV data. Please check file format.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcessData();
  }, [domainRoute]);

  // Transform domain data into the format expected by AiDetectedBugs
  const transformedBugs = domainData.map((issue, index) => ({
    id: index + 1,
    title: issue.Name,
    description: issue.Description,
    severity: issue.Severity === 'High' ? 'Critical' : issue.Severity,
    detectedAt: new Date().toLocaleDateString(),
    category: "UX Issue",
    page: issue.Link,
    screenshots: issue.Screenshot ? [issue.Screenshot] : [],
    suggestion: issue.Suggestion,
    conditions: issue.Conditions,
    url: issue.Link
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{error}</h2>
        <Link to="/domains" className="text-blue-600 hover:text-blue-800 underline mb-2">
          View All Domains
        </Link>
        <Link to="/" className="text-blue-600 hover:text-blue-800 underline">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{domainInfo.name}</h1>
          {/* <a
            href={domainInfo.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {domainInfo.link}
          </a> */}
          <p className="mt-2 text-gray-600">{transformedBugs.length} issue{transformedBugs.length !== 1 ? 's' : ''} found</p>
        </header>

        <AiDetectedBugs bugs={transformedBugs} />
      </div>
    </div>
  );
};

export default DomainPage;
