import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import Settings from './pages/Settings';
import Home from './pages/Home';
import { setupAxiosInterceptors } from './utils/auth';
import GoogleCallback from './components/GoogleCallback';
import CampaignDetails from './pages/CampaignDetails';
import CreateCampaign from './pages/CreateCampaign';

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
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="campaigns/new" element={<CreateCampaign />} />
          <Route path="campaigns/:id" element={<CampaignDetails />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}

export default App;
