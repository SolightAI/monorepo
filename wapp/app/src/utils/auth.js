import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export const validateInvitationCode = async (code, email) => {
  try {
    const url = `${API_URL}/invitations/validate/${code}` + (email ? `?email=${email}` : '');
    const response = await axios.get(url);
    return { valid: true, data: response.data };
  } catch (error) {
    return { valid: false, error: error.response?.data?.detail || 'Invalid code' };
  }
};

/**
 * @deprecated Use AuthContext's login method instead
 */
export const login = async (username, password) => {
  console.warn('Deprecated: Use AuthContext.login instead');
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
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * @deprecated Use AuthContext's register method instead
 */
export const register = async (username, email, password, invitation_code) => {
  console.warn('Deprecated: Use AuthContext.register instead');
  try {
    const response = await axios.post(`${API_URL}/auth/register`,
      { username, email, password, invitation_code },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * @deprecated Use AuthContext's isAdmin property instead
 */
export const isAdmin = async () => {
  console.warn('Deprecated: Use AuthContext.isAdmin instead');
  try {
    const response = await axios.get(`${API_URL}/auth/is-admin`, {
      withCredentials: true,
      timeout: 5000 // 5 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * @deprecated Use AuthContext's logout method instead
 */
export const logout = async () => {
  console.warn('Deprecated: Use AuthContext.logout instead');
  try {
    await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

/**
 * @deprecated No longer needed as axios interceptors are set up in AuthContext
 */
export const setupAxiosInterceptors = () => {
  console.warn('Deprecated: Axios interceptors are now set up in AuthContext');
};
