import React, { useEffect, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { ChevronRight, Sparkles, Layers, FileText, CheckSquare, Beaker, AlertTriangle } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import axios from 'axios';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Icon mapping for different item types
const getIconForType = (type) => {
  switch (type) {
    case 'product':
      return <Sparkles size={16} className="text-purple-500" />;
    case 'epic':
      return <Layers size={16} className="text-indigo-500" />;
    case 'feature':
      return <FileText size={16} className="text-blue-500" />;
    case 'story':
      return <FileText size={16} className="text-green-500" />;
    case 'criteria':
      return <CheckSquare size={16} className="text-orange-500" />;
    case 'test':
      return <Beaker size={16} className="text-red-500" />;
    case 'error':
      return <AlertTriangle size={16} className="text-red-500" />;
    default:
      return null;
  }
};

const NavigationTree = () => {
  const location = useLocation();
  const params = useParams();
  const { selectedProduct } = useProduct();
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBreadcrumbData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Initialize breadcrumbs array and tracking variables
        const newBreadcrumbs = [];
        let epicId = null;
        let featureId = null;
        let storyId = null;
        let criteriaId = null;
        let testData = null;
        let criteriaData = null;

        // Start with the product as the first breadcrumb item
        if (selectedProduct) {
          newBreadcrumbs.push({
            name: selectedProduct.name,
            path: '/',
            type: 'product'
          });
        }

        // Case 1: We're at the test level
        if (params.testId) {
          try {
            const testResponse = await axios.get(`${API_URL}/tests/${params.testId}`, {
              withCredentials: true
            });
            testData = testResponse.data;
            console.log('Test data received:', testData); // Debug the test data
            criteriaId = testData.acceptance_criteria_id;
          } catch (err) {
            console.error('Error fetching test data:', err);
            newBreadcrumbs.push({
              name: `Test (ID: ${params.testId})`,
              path: `/tests/${params.testId}`,
              type: 'error'
            });
          }
        }

        // Case 2: We're at the acceptance criteria level or we have criteriaId from test
        if (params.criteriaId || criteriaId) {
          const currentCriteriaId = params.criteriaId || criteriaId;
          try {
            const criteriaResponse = await axios.get(`${API_URL}/acceptance-criteria/${currentCriteriaId}`, {
              withCredentials: true
            });
            criteriaData = criteriaResponse.data;
            console.log('Criteria data received:', criteriaData); // Debug the criteria data
            storyId = criteriaData.user_story_id;
          } catch (err) {
            console.error('Error fetching acceptance criteria data:', err);
            newBreadcrumbs.push({
              name: `Acceptance Criteria (ID: ${currentCriteriaId})`,
              path: `/acceptance-criteria/${currentCriteriaId}`,
              type: 'error'
            });
          }
        }

        // Case 3: We're at the user story level or we have storyId from criteria
        if (params.storyId || storyId) {
          const currentStoryId = params.storyId || storyId;
          try {
            const storyResponse = await axios.get(`${API_URL}/user-stories/${currentStoryId}`, {
              withCredentials: true
            });
            featureId = storyResponse.data.feature_id;

            // Add to breadcrumbs
            newBreadcrumbs.push({
              name: storyResponse.data.name,
              path: `/user-stories/${currentStoryId}`,
              type: 'story'
            });
          } catch (err) {
            console.error('Error fetching user story data:', err);
            newBreadcrumbs.push({
              name: `User Story (ID: ${currentStoryId})`,
              path: `/user-stories/${currentStoryId}`,
              type: 'error'
            });
          }
        }

        // Case 4: We're at the feature level or we have featureId from story
        if (params.featureId || featureId) {
          const currentFeatureId = params.featureId || featureId;
          try {
            const featureResponse = await axios.get(`${API_URL}/features/${currentFeatureId}`, {
              withCredentials: true
            });
            epicId = featureResponse.data.epic_id;

            // Add to breadcrumbs
            newBreadcrumbs.push({
              name: featureResponse.data.name,
              path: `/features/${currentFeatureId}`,
              type: 'feature'
            });
          } catch (err) {
            console.error('Error fetching feature data:', err);
            newBreadcrumbs.push({
              name: `Feature (ID: ${currentFeatureId})`,
              path: `/features/${currentFeatureId}`,
              type: 'error'
            });
          }
        }

        // Case 5: We're at the epic level or we have epicId from feature
        if (params.epicId || epicId) {
          const currentEpicId = params.epicId || epicId;
          try {
            const epicResponse = await axios.get(`${API_URL}/epics/${currentEpicId}`, {
              withCredentials: true
            });

            // Add to breadcrumbs
            newBreadcrumbs.push({
              name: epicResponse.data.name,
              path: `/epics/${currentEpicId}`,
              type: 'epic'
            });
          } catch (err) {
            console.error('Error fetching epic data:', err);
            newBreadcrumbs.push({
              name: `Epic (ID: ${currentEpicId})`,
              path: `/epics/${currentEpicId}`,
              type: 'error'
            });
          }
        }

        // Now add the acceptance criteria if we have it
        if (criteriaData) {
          // Add fallbacks for acceptance criteria name
          const criteriaName = criteriaData.name || criteriaData.title || criteriaData.description || `Acceptance Criteria (ID: ${criteriaData.id})`;
          newBreadcrumbs.push({
            name: criteriaName,
            path: `/acceptance-criteria/${criteriaData.id}`,
            type: 'criteria'
          });
        } else if (params.criteriaId && !criteriaData) {
          // If we're at criteria level but failed to fetch data earlier
          if (!newBreadcrumbs.some(crumb => crumb.path.includes(`/acceptance-criteria/${params.criteriaId}`))) {
            newBreadcrumbs.push({
              name: `Acceptance Criteria (ID: ${params.criteriaId})`,
              path: `/acceptance-criteria/${params.criteriaId}`,
              type: 'error'
            });
          }
        }

        // Finally add the test if we have it
        if (testData) {
          // Use a fallback in case name property is missing or undefined
          const testName = testData.name || testData.title || testData.description || `Test (ID: ${testData.id})`;
          console.log('Adding test breadcrumb with name:', testName); // Debug the test name
          newBreadcrumbs.push({
            name: testName,
            path: `/tests/${testData.id}`,
            type: 'test'
          });
        } else if (params.testId && !testData) {
          // If we're at test level but failed to fetch data earlier
          if (!newBreadcrumbs.some(crumb => crumb.path.includes(`/tests/${params.testId}`))) {
            newBreadcrumbs.push({
              name: `Test (ID: ${params.testId})`,
              path: `/tests/${params.testId}`,
              type: 'error'
            });
          }
        }

        // Sort breadcrumbs in the correct hierarchical order
        const orderedBreadcrumbs = [];

        // First add product
        const productCrumb = newBreadcrumbs.find(crumb => crumb.type === 'product');
        if (productCrumb) orderedBreadcrumbs.push(productCrumb);

        // Then add epic
        const epicCrumb = newBreadcrumbs.find(crumb => crumb.type === 'epic' || (crumb.type === 'error' && crumb.path.includes('/epics/')));
        if (epicCrumb) orderedBreadcrumbs.push(epicCrumb);

        // Then add feature
        const featureCrumb = newBreadcrumbs.find(crumb => crumb.type === 'feature' || (crumb.type === 'error' && crumb.path.includes('/features/')));
        if (featureCrumb) orderedBreadcrumbs.push(featureCrumb);

        // Then add user story
        const storyCrumb = newBreadcrumbs.find(crumb => crumb.type === 'story' || (crumb.type === 'error' && crumb.path.includes('/user-stories/')));
        if (storyCrumb) orderedBreadcrumbs.push(storyCrumb);

        // Then add acceptance criteria
        const criteriaCrumb = newBreadcrumbs.find(crumb => crumb.type === 'criteria' || (crumb.type === 'error' && crumb.path.includes('/acceptance-criteria/')));
        if (criteriaCrumb) {
          console.log('Adding criteria to ordered breadcrumbs:', criteriaCrumb); // Debug the criteria breadcrumb being added
          orderedBreadcrumbs.push(criteriaCrumb);
        }

        // Finally add test
        const testCrumb = newBreadcrumbs.find(crumb => crumb.type === 'test' || (crumb.type === 'error' && crumb.path.includes('/tests/')));
        if (testCrumb) {
          console.log('Adding test to ordered breadcrumbs:', testCrumb); // Debug the test breadcrumb being added
          orderedBreadcrumbs.push(testCrumb);
        }

        console.log('Final breadcrumbs:', orderedBreadcrumbs); // Debug final breadcrumbs
        setBreadcrumbs(orderedBreadcrumbs);
      } catch (error) {
        console.error('Error fetching breadcrumb data:', error);
        setError('Failed to load navigation data');
      } finally {
        setLoading(false);
      }
    };

    fetchBreadcrumbData();
  }, [location.pathname, selectedProduct, params]);

  if (loading || breadcrumbs.length <= 1) {
    return null; // Don't show when loading or only product is present
  }

  return (
    <nav aria-label="breadcrumb" className="py-3 px-6 bg-white border-b border-gray-200 shadow-sm">
      {error ? (
        <div className="text-sm text-red-500 flex items-center">
          <AlertTriangle size={16} className="mr-2" />
          {error}
        </div>
      ) : (
        <ol className="flex flex-wrap items-center text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <ChevronRight size={16} className="mx-2 text-gray-400 flex-shrink-0" />
              )}
              <li className={`flex items-center ${index === breadcrumbs.length - 1 ? 'font-semibold text-blue-700' : 'text-gray-600'} ${crumb.type === 'error' ? 'text-red-500' : ''}`}>
                <span className="mr-1.5 flex-shrink-0">
                  {getIconForType(crumb.type)}
                </span>
                {index === breadcrumbs.length - 1 ? (
                  <span className="truncate max-w-xs">{crumb.name}</span>
                ) : (
                  <Link
                    to={crumb.path}
                    className={`hover:text-blue-600 transition-colors truncate max-w-xs ${crumb.type === 'error' ? 'text-red-500 hover:text-red-600' : ''}`}
                    title={crumb.name}
                  >
                    {crumb.name}
                  </Link>
                )}
              </li>
            </React.Fragment>
          ))}
        </ol>
      )}
    </nav>
  );
};

export default NavigationTree;
