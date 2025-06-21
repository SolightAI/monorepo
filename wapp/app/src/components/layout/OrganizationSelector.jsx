import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';

/**
 * OrganizationSelector component provides a dropdown to select between different organizations
 * or to create a new organization.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isMobile - Whether the component is rendered in a mobile view
 */
const OrganizationSelector = ({ isMobile = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const {
    organizations,
    selectedOrganization,
    selectOrganization,
    loading,
    error
  } = useOrganization();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle selection of organization
  const handleSelect = (organization) => {
    selectOrganization(organization);
    setIsOpen(false);
  };

  // Handle creating a new organization
  const handleCreateNew = () => {
    navigate('/organizations/create');
    setIsOpen(false);
  };

  // Handle clicking on organization dashboard
  const handleManageOrganizations = () => {
    navigate('/organizations/dashboard');
    setIsOpen(false);
  };

  // Calculate display name
  // Only show 'Loading...' on initial load when organizations array is empty
  const displayName = loading && (!organizations || organizations.length === 0)
    ? 'Loading organizations...'
    : error
    ? 'Error loading organizations'
    : selectedOrganization
    ? selectedOrganization.name
    : (organizations && organizations.length > 0 ? 'Select an organization' : 'No organizations found'); // Handle case where loading is false but no orgs

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium w-full ${
          selectedOrganization
            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <span className="truncate">{displayName}</span>
        <ChevronDown size={16} className="ml-2 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
          ) : error ? (
            <div className="px-4 py-2 text-sm text-red-500">{error}</div>
          ) : (
            <>
              {organizations && organizations.length > 0 ? (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500">
                    Your Organizations
                  </div>
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSelect(org)}
                      className={`block px-4 py-2 text-sm w-full text-left ${
                        selectedOrganization && selectedOrganization.id === org.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No organizations found
                </div>
              )}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={handleCreateNew}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Plus size={16} className="mr-2" />
                  Create new organization
                </button>
                <button
                  onClick={handleManageOrganizations}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Manage organizations
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationSelector;
