import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, Sparkles, Layers, FileText, CheckSquare, Beaker, AlertTriangle, Building, Users, Home, BarChart2, Key } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
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
    case 'organization':
      return <Building size={16} className="text-gray-700" />;
    case 'members':
      return <Users size={16} className="text-blue-600" />;
    case 'home':
      return <Home size={16} className="text-gray-600" />;
    case 'dashboard':
      return <BarChart2 size={16} className="text-blue-500" />;
    case 'secrets':
      return <Key size={16} className="text-amber-500" />;
    default:
      return null;
  }
};

const NavigationTree = () => {
  const location = useLocation();
  const params = useParams();
  const { selectedProduct } = useProduct();
  const { selectedOrganization } = useOrganization();
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize the fetchBreadcrumbData function to prevent unnecessary recreations
  const fetchBreadcrumbData = useCallback(async () => {
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
        const criteriaName = criteriaData.name || criteriaData.name || criteriaData.description || `Acceptance Criteria (ID: ${criteriaData.id})`;
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
        const testName = testData.name || testData.name || testData.description || `Test (ID: ${testData.id})`;
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
    } catch (err) {
      console.error('Error building navigation breadcrumbs:', err);
      setError('Failed to load navigation. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [params, selectedProduct?.id]);

  useEffect(() => {
    // Check if we're on an organization-related page
    if (location.pathname.includes('/organizations/')) {
      setLoading(false);

      // Create organization breadcrumbs
      const orgBreadcrumbs = [
        {
          name: 'Home',
          path: '/',
          type: 'home'
        },
        {
          name: 'Organizations',
          path: '/organizations/dashboard',
          type: 'organization'
        }
      ];

      // Add specific organization page
      if (location.pathname.includes('/dashboard')) {
        orgBreadcrumbs.push({
          name: 'Dashboard',
          path: '/organizations/dashboard',
          type: 'organization'
        });
      } else if (location.pathname.includes('/members')) {
        orgBreadcrumbs.push({
          name: selectedOrganization ? `${selectedOrganization.name} Members` : 'Members',
          path: '/organizations/members',
          type: 'members'
        });
      } else if (location.pathname.includes('/create')) {
        orgBreadcrumbs.push({
          name: 'Create Organization',
          path: '/organizations/create',
          type: 'organization'
        });
      }

      setBreadcrumbs(orgBreadcrumbs);
      return;
    } else if (location.pathname.includes('/join-organization/')) {
      setLoading(false);
      setBreadcrumbs([
        {
          name: 'Home',
          path: '/',
          type: 'home'
        },
        {
          name: 'Join Organization',
          path: location.pathname,
          type: 'organization'
        }
      ]);
      return;
    }

    // Only call fetchBreadcrumbData if we're not on an organization page
    fetchBreadcrumbData();

  }, [location.pathname, fetchBreadcrumbData, selectedOrganization?.name]);

  if (loading) {
    return null;
  }

  return (
    <nav className="w-full p-2">

      {/* Dashboard Link */}
      {selectedOrganization && (
        <div className="pt-2">
          <Link
            to="/dashboard"
            className={`flex items-center text-sm px-3 py-2 rounded-md ${
              location.pathname.startsWith('/dashboard')
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {getIconForType('dashboard')}
            <span className="ml-2">Dashboard</span>
          </Link>
        </div>
      )}

      {/* Secrets Management Link */}
      {selectedOrganization && (
        <div className="pt-2">
          <Link
            to="/secrets"
            className={`flex items-center text-sm px-3 py-2 rounded-md ${
              location.pathname.startsWith('/secrets')
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {getIconForType('secrets')}
            <span className="ml-2">Secrets</span>
          </Link>
        </div>
      )}

      {/* Vertical Navigation Tree */}
      {breadcrumbs.length > 0 && (
        <ul className="space-y-1">
          {breadcrumbs.map((crumb, index) => (
            <li
              key={index}
              className={`
                ${index === breadcrumbs.length - 1 ? 'font-semibold' : ''}
                ${crumb.type === 'error' ? 'text-red-500' : ''}
                ${location.pathname === crumb.path ? 'bg-blue-50 text-blue-600' : ''}
                rounded-md
              `}
            >
              <Link
                to={crumb.path}
                className={`
                  flex items-center py-2 px-3 text-sm hover:bg-gray-100 rounded-md
                  ${index === breadcrumbs.length - 1 ? 'text-blue-700' : 'text-gray-600'}
                  ${crumb.type === 'error' ? 'text-red-500 hover:text-red-600' : ''}
                  ${location.pathname === crumb.path ? 'bg-blue-50 text-blue-600' : ''}
                `}
                name={crumb.name}
              >
                <span className="mr-2 flex-shrink-0">
                  {getIconForType(crumb.type)}
                </span>
                <span className="truncate">{crumb.name}</span>
                {index < breadcrumbs.length - 1 && (
                  <ChevronDown size={16} className="ml-auto text-gray-400 flex-shrink-0" />
                )}
              </Link>

              {/* Display child items with indentation */}
              {index < breadcrumbs.length - 1 && (
                <ul className="pl-6 mt-1 space-y-1">
                  {breadcrumbs.slice(index + 1, index + 2).map((childCrumb, childIndex) => (
                    <li key={`${index}-${childIndex}`} className="ml-2 border-l-2 border-gray-200 pl-2">
                      {/* We don't need to render anything here, as all items are already in the main list */}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
};

export default NavigationTree;
