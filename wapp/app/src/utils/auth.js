import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export const login = async (username, password) => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post(`${API_URL}/auth/login`,
      formData,
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    localStorage.setItem('isAuthenticated', 'true');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const register = async (username, email, password, invitation_code) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`,
      { username, email, password, invitation_code },
      { withCredentials: true }
    );
    localStorage.setItem('isAuthenticated', 'true');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const validateInvitationCode = async (code, email) => {
  try {
    const url = `${API_URL}/invitations/validate/${code}` + (email ? `?email=${email}` : '');
    const response = await axios.get(url);
    return { valid: true, data: response.data };
  } catch (error) {
    return { valid: false, error: error.response?.data?.detail || 'Invalid code' };
  }
};

export const isAdmin = async () => {
  const cachedAdminStatus = localStorage.getItem('isAdmin');

  // Return cached result if available and not expired (cache for 1 minute)
  if (cachedAdminStatus) {
    const { isAdmin, timestamp } = JSON.parse(cachedAdminStatus);
    const cacheAge = Date.now() - timestamp;
    if (cacheAge < 60000) { // 1 minute in milliseconds
      return isAdmin;
    }
  }

  try {
    const response = await axios.get(`${API_URL}/auth/is-admin`, { 
      withCredentials: true,
      timeout: 5000 // 5 second timeout
    });
    console.log("RESPONSE: ", response.data)
    // Cache the result with a timestamp
    localStorage.setItem('isAdmin', JSON.stringify({
      isAdmin: response.data,
      timestamp: Date.now()
    }));

    return response.data;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const logout = async () => {
  try {
    await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('isAdmin'); // Clear admin status on logout
  } catch (error) {
    console.error('Logout failed:', error);
  }
  window.location.href = '/login';
};

export const setupAxiosInterceptors = () => {
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response) {
        // If the error is an authentication error, redirect to login
        if (error.response.status === 401 && error.config && !error.config.__isRetryRequest) {
          localStorage.removeItem('isAuthenticated');
          window.location.href = '/login';
        }
        
        // Handle invitation code errors
        if (error.response.status === 400 && 
            error.response.data && 
            error.response.data.detail && 
            error.response.data.detail.includes('Invitation code required')) {
          
          // If the error occurred during a Google auth flow
          if (error.config.url.includes('/auth/google')) {
            // We'll let the GoogleCallback component handle this
            return Promise.reject(error);
          }
          
          // For other API calls, redirect to login with error message
          window.location.href = '/login?error=invitation_required&error_description=Invitation code required for registration';
        }
      }
      
      return Promise.reject(error);
    }
  );
};
