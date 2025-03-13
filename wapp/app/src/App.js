import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import ProductOverview from './pages/product/ProductOverview';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';
import GoogleCallback from './components/auth/GoogleCallback';
import NotFound from './pages/common/NotFound';
import Layout from './components/layout/Layout';
import Settings from './pages/user/Settings';
import AdminInvitations from './pages/admin/AdminInvitations';
import OrganizationCreate from './pages/organization/OrganizationCreate';
import OrganizationDashboard from './pages/organization/OrganizationDashboard';
import OrganizationMembers from './pages/organization/OrganizationMembers';
import JoinOrganization from './pages/organization/JoinOrganization';
import Dashboard from './pages/Dashboard';
import { isAdmin, setupAxiosInterceptors } from './utils/auth';
import Home from './pages/common/Home';
import EpicDetails from './pages/product/EpicDetails';
import FeatureDetails from './pages/product/FeatureDetails';
import UserStoryDetails from './pages/product/UserStoryDetails';
import AcceptanceCriteriaDetails from './pages/product/AcceptanceCriteriaDetails';
import { ProductProvider } from './context/ProductContext';
import { OrganizationProvider } from './context/OrganizationContext';
import { DashboardProvider } from './context/DashboardContext';

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
      <OrganizationProvider>
        <ProductProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/auth/google/callback" element={<GoogleCallback />} />
              <Route path="/join-organization/:code" element={<JoinOrganization />} />

              {/* Organization Setup Route */}
              <Route path="/organizations/create" element={
                <ProtectedRoute>
                  <OrganizationCreate />
                </ProtectedRoute>
              } />
              <Route path="/organization/create" element={
                <ProtectedRoute>
                  <OrganizationCreate />
                </ProtectedRoute>
              } />

              {/* Protected routes with Layout */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                {/* Home page showing epics of selected product */}
                <Route path="/" element={<Home />} />

                {/* Dashboard Routes */}
                <Route path="/dashboard" element={
                  <DashboardProvider>
                    <Dashboard />
                  </DashboardProvider>
                } />
                <Route path="/dashboard/product/:productId" element={
                  <DashboardProvider>
                    <Dashboard />
                  </DashboardProvider>
                } />

                {/* Epic details page */}
                <Route path="/epics/:epicId" element={<EpicDetails />} />
                {/* Feature details page */}
                <Route path="/features/:featureId" element={<FeatureDetails />} />
                {/* User Story details page */}
                <Route path="/user-stories/:storyId" element={<UserStoryDetails />} />
                {/* Acceptance Criteria details page */}
                <Route path="/acceptance-criteria/:criteriaId" element={<AcceptanceCriteriaDetails />} />
                {/* Organization routes */}
                <Route path="/organizations/dashboard" element={<OrganizationDashboard />} />
                <Route path="/organizations/members" element={<OrganizationMembers />} />
                {/* Other protected routes */}
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* Admin routes with Layout */}
              <Route element={<AdminRoute><Layout /></AdminRoute>}>
                <Route path="/admin/invitations" element={<AdminInvitations />} />
              </Route>

              {/* Dynamic route for product paths */}
              <Route path="/:productPath" element={<ProductOverview />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </ProductProvider>
      </OrganizationProvider>
    </BrowserRouter>
  );
}

export default App;
