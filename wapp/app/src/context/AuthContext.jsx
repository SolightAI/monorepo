import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const AuthContext = createContext(null);

// Token refresh constants
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
const ACCESS_TOKEN_EXPIRE_MINUTES = 30; // Default expiry if not provided

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

  const AUTH_ROUTES = ['/login', '/register', '/auth/callback'];

  // Validate invitation code
  const validateInvitationCode = async (code, email) => {
    try {
      let url = `${API_URL}/invitations/validate/${code}`;
      if (email) {
        url += `?email=${email}`;
      } else {
        url += `/`;
      }
      const response = await axios.get(url);
      const result = { isValid: true, data: response.data };
      return result;
    } catch (error) {
      const result = { isValid: false, error: error.response?.data?.detail || 'Invalid invitation code' };
      return result;
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

  const refreshAccessToken = useCallback(async () => {
    try {
      console.log('Refreshing access token using HTTP-only cookie');
      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        {},  // No need to send refresh token as it's in HTTP-only cookie
        { withCredentials: true }
      );

      if (response.data && response.data.access_token) {
        const expiresAt = new Date(Date.now() + (response.data.expires_in || ACCESS_TOKEN_EXPIRE_MINUTES * 60) * 1000);

        console.log(`Setting token data: expires in ${response.data.expires_in || ACCESS_TOKEN_EXPIRE_MINUTES * 60} seconds (${new Date(expiresAt).toLocaleTimeString()})`);

        setTokens({
          accessToken: response.data.access_token,
          expiresAt
        });

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

      // Don't clear auth state on refresh failures - just return false
      // We'll let the interceptor handle auth redirects when needed
      return false;
    }
  }, []);

  const setTokenData = useCallback((accessToken, expiresInSeconds) => {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    console.log(`Setting token data: expires in ${expiresInSeconds} seconds (${new Date(expiresAt).toLocaleTimeString()})`);

    setTokens({
      accessToken,
      expiresAt
    });

    localStorage.setItem('tokenExpiresAt', expiresAt.toISOString());
  }, []);

  useEffect(() => {
    const scheduleTokenRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        // console.log('Cleared existing refresh timer');
      }

      const { expiresAt } = tokens;

      if (!expiresAt) {
        // console.log('Cannot schedule refresh: Missing expiry data');
        return;
      }

      const now = new Date();
      const expiryTime = new Date(expiresAt);
      const timeRemaining = expiryTime.getTime() - now.getTime();

      if (timeRemaining <= 0) {
        // Don't schedule if already expired, rely on interceptor or immediate refresh elsewhere
        // console.log('Token already expired, not scheduling refresh.');
        return;
      }

      // Calculate the ideal refresh time based on the threshold
      let timeUntilRefresh = timeRemaining - TOKEN_REFRESH_THRESHOLD;

      // If threshold > lifetime, schedule refresh just before actual expiry
      if (timeUntilRefresh <= 0) {
        const safeBuffer = 5 * 1000; // Refresh 5 seconds before expiry
        timeUntilRefresh = Math.max(1000, timeRemaining - safeBuffer); // Ensure at least 1s delay
        // console.warn(`Token lifetime (${timeRemaining/1000}s) is shorter than refresh threshold (${TOKEN_REFRESH_THRESHOLD/1000}s). Scheduling refresh ${safeBuffer/1000}s before expiry.`);
      }

      // console.log(`Scheduling refresh in ${timeUntilRefresh / 1000}s (Expires in ${timeRemaining / 1000}s)`);

      refreshTimerRef.current = setTimeout(() => {
        // console.log('Timer triggered: Refreshing access token');
        refreshAccessToken();
      }, timeUntilRefresh);
    };

    if (tokens.expiresAt) {
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

    const storedExpiresAt = localStorage.getItem('tokenExpiresAt');

    if (storedAuthState && storedExpiresAt) {
      const expiresAt = new Date(storedExpiresAt);
      const now = new Date();

      if (expiresAt > now) {
        setTokens({
          expiresAt: expiresAt
        });
      } else {
        refreshAccessToken();
      }
    } else {
      console.log('Missing auth data, not scheduling token refresh');
    }

    if (storedAuthState) {
      // No need to await here; checkAuthStatus handles its own state updates
      // and the useEffect doesn't need to perform actions after it completes.
      checkAuthStatus();
    } else {
      setLoading(false);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [checkAuthStatus, refreshAccessToken, setTokenData]);

  // Login function
  const login = async (email, password, invitationCode) => {
    setLoading(true);
    setError(null);
    try {
      await axios.post(
        `${API_URL}/auth/login/password`,
        { email, password, invitation_code: invitationCode },
        { withCredentials: true }
      );

      // Backend sets HttpOnly cookies on successful login.
      // Refresh frontend auth state and ensure token mechanisms are primed.
      await checkAuthStatus();
      await refreshAccessToken();

      console.log('Login successful, auth status updated.');
      return true; // Indicate success
    } catch (err) {
      console.error('Login error:', err.response?.data?.detail || err.message);
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
      setIsAuthenticated(false);
      setUser(null);
      setIsAdmin(false);
      setTokens({ accessToken: null, refreshToken: null, expiresAt: null });
      localStorage.removeItem('tokenExpiresAt');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('onboardingCompleted');
      return false; // Indicate failure
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (username, email, password, invitation_code) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API_URL}/auth/register`,
        { username, email, password, invitation_code },
        { withCredentials: true }
      );

      if (response.data && response.data.user) {
        // Backend sets HttpOnly cookies and returns user data.
        // Refresh frontend auth state and ensure token mechanisms are primed.
        await checkAuthStatus();
        await refreshAccessToken();

        console.log('Registration successful, user logged in.', response.data.user);
        return response.data;
      } else {
        throw new Error('Registration response did not include user data.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
      setIsAuthenticated(false);
      setUser(null);
      setIsAdmin(false);
      setTokens({ accessToken: null, refreshToken: null, expiresAt: null });
      localStorage.removeItem('tokenExpiresAt');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('onboardingCompleted');
      throw err;
    } finally {
      setLoading(false);
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

            try {
              isRefreshing = true;

              const response = await axios.post(
                `${API_URL}/auth/refresh`,
                {},  // No need to send refresh token as it's in HTTP-only cookie
                { withCredentials: true }
              );

              if (response.data && response.data.access_token) {
                const newAccessToken = response.data.access_token;

                // Update access token and expiry
                const expiresAt = new Date(Date.now() + (response.data.expires_in || ACCESS_TOKEN_EXPIRE_MINUTES * 60) * 1000);
                setTokens({
                  accessToken: newAccessToken,
                  expiresAt
                });

                localStorage.setItem('tokenExpiresAt', expiresAt.toISOString());

                error.config.headers['Authorization'] = `Bearer ${newAccessToken}`;
                error.config.__isRetryRequest = true;

                processQueue(newAccessToken);
                isRefreshing = false;

                return axios(error.config);
              }
            } catch (refreshError) {
              console.error('Failed to refresh token on 401:', refreshError);

              // Don't redirect on token refresh errors (422)
              if (refreshError.response?.status === 422) {
                console.log('Token refresh returned 422 - continuing without redirect');
                processQueue(null, refreshError);
                isRefreshing = false;
                return Promise.reject(error);
              }

              processQueue(null, refreshError);
            } finally {
              isRefreshing = false;
            }
          }

          // Only redirect to login for true authentication failures (not refresh failures)
          if (status === 401 && error.config && !error.config.__isRetryRequest && !isAuthenticated) {
            const currentUrl = new URL(window.location.href);
            const invitationCode = currentUrl.searchParams.get('invitation_code');
            const invitationType = currentUrl.searchParams.get('type');

            // Construct login path with potential invitation params
            const loginParams = new URLSearchParams();
            if (invitationCode) loginParams.set('invitation_code', invitationCode);
            if (invitationType) loginParams.set('type', invitationType);
            const loginPath = `/login${loginParams.toString() ? '?' + loginParams.toString() : ''}`;

            isRedirecting = true;
            console.log('401 Authentication error detected, redirecting to login with invitation code');

            setIsAuthenticated(false);
            setIsAdmin(false);
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('tokenExpiresAt');

            setTimeout(() => {
              window.location.href = loginPath;
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

                // Construct login path with potential invitation params
                const loginParams = new URLSearchParams();
                if (invitationCode) loginParams.set('invitation_code', invitationCode);
                if (invitationType) loginParams.set('type', invitationType);
                const loginPath = `/login${loginParams.toString() ? '?' + loginParams.toString() : ''}`;

                // Update authentication state
                setIsAuthenticated(false);
                setIsAdmin(false);
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('isAdmin');

                // Use setTimeout to allow current execution to complete
                setTimeout(() => {
                  window.location.href = loginPath;
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

              // Construct login path with potential invitation params
              const loginParams = new URLSearchParams();
              if (invitationCode) loginParams.set('invitation_code', invitationCode);
              if (invitationType) loginParams.set('type', invitationType);
              const loginPath = `/login${loginParams.toString() ? '?' + loginParams.toString() : ''}`;

              // Update authentication state
              setIsAuthenticated(false);
              setIsAdmin(false);
              localStorage.removeItem('isAuthenticated');
              localStorage.removeItem('isAdmin');

              // Use setTimeout to allow current execution to complete
              setTimeout(() => {
                window.location.href = loginPath;
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

  // Login with Google
  const loginWithGoogle = async (invitationCode = null) => {
    try {
      const params = invitationCode ? `?invitation_code=${invitationCode}` : '';
      const response = await axios.get(`${API_URL}/auth/login/google${params}`);
      window.location.href = response.data.url; // Redirect to Google auth URL
    } catch (error) {
      console.error('Error initiating Google login:', error);
      setError('Could not initiate Google login.');
    }
  };

  // Login with Azure
  const loginWithAzure = async (invitationCode = null) => {
    try {
      const params = invitationCode ? `?invitation_code=${invitationCode}` : '';
      const response = await axios.get(`${API_URL}/auth/login/azure${params}`);
      window.location.href = response.data.url; // Redirect to Azure auth URL
    } catch (error) {
      console.error('Error initiating Azure login:', error);
      setError('Could not initiate Azure login.');
    }
  };

  // Handle OAuth callback (Google, Azure, etc.)
  const handleOAuthCallback = useCallback(async (searchParams) => {
    setLoading(true);
    const token = searchParams.get('token');
    const expiresIn = searchParams.get('expires_in');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      console.error(`OAuth Error: ${errorParam} - ${errorDescription}`);
      setError(errorDescription || 'OAuth authentication failed.');
      setIsAuthenticated(false);
      localStorage.removeItem('isAuthenticated');
      setLoading(false);
      return; // Stop processing if there's an error
    }

    if (token && expiresIn) {
      // In a real app, you might want to verify the token signature client-side
      // or preferably, make a call to your backend to validate the token
      // and get user info securely.
      // For now, we assume the token received from our backend redirect is valid.
      console.log('OAuth callback successful, received token.');
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');

      setTokenData(token, expiresIn);

      // Fetch user details after successful auth
      try {
        await checkAuthStatus(); // This will fetch user details and set admin/onboarding status
      } catch (authError) {
        console.error('Error fetching user status after OAuth callback:', authError);
        setError('Authentication successful, but failed to fetch user details.');
        // Keep isAuthenticated true, but show an error
      }
    } else {
      // Handle cases where neither token nor error is present (unexpected)
      console.warn('OAuth callback received without token or error.');
      setError('OAuth callback completed with an unexpected state.');
      setIsAuthenticated(false);
      localStorage.removeItem('isAuthenticated');
    }

    setLoading(false);
  }, [checkAuthStatus, setTokenData]);

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
    loginWithGoogle,
    loginWithAzure,
    register,
    logout,
    checkAdminStatus,
    handleOAuthCallback,
    checkAuthStatus,
    validateInvitationCode,
    updateOnboardingStatus,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
