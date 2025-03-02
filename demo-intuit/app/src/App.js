import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import './App.css';

// Page components
import OnboardingUrl from './pages/OnboardingUrl';
import OnboardingType from './pages/OnboardingType';
import UserStoryDetails from './pages/UserStoryDetails';
import SectionDetails from './pages/SectionDetails';
import TestResults from './pages/TestResults';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<OnboardingUrl />} />
          <Route path="/select-type" element={<OnboardingType />} />
          <Route path="/user-story-details" element={<UserStoryDetails />} />
          <Route path="/section-details" element={<SectionDetails />} />
          <Route path="/results" element={<TestResults />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Analytics />
    </BrowserRouter>
  );
}

export default App;
