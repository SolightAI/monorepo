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
      testPollingIntervalsRef,
      updateUrl,
      updateTests,
      updateFeature,
      updateEpic,
      updateProduct,
      updateOrganization,
      reset,
    }}>
      {children}
    </DemoContext.Provider>
  );
}