import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FAQ from './pages/FAQ';
import NotFound from './pages/NotFound';
import Landing from './pages/Demo';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
