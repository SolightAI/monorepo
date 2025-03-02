import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import VerificationBanner from './VerificationBanner';
import FeedbackButton from './FeedbackButton';

export default function Layout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-grow p-4 md:ml-64 transition-all duration-300 ease-in-out pt-16 md:pt-4">
        <VerificationBanner />
        <Outlet />
        <FeedbackButton />
      </main>
    </div>
  );
}
