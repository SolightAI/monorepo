import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const AuthContext = createContext(null);

// Token refresh constants
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // TODO: must be define in var env
const ACCESS_TOKEN_EXPIRE_MINUTES = 30; // TODO: must be define in var env

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
  const [tokens, setTokens] = useState({
    accessToken: null,
    refreshToken: null,
    expiresAt: null
  });
  const refreshTimerRef = useRef(null);

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

  // Check admin status - defined early since it's used in other functions
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
        isAdmin: response.data.is_admin,
        timestamp: Date.now()
      }));

      setIsAdmin(response.data.is_admin);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const refreshAccessToken = useCallback(async (refreshToken) => {
    try {
      if (!refreshToken) {
        console.log('No refresh token available');
        return false;
      }

      console.log('Refreshing access token with refresh token:', refreshToken.substring(0, 10) + '...');
      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        { withCredentials: true }
      );

      console.log('Refresh token response:', response.data);

      if (response.data && response.data.access_token) {
        const expiresAt = new Date(Date.now() + (response.data.expires_in || ACCESS_TOKEN_EXPIRE_MINUTES * 60) * 1000);
        
        console.log(`Setting token data: expires in ${response.data.expires_in || ACCESS_TOKEN_EXPIRE_MINUTES * 60} seconds (${new Date(expiresAt).toLocaleTimeString()})`);
        
        setTokens({
          accessToken: response.data.access_token,
          refreshToken,
          expiresAt
        });

        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('tokenExpiresAt', expiresAt.toISOString());
        
        setIsAuthenticated(true);
        console.log('Access token refreshed successfully');
        return true;
      } else {
        console.error('Refresh response missing access_token:', response.data);
        return false;
      }
    } catch (error) {
      console.error('Failed to refresh token:', error.response?.status, error.response?.data);
      setIsAuthenticated(false);
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiresAt');
      return false;
    }
  }, []);

  const setTokenData = useCallback((accessToken, refreshToken, expiresInSeconds) => {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    
    console.log(`Setting token data: expires in ${expiresInSeconds} seconds (${new Date(expiresAt).toLocaleTimeString()})`);
    
    setTokens({
      accessToken,
      refreshToken,
      expiresAt
    });

    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('tokenExpiresAt', expiresAt.toISOString());
  }, []);

  useEffect(() => {
    const scheduleTokenRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        console.log('Cleared existing refresh timer');
      }

      const { refreshToken, expiresAt } = tokens;
      
      if (!refreshToken || !expiresAt) {
        console.log('Cannot schedule refresh: Missing token or expiry data');
        return;
      }

      const now = new Date();
      const expiryTime = new Date(expiresAt);
      
      const timeUntilRefresh = Math.max(0, expiryTime.getTime() - now.getTime() - TOKEN_REFRESH_THRESHOLD);
            
      refreshTimerRef.current = setTimeout(() => {
        refreshAccessToken(refreshToken);
      }, timeUntilRefresh);
    };

    if (tokens.refreshToken && tokens.expiresAt) {
      scheduleTokenRefresh();
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [tokens, refreshAccessToken]);

  useEffect(() => {
    const storedAuthState = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(storedAuthState);

    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedExpiresAt = localStorage.getItem('tokenExpiresAt');
    
    if (storedAuthState && storedRefreshToken && storedExpiresAt) {
      const expiresAt = new Date(storedExpiresAt);
      const now = new Date();
      
      if (expiresAt > now) {
        setTokens({
          refreshToken: storedRefreshToken,
          expiresAt: expiresAt
        });
      } else {
        refreshAccessToken(storedRefreshToken);
      }
    } else {
      console.log('Missing auth data, not scheduling token refresh');
    }

    if (storedAuthState) {
      checkAdminStatus();
    } else {
      setLoading(false);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [checkAdminStatus, refreshAccessToken]);

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

      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');

      if (response.data.access_token && response.data.refresh_token) {
        setTokenData(
          response.data.access_token,
          response.data.refresh_token,
          response.data.expires_in || ACCESS_TOKEN_EXPIRE_MINUTES * 60
        );
      }

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
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiresAt');
      
      // Clear refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }
  };

  // Setup axios interceptors within AuthContext
  useEffect(() => {
    let isRedirecting = false;
    let isCheckingAuth = false;
    let isRefreshing = false;
    let refreshQueue = [];
    
    // Process all the requests in the queue with the new token
    const processQueue = (token = null, error = null) => {
      refreshQueue.forEach(({ resolve, reject }) => {
        if (error) {
          reject(error);
        } else {
          resolve(token);
        }
      });
      refreshQueue = [];
    };

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
        if (error.response && !isRedirecting && !isCheckingAuth) {
          const status = error.response.status;
          const currentPath = window.location.pathname;

          if (AUTH_ROUTES.some(route => currentPath.includes(route))) {
            return Promise.reject(error);
          }

          if (status === 401 && error.config && !error.config.__isRetryRequest && isAuthenticated) {
            if (isRefreshing) {
              return new Promise((resolve, reject) => {
                refreshQueue.push({ resolve, reject });
              })
                .then(token => {
                  error.config.headers['Authorization'] = `Bearer ${token}`;
                  return axios(error.config);
                })
                .catch(err => {
                  return Promise.reject(err);
                });
            }

            const currentRefreshToken = tokens.refreshToken || localStorage.getItem('refreshToken');

            if (currentRefreshToken) {
              try {
                isRefreshing = true;
                
                const response = await axios.post(
                  `${API_URL}/auth/refresh`,
                  { refresh_token: currentRefreshToken },
                  { withCredentials: true }
                );

                if (response.data && response.data.access_token) {
                  const newAccessToken = response.data.access_token;
              
                  setTokenData(
                    newAccessToken,
                    currentRefreshToken,
                    response.data.expires_in || ACCESS_TOKEN_EXPIRE_MINUTES * 60
                  );
                  
                  error.config.headers['Authorization'] = `Bearer ${newAccessToken}`;
                  error.config.__isRetryRequest = true;
                  
                  processQueue(newAccessToken);
                  isRefreshing = false;
                  
                  return axios(error.config);
                }
              } catch (refreshError) {
                console.error('Failed to refresh token on 401:', refreshError);
                processQueue(null, refreshError);
              } finally {
                isRefreshing = false;
              }
            }
          }

          if (status === 401 && error.config && !error.config.__isRetryRequest) {
            const currentUrl = new URL(window.location.href);
            const invitationCode = currentUrl.searchParams.get('invitation_code');
            const invitationType = currentUrl.searchParams.get('type');

            let loginUrl = '/login';
            if (invitationCode) {
              loginUrl += `?invitation_code=${encodeURIComponent(invitationCode)}`;
              if (invitationType) {
                loginUrl += `&type=${encodeURIComponent(invitationType)}`;
              }
            }

            isRedirecting = true;
            console.log('401 Authentication error detected, redirecting to login with invitation code');

            setIsAuthenticated(false);
            setIsAdmin(false);
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('tokenExpiresAt');

            setTimeout(() => {
              window.location.href = loginUrl;
              isRedirecting = false;
            }, 100);
          }

          else if (status >= 400 && status < 500 && isAuthenticated && error.config && !error.config.__isRetryRequest) {
            const currentPath = window.location.pathname;
            if (AUTH_ROUTES.some(route => currentPath.includes(route))) {
              return Promise.reject(error);
            }

            try {
              isCheckingAuth = true;

              const authCheckResponse = await axios.get(`${API_URL}/auth/check-auth`, {
                withCredentials: true,
                timeout: 5000
              });

              if (authCheckResponse.data.authenticated) {
                isCheckingAuth = false;
                return Promise.reject(error);
              } else {
                console.log('Authentication failed during hard-check, logging out');
                isRedirecting = true;

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
  }, [isAuthenticated, tokens, setTokenData]);

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
          setOnboardingCompleted(tokenOrUserData.user.onboarding_completed);
          localStorage.setItem('onboardingCompleted', tokenOrUserData.user.onboarding_completed.toString());
        }
      } else {
        if (typeof tokenOrUserData === 'string') {
          checkAuthStatus();
        } else if (tokenOrUserData.access_token && tokenOrUserData.refresh_token) {
          setTokenData(
            tokenOrUserData.access_token,
            tokenOrUserData.refresh_token,
            tokenOrUserData.expires_in || ACCESS_TOKEN_EXPIRE_MINUTES * 60
          );
        }
        
        checkAdminStatus();
      }
    }
  }, [checkAdminStatus, checkAuthStatus, setTokenData]);

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
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
