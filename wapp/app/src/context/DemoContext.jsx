import { createContext, useContext, useState, useRef, useCallback } from 'react';

// --- Enums (You’ll need to define these appropriately) ---
// export enum OrganizationType { /* ... */ }
// export enum OrganizationRole { /* ... */ }
// export enum TestCategory { /* ... */ }
// export enum TestStatus { /* ... */ }
// export enum ExecutorType { /* ... */ }

// // --- Interfaces ---

// export interface Organization {
//   id: string;
//   name: string;
//   logo_url?: string | null;
//   created_at: string;
//   updated_at: string;
//   type: OrganizationType;
//   settings: Record<string, any>;

//   // Relations
//   members?: OrganizationMember[];
//   products?: Product[];
//   invitations?: Invitation[];
// }

// export interface OrganizationMember {
//   id: string;
//   joined_at: string;
//   role: OrganizationRole;

//   user: User;
//   organization: Organization;
//   invited_by?: User | null;
// }

// export interface Product {
//   id: string;
//   url: string;
//   name: string;
//   description: string;
//   documentation: string;
//   links_to_documentation: string[];

//   organization?: Organization | null;
//   epics?: Epic[];
// }

// export interface Epic {
//   id: string;
//   name: string;
//   description: string;

//   product: Product;
//   features?: Feature[];
// }

// export interface Feature {
//   id: string;
//   urls: string[];
//   name: string;
//   description: string;
//   access_conditions: Record<string, any>;

//   epic: Epic;
//   user_stories?: UserStory[];
//   acceptance_criteria?: AcceptanceCriteria[];
//   tests?: Test[];
// }

// export interface Test {
//   id: string;
//   name: string;
//   description: string;
//   preconditions: string;
//   steps: string;
//   assertions: string;

//   category: TestCategory;

//   feature: Feature;
//   test_secrets?: TestSecret[];
//   executions?: TestExecution[];
// }

// export interface TestExecution {
//   id: string;
//   status: TestStatus;
//   environment: string;
//   executor_type: ExecutorType;
//   executor_name?: string | null;
//   started_at: string;
//   ended_at?: string | null;
//   duration_ms?: number | null;
//   notes?: string | null;
//   evidence: string[];
//   metadata: Record<string, any>;
//   tracing: Record<string, any>;

//   test: Test;
// }

// // --- Placeholders for related models ---
// export interface User {
//   id: string;
//   name: string;
//   email: string;
//   // Add other fields as needed
// }

// export interface Invitation {
//   id: string;
//   // Define as appropriate
// }

// export interface UserStory {
//   id: string;
//   // Define as appropriate
// }

// export interface AcceptanceCriteria {
//   id: string;
//   // Define as appropriate
// }

// export interface TestSecret {
//   id: string;
//   // Define as appropriate
// }

/**
 * DemoContext is a React context that provides a way to manage and share demo-related state
 */

// type DemoContextType = {
//   url: string;
//   tests: any[]; // Test[]
//   error: string | null;
//   isGeneratingTests: boolean;
//   latestExecutionsMap: Record<string, any>; // Map of test IDs to their latest execution data TestExecution[]
//   generationPollingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
//   testPollingIntervalsRef: React.MutableRefObject<Record<string, NodeJS.Timeout | null>>;
//   setUrl: React.Dispatch<React.SetStateAction<string>>;
//   setTests: React.Dispatch<React.SetStateAction<any[]>>;
//   setError: React.Dispatch<React.SetStateAction<string | null>>;
//   setIsGeneratingTests: React.Dispatch<React.SetStateAction<boolean>>;
//   setLatestExecutionsMap: React.Dispatch<React.SetStateAction<Record<string, any>>>;
//   dismissError: () => void;
//   reset: () => void;
// }

const defaultValue = {
  tests: [],
  latestExecutionsMap: {},

  isGeneratingTests: false,
  generationPollingIntervalRef: { current: null },
  testPollingIntervalsRef: { current: {} },
}

const DemoContext = createContext(defaultValue);

export const useDemo = () => useContext(DemoContext);

export function DemoProvider({ children }) {
  const [url, setUrl] = useState('');
  const [feature, setFeature] = useState(null);
  const [epic, setEpic] = useState(null);
  const [product, setProduct] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [tests, setTests] = useState([]);
  const testPollingIntervalsRef = useRef({}); // Track polling intervals for individual tests
  const [latestExecutionsMap, setLatestExecutionsMap] = useState({}); // New state for latest execution data
  
  // const pollingIntervalRef = useRef(null);
  // const [runningTests, setRunningTests] = useState({}); // Track tests that are currently running
  // const testPollingIntervalsRef = useRef({}); // Track polling intervals for individual tests
  

  const updateUrl = (newUrl) => { 
    setUrl(newUrl);
  };

  const updateTests = (newTests) => {
    setTests(newTests);
  };
  
  const updateFeature = (newFeature) => {
    setFeature(newFeature);
  };

  const updateEpic = (newEpic) => {
    setEpic(newEpic);
  };

  const updateProduct = (newProduct) => {
    setProduct(newProduct);
  }

  const updateOrganization = (newOrganization) => {
    setOrganization(newOrganization);
  }

  const reset = useCallback(() => {
    setUrl('');
    setTests([]);
    setFeature(null);
    setEpic(null);
    setProduct(null);
    setOrganization(null);
    setLatestExecutionsMap({});
    
    // Clear test polling intervals
    Object.values(testPollingIntervalsRef.current).forEach(interval => {
      if (interval) {
        clearInterval(interval);
      }
    });
    testPollingIntervalsRef.current = {}; // Reset the intervals object

  }, [testPollingIntervalsRef]);

  return (
    <DemoContext.Provider value={{
      url,
      tests,
      feature,
      epic,
      product,
      organization,
      latestExecutionsMap,
      testPollingIntervalsRef,
      updateUrl,
      updateTests,
      updateFeature,
      updateEpic,
      updateProduct,
      updateOrganization,
      setLatestExecutionsMap,
      reset,
    }}>
      {children}
    </DemoContext.Provider>
  );
}
// // Update the startTestGenerationPolling function
// const startTestGenerationPolling = async (featureId) => {
//   if (!featureId) return;

//   const featureObj = features.find(f => f.id === featureId);
//   const featureName = featureObj ? featureObj.name : featureId;

//   try {
//     // Clear any existing polling interval
//     if (pollingIntervalRef.current) {
//       clearInterval(pollingIntervalRef.current);
//     }

//     // Set initial states
//     setError(null);

//     // Use the pollTestGenerationStatus function from the service
//     pollingIntervalRef.current = pollTestGenerationStatus(
//       featureId,
//       (statusMessage) => {
//         setSuccessMessage(statusMessage);
//       },
//       async (successMsg) => {
//         setIsGeneratingTests(false);
//         setGeneratingFeatures([]);
//         pollingIntervalRef.current = null;
//         setSuccessMessage(`Test generation completed successfully. ${successMsg}`);
//       },
//       (errorMsg) => {
//         setIsGeneratingTests(false);
//         setGeneratingFeatures([]);
//         pollingIntervalRef.current = null;
//         setError(`Test generation failed. ${errorMsg}`);
//         setSuccessMessage(null);
//       },
//       featureName
//     );
//   } catch (error) {
//     console.error('Error starting test generation polling:', error);
//     setIsGeneratingTests(false);
//     setGeneratingFeatures([]);
//     setError('Error starting test generation. Please try again.');
//   }
// };

// // Update the useEffect to use checkExistingTaskId
// useEffect(() => {
//   let isMounted = true;
//   let checkTimeout = null;

//   const initialize = async () => {
//     if (!isMounted) return;

//     // First, check if we have any generating features in state
//     if (generatingFeatures.length > 0) {
//       // Start polling for each feature immediately
//       generatingFeatures.forEach(feature => {
//         startTestGenerationPolling(feature.id);
//       });
//     }

//     // Then check for existing task ID in the background
//     await checkExistingTaskId();
//   };

//   // Use a smaller timeout to ensure the component is fully mounted
//   checkTimeout = setTimeout(() => {
//     initialize();
//   }, 50);

//   // Cleanup function
//   return () => {
//     isMounted = false;
//     if (checkTimeout) {
//       clearTimeout(checkTimeout);
//     }
//     if (pollingIntervalRef.current) {
//       clearInterval(pollingIntervalRef.current);
//       pollingIntervalRef.current = null;
//     }
//   };
// }, [selectedFeature]);



// ! Function to handle test generation for the selected feature
// const handleGenerateTests = async () => {
//   // Clear previous messages/state
//   setError(null);
//   setSuccessMessage(null);

//   // Set generating state immediately
//   const featureObj = features.find(f => f.id === selectedFeature);
//   const featureName = featureObj ? featureObj.name : 'Selected Feature';
//   setIsGeneratingTests(true);
//   setGeneratingFeatures([{ id: selectedFeature, name: featureName }]);

//   // Call the new service function
//   pollingIntervalRef.current = await handleFeatureTestGeneration(
//     selectedFeature,
//     secrets,
//     (taskId) => { // onStart
//       // State already set, no need to set again
//     },
//     (statusUpdate) => { // onStatusUpdate
//       setSuccessMessage(statusUpdate);
//     },
//     async (successMsg) => { // onSuccess
//       setIsGeneratingTests(false);
//       setGeneratingFeatures([]);
//       pollingIntervalRef.current = null;
//       setSuccessMessage(`Test generation completed successfully. ${successMsg}`);
//     },
//     (errorMsg) => { // onError
//       setIsGeneratingTests(false);
//       setGeneratingFeatures([]);
//       setError(`Test generation failed. ${errorMsg}`);
//       setSuccessMessage(null);
//       pollingIntervalRef.current = null;
//     },
//     featureName
//   );
// };