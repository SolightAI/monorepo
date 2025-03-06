import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { LayoutGrid, Settings as SettingsIcon, LogOut } from 'lucide-react';

const Layout = () => {
  return (
      <main>
        <Outlet />
      </main>
  );
};

export default Layout;