import React, { createContext, useState, useContext, useEffect } from 'react';
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

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/products/`, {
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
      }
    } catch (err) {
      setError('Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to select a product
  const selectProduct = (product) => {
    setSelectedProduct(product);
    localStorage.setItem('selectedProductId', product.id);
  };

  // Force refresh of products data
  const refreshProducts = () => {
    fetchProducts();
  };

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