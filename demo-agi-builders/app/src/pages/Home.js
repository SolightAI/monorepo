import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Target, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AnimatedBackground from '../components/AnimatedBackground';

const formatBudget = (budget) => {
  const numBudget = Number(budget);
  return !isNaN(numBudget) ? numBudget.toLocaleString() : budget;
};

const Home = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/campaign/`, {
          withCredentials: true,
        });

        setCampaigns(response.data);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        // You might want to add error state handling here
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const handleCampaignClick = (campaignId) => {
    navigate(`/campaigns/${campaignId}`);
  };

  const handleCreateCampaign = () => {
    navigate('/campaigns/new');
  };

  return (
    <div className="relative min-h-screen bg-gray-50 p-6">
      <AnimatedBackground theme="light" />
      <div className="relative z-10">
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600">Welcome back! Here's your campaign performance at a glance.</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Impressions"
            value="2.3M"
            change="+12.5%"
            icon={<BarChart3 className="w-6 h-6" />}
            positive={true}
          />
          <MetricCard
            title="Conversions"
            value="14.2K"
            change="+8.1%"
            icon={<Target className="w-6 h-6" />}
            positive={true}
          />
          <MetricCard
            title="Reach"
            value="892K"
            change="+5.4%"
            icon={<Users className="w-6 h-6" />}
            positive={true}
          />
          <MetricCard
            title="Average CPM"
            value="$4.80"
            change="-2.3%"
            icon={<TrendingUp className="w-6 h-6" />}
            positive={false}
          />
        </div>

        {/* Active Campaigns Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Active Campaigns</h2>
            <button
              onClick={handleCreateCampaign}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-150"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Campaign
            </button>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-4">Loading campaigns...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((campaign) => (
                    <tr 
                      key={campaign.id} 
                      onClick={() => handleCampaignClick(campaign.id)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${campaign.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${formatBudget(campaign.budget)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.performance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, change, icon, positive }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          {icon}
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="flex items-baseline mt-4">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className={`ml-2 text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </p>
      </div>
    </div>
  );
};

export default Home;