import { createContext, useContext, useState, useCallback } from 'react';

/**
 * DemoContext is a React context that provides a way to manage and share demo-related state
 */
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
  const [tests, setTests] = useState([]);

  const updateUrl = (newUrl) => { 
    setUrl(newUrl);
  };

  const updateTests = useCallback((newTests) => {
    setTests(newTests);
  }, []);
  
  const updateFeature = useCallback((newFeature) => {
    setFeature(newFeature);
  }, []);

  const reset = useCallback(() => {
    setUrl('');
    setTests([]);
    setFeature(null);
  }, []);

  return (
    <DemoContext.Provider value={{
      url,
      tests,
      feature,
      updateUrl,
      updateTests,
      updateFeature,
      reset,
    }}>
      {children}
    </DemoContext.Provider>
  );
}