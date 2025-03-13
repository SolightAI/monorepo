import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
import ProductSelector from './ProductSelector';
import OrganizationSelector from './OrganizationSelector';
import { logout } from '@/utils/auth';
import NavigationTree from './NavigationTree';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { selectedProduct } = useProduct();
  const { selectedOrganization } = useOrganization();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-3 mx-auto pr-4 sm:pr-6 lg:pr-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Organization selector at leftmost position */}
              <div className="hidden md:block">
                <OrganizationSelector />
              </div>
              <div className="flex-shrink-0 flex items-center ml-4">
                <Link to="/" className="font-bold text-xl text-gray-800">
                  Laneo
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <ProductSelector />
              </div>
              <div className="ml-2 p-2">
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
              <div className="md:hidden flex items-center">
                <button
                  onClick={toggleSidebar}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                >
                  <Menu className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-grow flex">
        {/* Mobile sidebar - shown when sidebar is open */}
        {isSidebarOpen && (
          <div className="fixed inset-0 flex z-40 md:hidden">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={toggleSidebar}
            ></div>
            <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white">
              <div className="px-4 mb-2">
                <OrganizationSelector isMobile={true} />
              </div>
              <div className="px-4 mb-4">
                <ProductSelector isMobile={true} />
              </div>
              <div className="flex-1 h-0 overflow-y-auto bg-white">
                <NavigationTree />
              </div>
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col flex-grow border-r border-gray-200 pt-5 bg-white overflow-y-auto">
              <div className="flex-grow flex flex-col">
                <NavigationTree />
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
