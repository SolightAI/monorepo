import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../utils/auth';
import ChangePassword from '../components/ChangePassword';

// Account section (existing code)
const Account = () => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Account</h2>
      <ChangePassword />
      <button
        onClick={handleLogout}
        className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        Logout
      </button>
    </div>
  );
};

// Profile section
const Profile = () => {
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    role: '',
    company: ''
  });

  useEffect(() => {
    // Load user data from localStorage
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      try {
        const parsedData = JSON.parse(storedUserData);
        setUserData({
          name: parsedData.name || '',
          email: parsedData.email || '',
          role: parsedData.role || '',
          company: parsedData.company || ''
        });
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Save updated user data to localStorage
    localStorage.setItem('userData', JSON.stringify(userData));
    // Show success message
    alert('Profile updated successfully!');
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Full Name
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            name="name"
            type="text"
            placeholder="Enter your name"
            value={userData.name}
            onChange={handleChange}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email Address
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={userData.email}
            onChange={handleChange}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">
            Job Role
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="role"
            name="role"
            type="text"
            placeholder="Enter your job role"
            value={userData.role}
            onChange={handleChange}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="company">
            Company
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="company"
            name="company"
            type="text"
            placeholder="Enter your company name"
            value={userData.company}
            onChange={handleChange}
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

// Notifications section
const Notifications = () => {
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    marketing: false,
    updates: true
  });

  const handleToggle = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    // Save notification preferences
    localStorage.setItem('notificationPreferences', JSON.stringify(notifications));
    alert('Notification preferences saved!');
  };

  useEffect(() => {
    // Load notification preferences
    const storedPreferences = localStorage.getItem('notificationPreferences');
    if (storedPreferences) {
      try {
        setNotifications(JSON.parse(storedPreferences));
      } catch (e) {
        console.error('Error parsing notification preferences:', e);
      }
    }
  }, []);

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800">Email Notifications</h3>
            <p className="text-sm text-gray-500">Receive email updates about your campaigns</p>
          </div>
          <div className="relative inline-block w-12 align-middle select-none">
            <input
              type="checkbox"
              id="email-notifications"
              checked={notifications.email}
              onChange={() => handleToggle('email')}
              className="sr-only"
            />
            <div className={`block w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${notifications.email ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${notifications.email ? 'transform translate-x-6' : ''}`} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800">Push Notifications</h3>
            <p className="text-sm text-gray-500">Receive alerts when campaigns complete or require action</p>
          </div>
          <div className="relative inline-block w-12 align-middle select-none">
            <input
              type="checkbox"
              id="push-notifications"
              checked={notifications.push}
              onChange={() => handleToggle('push')}
              className="sr-only"
            />
            <div className={`block w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${notifications.push ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${notifications.push ? 'transform translate-x-6' : ''}`} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800">Marketing Emails</h3>
            <p className="text-sm text-gray-500">Receive marketing and promotional materials</p>
          </div>
          <div className="relative inline-block w-12 align-middle select-none">
            <input
              type="checkbox"
              id="marketing-emails"
              checked={notifications.marketing}
              onChange={() => handleToggle('marketing')}
              className="sr-only"
            />
            <div className={`block w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${notifications.marketing ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${notifications.marketing ? 'transform translate-x-6' : ''}`} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800">Product Updates</h3>
            <p className="text-sm text-gray-500">Receive notifications about new features and improvements</p>
          </div>
          <div className="relative inline-block w-12 align-middle select-none">
            <input
              type="checkbox"
              id="product-updates"
              checked={notifications.updates}
              onChange={() => handleToggle('updates')}
              className="sr-only"
            />
            <div className={`block w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${notifications.updates ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${notifications.updates ? 'transform translate-x-6' : ''}`} />
          </div>
        </div>
      </div>
      <button
        onClick={handleSave}
        className="mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        Save Preferences
      </button>
    </div>
  );
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1); // Navigate back to the previous page
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex items-center mb-6">
        <button
          onClick={handleBack}
          className="mr-4 text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'account' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('account')}
        >
          Account
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'notifications' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
      </div>

      {activeTab === 'profile' && <Profile />}
      {activeTab === 'account' && <Account />}
      {activeTab === 'notifications' && <Notifications />}
    </div>
  );
}
