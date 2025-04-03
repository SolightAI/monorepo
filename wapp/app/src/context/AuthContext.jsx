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
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const AUTH_ROUTES = ['/login', '/register', '/auth/google/callback'];

  // Validate invitation code
  const validateInvitationCode = async (code, email) => {
    try {
      const url = `${API_URL}/invitations/validate/${code}` + (email ? `?email=${email}/` : '/' );
      const response = await axios.get(url);
      return { isValid: true, data: response.data };
    } catch (error) {
      console.error('Error validating invitation code:', error);
      return { isValid: false, error: error.response?.data?.detail || 'Invalid invitation code' };
    }
  };

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

      const response = await axios.get(`${API_URL}/auth/is-admin/`, {
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
      console.log('Checking auth status');
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

        // Check onboarding status if it exists in the response
        if (response.data.user.onboarding_completed !== undefined) {
          console.log('Setting onboarding status from auth check:', response.data.user.onboarding_completed);
          setOnboardingCompleted(response.data.user.onboarding_completed);
          localStorage.setItem('onboardingCompleted', response.data.user.onboarding_completed.toString());
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
      localStorage.removeItem('onboardingCompleted');

      return { authenticated: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup axios interceptors within AuthContext
  useEffect(() => {
    let isRedirecting = false;
    let isCheckingAuth = false;

    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        // Add withCredentials to all requests
        config.withCredentials = true;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        console.log('Axios error intercepted:', error.response?.status, error.config?.url);

        if (error.response && !isRedirecting && !isCheckingAuth) {
          const status = error.response.status;
          const currentPath = window.location.pathname;

          // Don't redirect if we're already on the login page
          if (currentPath === '/login') {
            return Promise.reject(error);
          }

          // Handle 401 errors directly and immediately, regardless of authentication state
          if (status === 401 && error.config && !error.config.__isRetryRequest) {
            // Avoid redirect loops
            if (AUTH_ROUTES.some(route => currentPath.includes(route))) {
              return Promise.reject(error);
            }

            // Get the current URL parameters
            const currentUrl = new URL(window.location.href);
            const invitationCode = currentUrl.searchParams.get('invitation_code');
            const invitationType = currentUrl.searchParams.get('type');

            // Construct the login URL with invitation code if present
            let loginUrl = '/login';
            if (invitationCode) {
              loginUrl += `?invitation_code=${encodeURIComponent(invitationCode)}`;
              if (invitationType) {
                loginUrl += `&type=${encodeURIComponent(invitationType)}`;
              }
            }

            isRedirecting = true;
            console.log('401 Authentication error detected, redirecting to login with invitation code');

            // Update authentication state
            setIsAuthenticated(false);
            setIsAdmin(false);
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('isAdmin');

            // Use setTimeout to allow current execution to complete
            setTimeout(() => {
              window.location.href = loginUrl;
              isRedirecting = false;
            }, 100);
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

                // Get the current URL parameters
                const currentUrl = new URL(window.location.href);
                const invitationCode = currentUrl.searchParams.get('invitation_code');
                const invitationType = currentUrl.searchParams.get('type');

                // Construct the login URL with invitation code if present
                let loginUrl = '/login';
                if (invitationCode) {
                  loginUrl += `?invitation_code=${encodeURIComponent(invitationCode)}`;
                  if (invitationType) {
                    loginUrl += `&type=${encodeURIComponent(invitationType)}`;
                  }
                }

                // Update authentication state
                setIsAuthenticated(false);
                setIsAdmin(false);
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('isAdmin');

                // Use setTimeout to allow current execution to complete
                setTimeout(() => {
                  window.location.href = loginUrl;
                  isRedirecting = false;
                  isCheckingAuth = false;
                }, 100);
              }
            } catch (authCheckError) {
              // If the auth check itself fails, assume user is not authenticated
              console.log('Hard-check failed, assuming user is not authenticated:', authCheckError);
              isRedirecting = true;

              // Get the current URL parameters
              const currentUrl = new URL(window.location.href);
              const invitationCode = currentUrl.searchParams.get('invitation_code');
              const invitationType = currentUrl.searchParams.get('type');

              // Construct the login URL with invitation code if present
              let loginUrl = '/login';
              if (invitationCode) {
                loginUrl += `?invitation_code=${encodeURIComponent(invitationCode)}`;
                if (invitationType) {
                  loginUrl += `&type=${encodeURIComponent(invitationType)}`;
                }
              }

              // Update authentication state
              setIsAuthenticated(false);
              setIsAdmin(false);
              localStorage.removeItem('isAuthenticated');
              localStorage.removeItem('isAdmin');

              // Use setTimeout to allow current execution to complete
              setTimeout(() => {
                window.location.href = loginUrl;
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

        // Set onboarding status if provided
        if (tokenOrUserData.user.onboarding_completed !== undefined) {
          console.log('Setting onboarding status from Google callback:', tokenOrUserData.user.onboarding_completed);
          setOnboardingCompleted(tokenOrUserData.user.onboarding_completed);
          localStorage.setItem('onboardingCompleted', tokenOrUserData.user.onboarding_completed.toString());
        }
      } else {
        // Just a token, check admin status and authenticate
        checkAdminStatus();

        // Also check auth status to get full user data including onboarding status
        checkAuthStatus();
      }
    }
  }, [checkAdminStatus, checkAuthStatus]);

  // Update onboarding status
  const updateOnboardingStatus = async (completed) => {
    try {
      const response = await axios.post(
        `${API_URL}/users/onboarding/completed`,
        { completed },
        { withCredentials: true }
      );

      if (response.data.success) {
        setOnboardingCompleted(completed);
        localStorage.setItem('onboardingCompleted', completed.toString());

        // Update user object with new onboarding status
        if (user) {
          setUser({
            ...user,
            onboarding_completed: completed
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      return false;
    }
  };

  const value = {
    isAuthenticated,
    isAdmin,
    user,
    loading,
    error,
    onboardingCompleted,
    login,
    register,
    logout,
    checkAdminStatus,
    handleGoogleCallback,
    checkAuthStatus,
    validateInvitationCode,
    updateOnboardingStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
