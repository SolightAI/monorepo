import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../utils/auth';
import ChangePassword from '../components/ChangePassword';


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


export default function Settings() {

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Account />

    </div>
  );
}
