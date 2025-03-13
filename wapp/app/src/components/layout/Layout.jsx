import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Settings as SettingsIcon, LogOut, Home } from 'lucide-react';
import { logout } from '@/utils/auth';
import ProductSelector from './ProductSelector';
import NavigationTree from './NavigationTree';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = async () => {
    await logout();
    // The logout function already redirects to login
  };
  
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-16 md:w-64 bg-white border-r border-gray-200 fixed h-full">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200">
            <div className="hidden md:block">
              <ProductSelector />
            </div>
            <div className="md:hidden flex justify-center">
              <Home size={24} className="text-gray-700" onClick={() => navigate('/')} />
            </div>
          </div>
          
          <nav className="flex-1 pt-4">
            <ul>
              <li>
                <Link 
                  to="/" 
                  className={`flex items-center px-4 py-3 ${isActive('/') ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <Home size={20} className="flex-shrink-0" />
                  <span className="ml-3 hidden md:block">Home</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/settings" 
                  className={`flex items-center px-4 py-3 ${isActive('/settings') ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <SettingsIcon size={20} className="flex-shrink-0" />
                  <span className="ml-3 hidden md:block">Settings</span>
                </Link>
              </li>
            </ul>
          </nav>
          
          <div className="p-4 border-t border-gray-200">
            <button 
              onClick={handleLogout}
              className="flex items-center text-gray-700 hover:text-red-600 w-full"
            >
              <LogOut size={20} className="flex-shrink-0" />
              <span className="ml-3 hidden md:block">Logout</span>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="ml-16 md:ml-64 w-full">
        {/* Navigation Tree (Breadcrumbs) */}
        <NavigationTree />
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
