import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const ProductContext = createContext();

export const useProduct = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          } else if (response.data.length > 0 && !storedProductId) {
            // Only auto-select first product if we don't have a stored ID
            setSelectedProduct(response.data[0]);
            localStorage.setItem('selectedProductId', response.data[0].id);
          }
        } else if (response.data.length > 0 && !storedProductId) {
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
          } else if (response.data.length > 0 && !storedProductId) {
            // Only auto-select first product if we don't have a stored ID
            setSelectedProduct(response.data[0]);
            localStorage.setItem('selectedProductId', response.data[0].id);
          }
        } else if (response.data.length > 0 && !storedProductId) {
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
