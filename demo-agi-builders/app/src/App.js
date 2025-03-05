import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import './App.css';
import MainPage from './pages/MainPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<MainPage />} />
        </Routes>
      </div>
      <Analytics />
    </BrowserRouter>
  );
}

export default App;
