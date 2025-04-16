import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Beaker, Key } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';

// Icon mapping for different item types
const getIconForType = (type) => {
  switch (type) {
    case 'test':
      return <Beaker size={16} className="text-green-500" />;
    case 'secrets':
      return <Key size={16} className="text-amber-500" />;
    default:
      return null;
  }
};

const NavigationTree = () => {
  const location = useLocation();
  const { selectedOrganization } = useOrganization();

  return (
    <nav className="w-full p-2">

      {/* Tests Table Link */}
      {selectedOrganization && (
        <div className="pt-2">
          <Link
            to="/tests"
            className={`flex items-center text-sm px-3 py-2 rounded-md ${
              location.pathname.startsWith('/tests')
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {getIconForType('test')}
            <span className="ml-2">Tests</span>
          </Link>
        </div>
      )}

      {/* TestCredentials Management Link */}
      {selectedOrganization && (
        <div className="pt-2">
          <Link
            to="/secrets"
            className={`flex items-center text-sm px-3 py-2 rounded-md ${
              location.pathname.startsWith('/secrets')
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {getIconForType('secrets')}
            <span className="ml-2">Test Credentials</span>
          </Link>
        </div>
      )}

    </nav>
  );
};

export default NavigationTree;
