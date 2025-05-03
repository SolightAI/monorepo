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

  // Internal function to handle fetching and state updates
  const _fetchAndProcessProducts = async (organizationId) => {
    setLoading(true);
    setError(null);

    try {
      const url = `${API_URL}/products/?organization_id=${organizationId}`;
      const response = await axios.get(url, {
        withCredentials: true
      });

      setProducts(response.data);

      // Handle product selection logic
      // Using setTimeout might contribute to flickering if UI relies on intermediate states
      // Consider if this delay is strictly necessary or if logic can be synchronous
      setTimeout(() => {
        const storedProductId = localStorage.getItem('selectedProductId');
        let productToSelect = null;

        if (storedProductId && response.data.length > 0) {
          const foundProduct = response.data.find(p => p.id === storedProductId);
          if (foundProduct) {
            productToSelect = foundProduct;
          } else if (response.data.length > 0) {
            // Fallback to first product if stored one not found
            productToSelect = response.data[0];
          }
        } else if (response.data.length > 0) {
          // Fallback to first product if nothing stored
          productToSelect = response.data[0];
        } else {
          // No products fetched
          productToSelect = null;
        }

        // Update selected product state and local storage
        if (productToSelect) {
          setSelectedProduct(productToSelect);
          localStorage.setItem('selectedProductId', productToSelect.id);
        } else {
          setSelectedProduct(null);
          localStorage.removeItem('selectedProductId');
        }
      }, 100); // Delay might need adjustment or removal depending on UX needs
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have permission to access products in this organization');
      } else if (err.response?.status === 401) {
        console.warn('401 error encountered while fetching products');
      } else {
        setError('Failed to fetch products');
        console.error("Product fetch error:", err); // Log the actual error for debugging
      }
      setProducts([]); // Clear products on error
      setSelectedProduct(null); // Clear selection on error
      localStorage.removeItem('selectedProductId'); // Ensure local storage is cleared on error
    } finally {
      setLoading(false);
    }
  };


  // Memoized fetchProducts for internal use (e.g., useEffect)
  const fetchProducts = useCallback(async (organizationId) => {
    if (!organizationId) {
      setProducts([]);
      setSelectedProduct(null);
      setError('Organization ID is required to fetch products');
      setLoading(false);
      localStorage.removeItem('selectedProductId');
      return;
    }
    await _fetchAndProcessProducts(organizationId);
  }, []); // Empty dependency array: function identity needs to be stable for useEffect

  // Force refresh of products data - exposed via context
  const refreshProducts = useCallback(async (organizationId) => {
    if (!organizationId) {
       setProducts([]);
       setSelectedProduct(null);
       setError('Organization ID is required to fetch products');
       setLoading(false);
       localStorage.removeItem('selectedProductId');
       return;
    }
    // Explicitly trigger fetch even if orgId hasn't changed
    await _fetchAndProcessProducts(organizationId);
  }, []); // Empty dependency array: relies only on passed arg, stable identity needed

  // Listen for organization changes
  useEffect(() => {
    const handleOrganizationChange = (event) => {
      // Clear current product selection immediately
      setSelectedProduct(null);
      localStorage.removeItem('selectedProductId'); // Ensure local storage is cleared too
      setProducts([]); // Clear products while we're loading new ones
      setError(null); // Clear previous errors

      const { organization } = event.detail;
      if (organization && organization.id) {
        fetchProducts(organization.id); // Use the memoized fetchProducts
      } else {
        // No valid organization selected (e.g., org deleted, logged out)
        setLoading(false); // Ensure loading is false
        setProducts([]);
        setSelectedProduct(null);
      }
    };

    window.addEventListener(ORGANIZATION_CHANGED_EVENT, handleOrganizationChange);
    return () => {
      window.removeEventListener(ORGANIZATION_CHANGED_EVENT, handleOrganizationChange);
    };
  }, [fetchProducts]); // Depend only on fetchProducts identity

  // Initial fetch or fetch when selectedOrganization context value changes directly
  useEffect(() => {
    const currentOrgId = selectedOrganization?.id;
    if (currentOrgId) {
      fetchProducts(currentOrgId);
    } else {
        // Handle case where organization becomes null/undefined or has no ID
        setProducts([]);
        setSelectedProduct(null);
        setLoading(false);
        setError(null);
        localStorage.removeItem('selectedProductId');
    }
    // Explicitly depend on the ID to avoid fetches on object reference changes
  }, [selectedOrganization?.id, fetchProducts]);

  // Function to select a product (called by ProductSelector)
  const selectProduct = useCallback((product) => {
    if (product && product.id) { // Ensure product and product.id exist
      setSelectedProduct(product);
      localStorage.setItem('selectedProductId', product.id);
    } else {
      setSelectedProduct(null);
      localStorage.removeItem('selectedProductId');
    }
  }, []);


  // Value provided to consumers
  const contextValue = {
    products,
    selectedProduct,
    selectProduct,
    loading,
    error,
    // Provide refreshProducts bound to the current org ID if available, or a no-op/error handler
    // This avoids consumers needing to know the current org ID separately
    refreshProducts: useCallback(() => {
        if (selectedOrganization?.id) {
            return refreshProducts(selectedOrganization.id);
        } else {
            console.warn("refreshProducts called without a selected organization ID.");
            // Optionally set an error state or return a rejected promise
            setError("Cannot refresh products without a selected organization.");
            return Promise.resolve(); // Or Promise.reject(new Error(...))
        }
    }, [selectedOrganization?.id, refreshProducts]),
  };


  return (
    <ProductContext.Provider value={contextValue}>
      {children}
    </ProductContext.Provider>
  );
};

export default ProductContext;
