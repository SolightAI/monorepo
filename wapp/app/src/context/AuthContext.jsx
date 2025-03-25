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

  const AUTH_ROUTES = ['/login', '/register', '/auth/google/callback'];

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
    let isCheckingAuth = false;

    // Add a request interceptor to ensure credentials are always included
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        // Always include credentials with every request
        try {
          const backendOrigin = new URL(API_URL).origin;
          const requestOrigin = new URL(config.url, window.location.origin).origin;
          if (requestOrigin === backendOrigin) {
            config.withCredentials = true;
          }
        } catch (e) {
          console.warn('Could not safely determine origin for credentials:', e);
        }

        // Check if user is authenticated but cookie is missing
        // This could happen if cookie expires but local state hasn't been updated
        const isAuthenticatedInState = localStorage.getItem('isAuthenticated') === 'true';
        if (isAuthenticatedInState && !config.url.includes('/auth/check-auth')) {
          try {
            const backendOrigin = new URL(API_URL).origin;
            const requestOrigin = new URL(config.url, window.location.origin).origin;

            if (requestOrigin === backendOrigin) {
              axios.get(`${API_URL}/auth/check-auth`, {
                withCredentials: true,
                timeout: 5000,
              }).then((res) => {
                if (!res.data.authenticated) {
                  console.log('Auth check failed - session expired');
                  setIsAuthenticated(false);
                  setIsAdmin(false);
                  localStorage.removeItem('isAuthenticated');
                  localStorage.removeItem('isAdmin');
                  window.location.href = '/login';
                }
              }).catch(() => {
                console.log('Silent check-auth failed');
              });
            }
          } catch (e) {
            console.warn('Auth origin check failed:', e);
          }
        }

        return config;
      },
      error => Promise.reject(error)
    );

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        console.log('Axios error intercepted:', error.response?.status, error.config?.url);

        if (error.response && !isRedirecting && !isCheckingAuth) {
          const status = error.response.status;

          // Handle 401 errors directly and immediately, regardless of authentication state
          if (status === 401 && error.config && !error.config.__isRetryRequest) {
            // Avoid redirect loops
            const currentPath = window.location.pathname;
            if (AUTH_ROUTES.some(route => currentPath.includes(route))) {
              return Promise.reject(error);
            }

            isRedirecting = true;
            console.log('401 Authentication error detected, logging out and redirecting');

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

            return Promise.reject(error);
          }

          // For other 4xx errors, verify authentication status if user is supposedly logged in
          else if (status >= 400 && status < 500 && isAuthenticated && error.config && !error.config.__isRetryRequest) {
            // Avoid redirect loops
            const currentPath = window.location.pathname;
            if (AUTH_ROUTES.some(route => currentPath.includes(route))) {
              return Promise.reject(error);
            }

            try {
              // Set flag to prevent recursive auth checks
              isCheckingAuth = true;

              console.log(`${status} error detected, performing hard-check on authentication status`);

              // Hard-check auth status with the server
              const authCheckResponse = await axios.get(`${API_URL}/auth/check-auth`, {
                withCredentials: true,
                timeout: 5000
              });

              // If server confirms authentication, just pass through the original error
              if (authCheckResponse.data.authenticated) {
                console.log('Authentication confirmed, original error is not auth-related');
                isCheckingAuth = false;
                return Promise.reject(error);
              } else {
                // User is not authenticated according to server
                console.log('Authentication failed during hard-check, logging out');
                isRedirecting = true;

                // Update authentication state
                setIsAuthenticated(false);
                setIsAdmin(false);
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('isAdmin');

                // Use setTimeout to allow current execution to complete
                setTimeout(() => {
                  window.location.href = '/login';
                  isRedirecting = false;
                  isCheckingAuth = false;
                }, 100);
              }
            } catch (authCheckError) {
              // If the auth check itself fails, assume user is not authenticated
              console.log('Hard-check failed, assuming user is not authenticated:', authCheckError);
              isRedirecting = true;

              // Update authentication state
              setIsAuthenticated(false);
              setIsAdmin(false);
              localStorage.removeItem('isAuthenticated');
              localStorage.removeItem('isAdmin');

              // Use setTimeout to allow current execution to complete
              setTimeout(() => {
                window.location.href = '/login';
                isRedirecting = false;
                isCheckingAuth = false;
              }, 100);
            }
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, [isAuthenticated]);

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
