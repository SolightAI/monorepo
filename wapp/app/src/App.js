import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import MainPage from './pages/MainPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import GoogleCallback from './components/GoogleCallback';
import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import Settings from './pages/Settings';
import AdminInvitations from './pages/AdminInvitations';
import { isAdmin, setupAxiosInterceptors } from './utils/auth';

const isAuthenticated = () => {
  return localStorage.getItem('isAuthenticated') === 'true';
};

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// AdminRoute component - checks both authentication and admin status
const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  if (loading) {
    // Show loading indicator while checking admin status
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!isUserAdmin) {
    // Redirect non-admin authenticated users to main page with message
    return <Navigate to="/" state={{ message: "You need admin privileges to access that page" }} replace />;
  }

  return children;
};

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Set up axios interceptors for handling auth errors
    setupAxiosInterceptors();

    // Check if the user has completed onboarding before
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    if (!hasCompletedOnboarding) {
      // Show onboarding for new users
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = (userData) => {
    // Save onboarding completion status
    localStorage.setItem('onboardingCompleted', 'true');

    // If userData was provided, save it
    if (userData) {
      localStorage.setItem('userData', JSON.stringify(userData));
    }

    // Hide the onboarding flow
    setShowOnboarding(false);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          <Route path="/" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin/invitations" element={<AdminRoute><AdminInvitations /></AdminRoute>} />
          <Route path="/the-predictive-index" element={<MainPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />} */}
      </div>
    </BrowserRouter>
  );
}

export default App;
