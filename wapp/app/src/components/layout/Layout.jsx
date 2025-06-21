import React, { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Menu, ChevronRight } from "lucide-react";
import { useProduct } from "@/context/ProductContext";
import { useOrganization } from "@/context/OrganizationContext";
import { useAuth } from "@/context/AuthContext";
import { useSecret } from "@/context/SecretContext";
import ProductSelector from "./ProductSelector";
import OrganizationSelector from "./OrganizationSelector";
import NavigationTree from "./NavigationTree";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    selectedProduct,
    loading: isProductLoading,
    products,
    refreshProducts,
  } = useProduct();
  const {
    selectedOrganization,
    loading: isOrganizationLoading,
    organizations,
  } = useOrganization();
  const { secrets, loading: isSecretLoading, fetchSecrets } = useSecret();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch secrets when organization and product are selected
  useEffect(() => {
    if (selectedOrganization?.id && selectedProduct?.id) {
      fetchSecrets();
    }
  }, [selectedOrganization?.id, selectedProduct?.id, fetchSecrets]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Render the main content based on loading and data states
  const renderMainContent = () => {
    // Show loading state while organizations are being fetched initially
    if (isOrganizationLoading) {
      return <LoadingSpinner />;
    }

    // Only show create organization screen after we're sure there's no data
    if (!organizations?.length) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center relative">
            <div className="absolute left-[60%] sm:left-[90%] -top-52 md:-top-40 lg:-top-48 left-1/2 md:left-[20%] lg:left-[10%] transform -translate-x-1/2 md:scale-x-[-1]">
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
                  transformOrigin: "center",
                }}
              >
                <path
                  fill="currentColor"
                  d="M498.536 0c-31.387 25.229-67.042 47.435-83.064 62.714-5.282 5.036-11.007 12.153-1.664 8.574 25.872-9.91 54.004-27.667 75.003-49.744-2.547 18.498 2.366 41.616 9.997 60.504.939 2.328 3.886 11.918 7.547 15.089 1.358 1.177 2.819 1.472 4.307.179.849-.738 1.28-1.994 1.333-3.706.152-4.983-3.387-19.558-6.693-33.835-4.904-21.183-7.422-37.783-6.766-59.775z"
                />
                <path
                  fill="currentColor"
                  d="M243.828 205.789c4.322 22.157 5.797 44.278 4.95 66.742 45.792-16.983 86.744-47.759 120.988-82.094 41.377-41.487 75.893-91.781 100.677-142.434 7.709-15.756 12.142-22.106 22.781-36.215-19.821 95.783-137.213 251.196-246.698 274.193C232.218 412.974 103.055 495.853 0 401.433c95.353 64.985 210.522 25.748 234.658-113.48-11.685 1.414-23.233 1.218-34.515-.824-26.693-4.83-52.462-12.782-72.736-38.719-28.125-35.979-26.324-94.975 19.286-115.588 54.862-24.791 87.927 25.74 97.135 72.967zm-7.016 67.487c.889-23.575-1.128-48.171-6.111-71.196-8.03-37.107-29.726-69.192-65.407-62.82-22.084 3.943-35.695 18.675-40.56 38.116-17.522 70.029 62.617 107.875 112.078 95.9z"
                />
              </svg>
            </div>
            <h2 className="text-6xl md:text-8xl lg:text-8xl font-semibold text-gray-900 mb-4">
              Create your first <br />
              <span className="text-blue-600">organization</span>
            </h2>
          </div>
        </div>
      );
    }

    // Show organization dashboard when on organization routes
    if (location.pathname.startsWith("/organizations/")) {
      return (
        <div className="flex-1 overflow-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </div>
      );
    }

    // Only show create product screen after we're sure there's no data
    if (!isProductLoading && !products?.length) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center relative">
            <div className="absolute -top-32 md:-top-40 lg:-top-48 -rotate-90">
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
                  transformOrigin: "center",
                }}
              >
                <path
                  fill="currentColor"
                  d="M498.536 0c-31.387 25.229-67.042 47.435-83.064 62.714-5.282 5.036-11.007 12.153-1.664 8.574 25.872-9.91 54.004-27.667 75.003-49.744-2.547 18.498 2.366 41.616 9.997 60.504.939 2.328 3.886 11.918 7.547 15.089 1.358 1.177 2.819 1.472 4.307.179.849-.738 1.28-1.994 1.333-3.706.152-4.983-3.387-19.558-6.693-33.835-4.904-21.183-7.422-37.783-6.766-59.775z"
                />
                <path
                  fill="currentColor"
                  d="M243.828 205.789c4.322 22.157 5.797 44.278 4.95 66.742 45.792-16.983 86.744-47.759 120.988-82.094 41.377-41.487 75.893-91.781 100.677-142.434 7.709-15.756 12.142-22.106 22.781-36.215-19.821 95.783-137.213 251.196-246.698 274.193C232.218 412.974 103.055 495.853 0 401.433c95.353 64.985 210.522 25.748 234.658-113.48-11.685 1.414-23.233 1.218-34.515-.824-26.693-4.83-52.462-12.782-72.736-38.719-28.125-35.979-26.324-94.975 19.286-115.588 54.862-24.791 87.927 25.74 97.135 72.967zm-7.016 67.487c.889-23.575-1.128-48.171-6.111-71.196-8.03-37.107-29.726-69.192-65.407-62.82-22.084 3.943-35.695 18.675-40.56 38.116-17.522 70.029 62.617 107.875 112.078 95.9z"
                />
              </svg>
            </div>
            <h2 className="text-6xl md:text-8xl lg:text-8xl font-semibold text-gray-900 mb-4">
              Create your first <br />
              <span className="text-blue-600">product</span>
            </h2>
          </div>
        </div>
      );
    }

    // If we have a product but no secrets, show an arrow to the secrets tab
    if (selectedProduct && !isSecretLoading && secrets?.length === 0 && location.pathname === '/') {
      return (
        <>
          {/* Desktop sidebar */}
          <div className="hidden md:flex md:flex-shrink-0 relative">
            <div className="flex flex-col w-64">
              <div className="flex flex-col flex-grow border-r border-gray-200 pt-5 bg-white overflow-y-auto">
                <div className="flex-grow flex flex-col">
                  <NavigationTree />
                </div>
              </div>
            </div>

            {/* Arrow pointing to the TestCredentials tab */}
            <div className="absolute left-48 top-[140px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                shapeRendering="geometricPrecision"
                textRendering="geometricPrecision"
                imageRendering="optimizeQuality"
                fillRule="evenodd"
                clipRule="evenodd"
                viewBox="0 0 512 442.137"
                className="h-80 w-80 text-blue-600 rotate-[-90deg]"
                style={{
                  transformOrigin: "center",
                }}
              >
                <path
                  fill="currentColor"
                  d="M498.536 0c-31.387 25.229-67.042 47.435-83.064 62.714-5.282 5.036-11.007 12.153-1.664 8.574 25.872-9.91 54.004-27.667 75.003-49.744-2.547 18.498 2.366 41.616 9.997 60.504.939 2.328 3.886 11.918 7.547 15.089 1.358 1.177 2.819 1.472 4.307.179.849-.738 1.28-1.994 1.333-3.706.152-4.983-3.387-19.558-6.693-33.835-4.904-21.183-7.422-37.783-6.766-59.775z"
                />
                <path
                  fill="currentColor"
                  d="M243.828 205.789c4.322 22.157 5.797 44.278 4.95 66.742 45.792-16.983 86.744-47.759 120.988-82.094 41.377-41.487 75.893-91.781 100.677-142.434 7.709-15.756 12.142-22.106 22.781-36.215-19.821 95.783-137.213 251.196-246.698 274.193C232.218 412.974 103.055 495.853 0 401.433c95.353 64.985 210.522 25.748 234.658-113.48-11.685 1.414-23.233 1.218-34.515-.824-26.693-4.83-52.462-12.782-72.736-38.719-28.125-35.979-26.324-94.975 19.286-115.588 54.862-24.791 87.927 25.74 97.135 72.967zm-7.016 67.487c.889-23.575-1.128-48.171-6.111-71.196-8.03-37.107-29.726-69.192-65.407-62.82-22.084 3.943-35.695 18.675-40.56 38.116-17.522 70.029 62.617 107.875 112.078 95.9z"
                />
              </svg>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-6xl md:text-8xl lg:text-8xl font-semibold text-gray-900 mb-4">
                Create your first <br />
                <span className="text-blue-600">secret</span>
              </h2>
            </div>
          </div>
        </>
      );
    }

    return (
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
              {(selectedProduct ||
                location.pathname.startsWith("/organizations/")) && (
                <div className="flex-1 h-0 overflow-y-auto bg-white">
                  <NavigationTree />
                </div>
              )}
            </div>
          </div>
        )}

        {selectedProduct ? (
          <>
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
        ) : isProductLoading ? (
          <LoadingSpinner />
        ) : null}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* Left side - Logo */}
            <div className="flex items-center">
              <Link to="/" className="font-bold text-xl text-gray-800">
                Solight
              </Link>
            </div>

            {/* Center - Navigation Menu */}
            <div className="w-[50%] hidden md:flex items-center space-x-4">
              {/* Organization Dropdown */}
              <div className="relative w-48">
                <OrganizationSelector />
              </div>
              
              {/* Chevron Right */}
              <ChevronRight className="h-4 w-4 text-gray-400" />
              
              {/* Products Dropdown */}
              <div className="relative w-48">
                <ProductSelector />
              </div>
              


            </div>

            {/* Right side - Logout and Mobile Menu */}
            <div className="flex items-center space-x-4">
              {/* Logout Button */}
              <div className="hidden md:block">
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
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
      <div className="flex-grow flex">{renderMainContent()}</div>
    </div>
  );
}
