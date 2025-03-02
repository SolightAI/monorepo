import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Menu } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/' },
  // Remove the Pricing item
  { name: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-20 md:hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <nav className={`
        fixed left-0 top-0 z-10 h-full w-64 bg-gray-100 p-4 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <h2 className="text-2xl font-bold mb-6 text-center">Laneo</h2>
        <ul className="flex-grow">
          {navItems.map((item) => (
            <li key={item.path} className="mb-2">
              <Link
                to={item.path}
                className={`block p-2 rounded-md transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-200'
                }`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-0 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
