import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import NotFound from './pages/common/NotFound';
import Layout from './components/layout/Layout';
import Settings from './pages/user/Settings';
import AdminInvitations from './pages/admin/AdminInvitations';
import OrganizationCreate from './pages/organization/OrganizationCreate';
import OrganizationDashboard from './pages/organization/OrganizationDashboard';
import JoinOrganization from './pages/organization/JoinOrganization';
import TestCredentials from './pages/product/TestCredentials';
import TestsTable from './pages/product/TestsTable';
import { ProductProvider } from './context/ProductContext';
import { OrganizationProvider } from './context/OrganizationContext';
import { SecretProvider } from './context/SecretContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OnboardingProvider } from './context/OnboardingContext';
import OnboardingModal from './components/onboarding/OnboardingModal';
import { disableBodyScroll } from './utils/modalUtils';
import { Home } from './pages/demo/Home';
import { Results } from './pages/demo/Results';
import { Processor } from './pages/demo/Processor';
import { DemoLayout } from './components/layout/DemoLayout';


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
  // OnboardingProvider now manages the onboarding state
  // We can still access onboarding state from Auth context, but it's mainly handled by OnboardingProvider

  // Detect if any modal is open by checking for elements with modal class
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const modalElements = document.querySelectorAll('.fixed.inset-0');
      disableBodyScroll(modalElements.length > 0);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      disableBodyScroll(false);
    };
  }, []);

  return (
    <OnboardingProvider>
      <OrganizationProvider>
        <ProductProvider>
          <SecretProvider>
            {/* Render OnboardingModal at the top level */}
            <OnboardingModal />

            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/auth/callback" element={<OAuthCallbackPage />} />
                <Route path="/join-organization/:code" element={<JoinOrganization />} />

                {/* Demo routes */}
                <Route path="/demo/*" element={<DemoLayout />}>
                  <Route index element={<Home />} />
                  <Route path={"processing"} element={<Processor />} />
                  <Route path="results" element={<Results />} />
                </Route>

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

                  {/* Test table page */}
                  <Route path="/" element={<Navigate to="/tests" replace />} />  {/* Redirects to /tests*/}

                  {/* TestCredentials Management page */}
                  <Route path="/secrets" element={<TestCredentials />} />
                  {/* Tests Table page */}
                  <Route path="/tests" element={<TestsTable />} />
                  {/* Organization routes */}
                  <Route path="/organizations/dashboard" element={<OrganizationDashboard />} />
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
    </OnboardingProvider>
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
