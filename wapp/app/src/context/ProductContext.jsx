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
  const fetchProducts = useCallback(async (organizationId = null) => {
    setLoading(true);
    setError(null);

    try {
      // Construct the URL with organization filter if provided
      const url = organizationId
        ? `${API_URL}/products/?organization_id=${organizationId}`
        : `${API_URL}/products/`;

      const response = await axios.get(url, {
        withCredentials: true
      });

      setProducts(response.data);

      // Set selected product from local storage or default to first product
      const storedProductId = localStorage.getItem('selectedProductId');
      if (storedProductId && response.data.length > 0) {
        const foundProduct = response.data.find(p => p.id === storedProductId);
        if (foundProduct) {
          setSelectedProduct(foundProduct);
        } else {
          // If stored product not found in results, use first product
          setSelectedProduct(response.data[0]);
          localStorage.setItem('selectedProductId', response.data[0].id);
        }
      } else if (response.data.length > 0) {
        // Default to first product if none stored
        setSelectedProduct(response.data[0]);
        localStorage.setItem('selectedProductId', response.data[0].id);
      } else {
        // If no products after filtering by organization, clear selected product
        setSelectedProduct(null);
        localStorage.removeItem('selectedProductId');
      }
    } catch (err) {
      // Check if it's an authentication error (401)
      if (err.response && err.response.status === 401) {
        console.log('Authentication error detected in ProductContext');
        // Clear authentication state
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('selectedProductId');
        // Redirect to login page
        window.location.href = '/login';
        return;
      }
      
      setError('Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Function to select a product
  const selectProduct = useCallback((product) => {
    setSelectedProduct(product);
    localStorage.setItem('selectedProductId', product.id);
  }, []);

  // Force refresh of products data - memoized to maintain stable reference
  const refreshProducts = useCallback((organizationId = null) => {
    fetchProducts(organizationId);
  }, [fetchProducts]);

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
