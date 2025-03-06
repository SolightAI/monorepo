import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import MainPage from './pages/MainPage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import GoogleCallback from './components/GoogleCallback';
import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import Settings from './pages/Settings';

const isAuthenticated = () => {
  return localStorage.getItem('isAuthenticated') === 'true';
};

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
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

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<MainPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="/the-predictive-index" element={<MainPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      </div>
    </BrowserRouter>
  );
}

export default App;
