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
        if (storedProductId && response.data.length > 0) {
          const foundProduct = response.data.find(p => p.id === storedProductId);
          if (foundProduct) {
            setSelectedProduct(foundProduct);
          } else if (response.data.length > 0) {
            // If stored product not found, select first product
            setSelectedProduct(response.data[0]);
            localStorage.setItem('selectedProductId', response.data[0].id);
          }
        } else if (response.data.length > 0) {
          // If no stored product, select first product
          setSelectedProduct(response.data[0]);
          localStorage.setItem('selectedProductId', response.data[0].id);
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
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for organization changes
  useEffect(() => {
    const handleOrganizationChange = (event) => {
      console.log("Organization changed, refreshing products");

      // Clear current product selection
      setSelectedProduct(null);

      // Clear products while we're loading
      setProducts([]);

      // Fetch products for new organization
      const { organization } = event.detail;
      if (organization && organization.id) {
        fetchProducts(organization.id);
      }
    };

    // Add event listener
    window.addEventListener(ORGANIZATION_CHANGED_EVENT, handleOrganizationChange);

    // Clean up
    return () => {
      window.removeEventListener(ORGANIZATION_CHANGED_EVENT, handleOrganizationChange);
    };
  }, [fetchProducts]);

  // Update products when selectedOrganization changes
  useEffect(() => {
    if (selectedOrganization && selectedOrganization.id) {
      fetchProducts(selectedOrganization.id);
    }
  }, [selectedOrganization, fetchProducts]);

  // Function to select a product
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
  const refreshProducts = useCallback(async (organizationId) => {
    if (!organizationId) {
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
        if (storedProductId && response.data.length > 0) {
          const foundProduct = response.data.find(p => p.id === storedProductId);
          if (foundProduct) {
            setSelectedProduct(foundProduct);
          } else if (response.data.length > 0) {
            // If stored product not found, select first product
            setSelectedProduct(response.data[0]);
            localStorage.setItem('selectedProductId', response.data[0].id);
          }
        } else if (response.data.length > 0) {
          // If no stored product, select first product
          setSelectedProduct(response.data[0]);
          localStorage.setItem('selectedProductId', response.data[0].id);
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
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
