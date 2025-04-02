import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FAQ from './pages/FAQ';
import NotFound from './pages/NotFound';
import Landing from './pages/Landing';
import Privacy from './pages/Privacy';
import AboutUs from './pages/AboutUs';
import DomainLanding from './pages/DomainLanding';
import DomainPage from './pages/DomainPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/domains" element={<DomainLanding />} />
        <Route path="/:domainRoute" element={<DomainPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
