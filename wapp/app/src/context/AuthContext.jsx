import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedAuthState = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(storedAuthState);
    
    // If authenticated, check admin status
    if (storedAuthState) {
      checkAdminStatus();
    } else {
      setLoading(false);
    }
  }, []);
  
  // Check admin status
  const checkAdminStatus = useCallback(async () => {
    try {
      const cachedAdminStatus = localStorage.getItem('isAdmin');
      
      // Use cached admin status if available and not expired
      if (cachedAdminStatus) {
        const { isAdmin: adminStatus, timestamp } = JSON.parse(cachedAdminStatus);
        const cacheAge = Date.now() - timestamp;
        if (cacheAge < 60000) { // 1 minute in milliseconds
          setIsAdmin(adminStatus);
          setLoading(false);
          return;
        }
      }
      
      const response = await axios.get(`${API_URL}/auth/is-admin`, {
        withCredentials: true,
        timeout: 5000
      });
      
      // Cache the admin status
      localStorage.setItem('isAdmin', JSON.stringify({
        isAdmin: response.data,
        timestamp: Date.now()
      }));
      
      setIsAdmin(response.data);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login function
  const login = async (username, password) => {
    setError(null);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post(
        `${API_URL}/auth/login`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      // Update authentication state
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
      
      // Check admin status after login
      checkAdminStatus();
      
      return response.data;
    } catch (error) {
      setError(error.response?.data?.detail || 'Login failed');
      throw error;
    }
  };

  // Register function
  const register = async (username, email, password, invitation_code) => {
    setError(null);
    try {
      const response = await axios.post(
        `${API_URL}/auth/register`,
        { username, email, password, invitation_code },
        { withCredentials: true }
      );
      
      // Update authentication state
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
      
      return response.data;
    } catch (error) {
      setError(error.response?.data?.detail || 'Registration failed');
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Update authentication state
      setIsAuthenticated(false);
      setIsAdmin(false);
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('isAdmin');
    }
  };

  // Check authentication status from server
  const checkAuthStatus = useCallback(async () => {
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/auth/check-auth`, {
        withCredentials: true,
        timeout: 5000
      });
      
      if (response.data.authenticated) {
        // Update authentication state
        setIsAuthenticated(true);
        setUser(response.data.user);
        localStorage.setItem('isAuthenticated', 'true');
        
        // Set admin status if it's included in the response
        if (response.data.user.is_admin !== undefined) {
          setIsAdmin(response.data.user.is_admin);
          localStorage.setItem('isAdmin', JSON.stringify({
            isAdmin: response.data.user.is_admin,
            timestamp: Date.now()
          }));
        }
      }
      
      return response.data;
    } catch (error) {
      if (error.response?.status !== 401) {
        // Only set error for non-401 responses
        // 401 is expected when not authenticated
        setError(error.response?.data?.detail || 'Failed to check authentication status');
      }
      
      // Ensure state reflects unauthenticated status
      setIsAuthenticated(false);
      setIsAdmin(false);
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('isAdmin');
      
      return { authenticated: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup axios interceptors within AuthContext
  useEffect(() => {
    // Keep track of redirect in progress to avoid loops
    let isRedirecting = false;

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response && !isRedirecting) {
          // Handle 401 Unauthorized errors
          if (error.response.status === 401 && error.config && !error.config.__isRetryRequest) {
            // Avoid redirect loops
            const currentPath = window.location.pathname;
            if (currentPath.includes('/login') ||
                currentPath.includes('/register') ||
                currentPath.includes('/auth/google/callback')) {
              return Promise.reject(error);
            }

            isRedirecting = true;
            console.log('Authentication error detected, logging out');
            
            // Update authentication state
            setIsAuthenticated(false);
            setIsAdmin(false);
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('isAdmin');
            
            // Use setTimeout to allow current execution to complete
            setTimeout(() => {
              window.location.href = '/login';
              isRedirecting = false;
            }, 100);
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Google auth callback handler
  const handleGoogleCallback = useCallback((tokenOrUserData) => {
    if (tokenOrUserData) {
      // Set authentication state
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
      
      // If we received user data (from direct API check), save it
      if (typeof tokenOrUserData === 'object' && tokenOrUserData.user) {
        setUser(tokenOrUserData.user);
        
        // Set admin status if provided
        if (tokenOrUserData.user.is_admin !== undefined) {
          setIsAdmin(tokenOrUserData.user.is_admin);
          localStorage.setItem('isAdmin', JSON.stringify({
            isAdmin: tokenOrUserData.user.is_admin,
            timestamp: Date.now()
          }));
        }
      } else {
        // Just a token, check admin status
        checkAdminStatus();
      }
    }
  }, [checkAdminStatus]);

  const value = {
    isAuthenticated,
    isAdmin,
    user,
    loading,
    error,
    login,
    register,
    logout,
    checkAdminStatus,
    handleGoogleCallback,
    checkAuthStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 