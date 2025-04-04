import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Success from './pages/Success';
import SimpleLoginPage from './pages/auth/SimpleLoginPage';
import MessyLoginPage from './pages/auth/MessyLoginPage';
import HomePage from './pages/HomePage';

// Import our test pages
import MarketingLanding from './pages/page_category/MarketingLanding';
import TaskManagementApp from './pages/page_category/TaskManagementApp';
import EcommerceHybrid from './pages/page_category/EcommerceHybrid';
import AnalyticsDashboard from './pages/page_category/AnalyticsDashboard';
import BlogLanding from './pages/page_category/BlogLanding';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Home page with test case navigation */}
        <Route path="/" element={<HomePage />} />

        {/* Authentication test routes */}
        <Route path="/auth/email_password/simple" element={<SimpleLoginPage showEmailPassword={true} showGoogleAuth={false} />} />
        <Route path="/auth/email_password/messy" element={<MessyLoginPage showEmailPassword={true} showGoogleAuth={false} />} />
        <Route path="/auth/google/simple" element={<SimpleLoginPage showEmailPassword={false} showGoogleAuth={true} />} />
        <Route path="/auth/google/messy" element={<MessyLoginPage showEmailPassword={false} showGoogleAuth={true} />} />
        <Route path="/auth/staged/simple" element={<SimpleLoginPage showStagedLogin={true} showGoogleAuth={false} />} />
        <Route path="/auth/staged/messy" element={<MessyLoginPage showStagedLogin={true} showGoogleAuth={false} />} />
        <Route path="/auth/combined/simple" element={<SimpleLoginPage showEmailPassword={true} showGoogleAuth={true} />} />
        <Route path="/auth/combined/messy" element={<MessyLoginPage showEmailPassword={true} showGoogleAuth={true} />} />

        {/* Marketing vs Webapp test routes */}
        <Route path="/category/marketing" element={<MarketingLanding />} />
        <Route path="/category/webapp" element={<TaskManagementApp />} />
        <Route path="/category/ecommerce" element={<EcommerceHybrid />} />
        <Route path="/category/analytics" element={<AnalyticsDashboard />} />
        <Route path="/category/blog" element={<BlogLanding />} />

        <Route path="/success" element={<Success />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
