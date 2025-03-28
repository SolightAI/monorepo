import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
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
import Home from './pages/common/Home';
import EpicDetails from './pages/product/EpicDetails';
import FeatureDetails from './pages/product/FeatureDetails';
import Secrets from './pages/product/Secrets';
import TestsTable from './pages/product/TestsTable';
import BugsTable from './pages/product/BugsTable';
import { ProductProvider } from './context/ProductContext';
import { OrganizationProvider } from './context/OrganizationContext';
import { DashboardProvider } from './context/DashboardContext';
import { SecretProvider } from './context/SecretContext';
import { AuthProvider, useAuth } from './context/AuthContext';


// Remove the local isAuthenticated function and use the one from AuthContext instead
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// AdminRoute component - checks both authentication and admin status
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    // Show loading indicator while checking auth status
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    // Redirect non-admin authenticated users to main page with message
    return <Navigate to="/" state={{ message: "You need admin privileges to access that page" }} replace />;
  }

  return children;
};

function AppContent() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if the user has completed onboarding before
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    if (isAuthenticated && !hasCompletedOnboarding) {
      // Show onboarding for new users
      setShowOnboarding(true);
    }
  }, [isAuthenticated]);

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
    <OrganizationProvider>
      <ProductProvider>
        <SecretProvider>
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
                {/* Secrets Management page */}
                <Route path="/secrets" element={<Secrets />} />
                {/* Tests Table page */}
                <Route path="/tests" element={<TestsTable />} />
                {/* Bugs Table page */}
                <Route path="/bugs" element={<BugsTable />} />
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

              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </SecretProvider>
      </ProductProvider>
    </OrganizationProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
