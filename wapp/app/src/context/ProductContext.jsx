import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useOrganization, ORGANIZATION_CHANGED_EVENT } from './OrganizationContext';
import { API_URL } from '@/constants/api';

const ProductContext = createContext();

export const useProduct = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { selectedOrganization } = useOrganization();

  // Memoize fetchProducts to avoid unnecessary re-renders
  const fetchProducts = useCallback(async (organizationId) => {
    if (!organizationId) {
      setProducts([]); // Clear products if no org
      setSelectedProduct(null);
      setError('Organization ID is required to fetch products');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_URL}/products/?organization_id=${organizationId}`;
      const response = await axios.get(url, {
        withCredentials: true
      });

      setProducts(response.data);

      // Handle product selection after a small delay to ensure state is updated
      // Using setTimeout might contribute to flickering if UI relies on intermediate states
      setTimeout(() => {
        const storedProductId = localStorage.getItem('selectedProductId');
        let productToSelect = null;

        if (storedProductId && response.data.length > 0) {
          const foundProduct = response.data.find(p => p.id === storedProductId);
          if (foundProduct) {
            productToSelect = foundProduct;
          } else if (response.data.length > 0) {
            productToSelect = response.data[0];
          }
        } else if (response.data.length > 0) {
          productToSelect = response.data[0];
        } else {
            productToSelect = null;
        }

        if (productToSelect) {
            setSelectedProduct(productToSelect);
            localStorage.setItem('selectedProductId', productToSelect.id);
        } else {
            setSelectedProduct(null);
            localStorage.removeItem('selectedProductId');
        }
      }, 100); // Small delay to ensure state updates are processed
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have permission to access products in this organization');
      } else if (err.response?.status === 401) {
        console.warn('401 error encountered while fetching products');
      } else {
        setError('Failed to fetch products');
      }
      setProducts([]); // Clear products on error
      setSelectedProduct(null); // Clear selection on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for organization changes
  useEffect(() => {
    const handleOrganizationChange = (event) => {

      // Clear current product selection immediately
      setSelectedProduct(null);
      localStorage.removeItem('selectedProductId'); // Ensure local storage is cleared too

      // Clear products while we're loading
      setProducts([]);

      // Fetch products for new organization
      const { organization } = event.detail;
      if (organization && organization.id) {
        fetchProducts(organization.id);
      } else {
        setLoading(false); // Ensure loading is false if we can't fetch
      }
    };

    // Add event listener
    window.addEventListener(ORGANIZATION_CHANGED_EVENT, handleOrganizationChange);

    // Clean up
    return () => {
      window.removeEventListener(ORGANIZATION_CHANGED_EVENT, handleOrganizationChange);
    };
  }, [fetchProducts]);

  // Initial fetch or fetch when selectedOrganization context value changes directly
  // Depend on the ID, not the object, to prevent unnecessary fetches if the object reference changes but ID remains the same.
  useEffect(() => {
    if (selectedOrganization && selectedOrganization.id) {
      fetchProducts(selectedOrganization.id);
    } else if (!selectedOrganization) {
        // Handle explicit null/undefined case (e.g., after logout or org deletion)
        setProducts([]);
        setSelectedProduct(null);
        setLoading(false); // Ensure loading is false if there's no org
        setError(null);
    }
     else {
        // This might happen during initial load before organization context is ready
        // Don't set loading to false here if organization context itself might still be loading
    }
  }, [selectedOrganization?.id, fetchProducts]); // <-- Dependency changed to selectedOrganization?.id

  // Function to select a product (called by ProductSelector)
  const selectProduct = useCallback((product) => {
    if (product) {
      setSelectedProduct(product);
      localStorage.setItem('selectedProductId', product.id);
    } else {
      setSelectedProduct(null);
      localStorage.removeItem('selectedProductId');
    }
  }, []);

  // Force refresh of products data - memoized to maintain stable reference
  // NOTE: This duplicates the logic from fetchProducts. Consider refactoring.
  const refreshProducts = useCallback(async (organizationId) => {
    if (!organizationId) {
       setProducts([]);
       setSelectedProduct(null);
       setError('Organization ID is required to fetch products');
       setLoading(false);
       return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_URL}/products/?organization_id=${organizationId}`;
      const response = await axios.get(url, {
        withCredentials: true
      });

      setProducts(response.data);

      // Handle product selection after a small delay to ensure state is updated
      setTimeout(() => {
        const storedProductId = localStorage.getItem('selectedProductId');
        let productToSelect = null;

        if (storedProductId && response.data.length > 0) {
            const foundProduct = response.data.find(p => p.id === storedProductId);
            if (foundProduct) {
                productToSelect = foundProduct;
            } else if (response.data.length > 0) {
                productToSelect = response.data[0];
            }
        } else if (response.data.length > 0) {
            productToSelect = response.data[0];
        } else {
            productToSelect = null;
        }

        if (productToSelect) {
            setSelectedProduct(productToSelect);
            localStorage.setItem('selectedProductId', productToSelect.id);
        } else {
            setSelectedProduct(null);
            localStorage.removeItem('selectedProductId');
        }
      }, 100); // Small delay
    } catch (err) {
      console.error('Error fetching products:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to access products in this organization');
      } else if (err.response?.status === 401) {
        console.warn('401 error encountered while fetching products');
      } else {
        setError('Failed to fetch products');
      }
      setProducts([]); // Clear products on error
      setSelectedProduct(null); // Clear selection on error
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies, relies on passed organizationId

  return (
    <ProductContext.Provider
      value={{
        products,
        selectedProduct,
        selectProduct,
        loading,
        error,
        refreshProducts
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export default ProductContext;
