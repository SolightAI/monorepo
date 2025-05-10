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
  const [epic, setEpic] = useState(null);
  const [product, setProduct] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [tests, setTests] = useState([]);

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
  }, []);

  return (
    <DemoContext.Provider value={{
      url,
      tests,
      feature,
      epic,
      product,
      organization,
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