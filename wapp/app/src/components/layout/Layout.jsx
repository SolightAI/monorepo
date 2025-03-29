import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useProduct } from '@/context/ProductContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import ProductSelector from './ProductSelector';
import OrganizationSelector from './OrganizationSelector';
import NavigationTree from './NavigationTree';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { selectedProduct } = useProduct();
  const { selectedOrganization } = useOrganization();
  const { logout } = useAuth();
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
            <div className="flex items-center space-x-12">
              <div className="hidden md:block">
                <ProductSelector />
              </div>
              <div className="ml-2 p-2">
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900"
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
        {selectedProduct ? (
          <>
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center relative">
              <div className="absolute -top-32 md:-top-40 lg:-top-48 left-1/2 md:left-[60%] lg:left-[70%] transform -translate-x-1/2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  shapeRendering="geometricPrecision" 
                  textRendering="geometricPrecision" 
                  imageRendering="optimizeQuality" 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  viewBox="0 0 512 442.137"
                  className="h-32 w-32 md:h-40 md:w-40 lg:h-48 lg:w-48 text-blue-600"
                  style={{      
                    transformOrigin: 'center',
                  }}
                >
                  <path fill="currentColor" d="M498.536 0c-31.387 25.229-67.042 47.435-83.064 62.714-5.282 5.036-11.007 12.153-1.664 8.574 25.872-9.91 54.004-27.667 75.003-49.744-2.547 18.498 2.366 41.616 9.997 60.504.939 2.328 3.886 11.918 7.547 15.089 1.358 1.177 2.819 1.472 4.307.179.849-.738 1.28-1.994 1.333-3.706.152-4.983-3.387-19.558-6.693-33.835-4.904-21.183-7.422-37.783-6.766-59.775z"/>
                  <path fill="currentColor" d="M243.828 205.789c4.322 22.157 5.797 44.278 4.95 66.742 45.792-16.983 86.744-47.759 120.988-82.094 41.377-41.487 75.893-91.781 100.677-142.434 7.709-15.756 12.142-22.106 22.781-36.215-19.821 95.783-137.213 251.196-246.698 274.193C232.218 412.974 103.055 495.853 0 401.433c95.353 64.985 210.522 25.748 234.658-113.48-11.685 1.414-23.233 1.218-34.515-.824-26.693-4.83-52.462-12.782-72.736-38.719-28.125-35.979-26.324-94.975 19.286-115.588 54.862-24.791 87.927 25.74 97.135 72.967zm-7.016 67.487c.889-23.575-1.128-48.171-6.111-71.196-8.03-37.107-29.726-69.192-65.407-62.82-22.084 3.943-35.695 18.675-40.56 38.116-17.522 70.029 62.617 107.875 112.078 95.9z"/>
                </svg>
              </div>
              <h2 className="text-6xl md:text-8xl lg:text-8xl font-semibold text-gray-900 mb-4">
                Create your first <br/><span className="text-blue-600">product</span>
              </h2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
