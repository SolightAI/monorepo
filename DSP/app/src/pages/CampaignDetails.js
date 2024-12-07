import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  Settings,
  BarChart3,
  Target,
  Users,
  DollarSign,
  Share2,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  Tag,
  Calendar,
  TrendingUp,
  AlertCircle,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Image as ImageIcon,
  Video,
  FileText,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CampaignDetails = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const campaign = campaigns.find(c => c.id === parseInt(id));

  if (!campaign) {
    return (
      <div className="p-6">
        <div className="text-center">Campaign not found</div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'targeting', label: 'Targeting' },
    { id: 'budget', label: 'Budget & Schedule' },
    { id: 'creatives', label: 'Creatives' },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md mb-2 transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
        </div>
        <div className="flex gap-3">
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              campaign.status === 'Active' 
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {campaign.status === 'Active' ? (
              <><Pause className="w-4 h-4 inline mr-2" />Pause Campaign</>
            ) : (
              <><Play className="w-4 h-4 inline mr-2" />Resume Campaign</>
            )}
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
            <Settings className="w-4 h-4 inline mr-2" />Edit Campaign
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <QuickStat 
          label="Total Spend"
          value={`$${campaign.spend}`}
          change="+12.3%"
          icon={<DollarSign />}
        />
        <QuickStat 
          label="Impressions"
          value="1.2M"
          change="+8.1%"
          icon={<Share2 />}
        />
        <QuickStat 
          label="Clicks"
          value="45.2K"
          change="+15.4%"
          icon={<Target />}
        />
        <QuickStat 
          label="CTR"
          value="3.75%"
          change="+2.1%"
          icon={<BarChart3 />}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Details</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Status</h4>
                      <span className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        campaign.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Daily Budget</h4>
                      <p className="mt-1 text-sm text-gray-900">${campaign.budget}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Campaign Duration</h4>
                      <p className="mt-1 text-sm text-gray-900">Jan 1, 2024 - Mar 31, 2024</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Target Audience</h4>
                      <p className="mt-1 text-sm text-gray-900">Males, 25-34, Interest in Technology</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Average CPC</h4>
                      <p className="mt-1 text-sm text-gray-900">$1.24</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Conversion Rate</h4>
                      <p className="mt-1 text-sm text-gray-900">2.8%</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">ROAS</h4>
                      <p className="mt-1 text-sm text-gray-900">3.2x</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Chart</h3>
                <div className="bg-gray-50 rounded-lg h-80 flex items-center justify-center">
                  {/* Add your chart component here */}
                  <p className="text-gray-500">Performance chart placeholder</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'targeting' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Demographics Section */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center mb-4">
                  <Users className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Demographics</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Age Range</h4>
                    <div className="flex flex-wrap gap-2">
                      {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map((age) => (
                        <span key={age} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {age}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Gender</h4>
                    <div className="flex gap-2">
                      {['Male', 'Female', 'Other'].map((gender) => (
                        <span key={gender} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {gender}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Household Income</h4>
                    <div className="flex flex-wrap gap-2">
                      {['$0-50K', '$50K-100K', '$100K-150K', '$150K+'].map((income) => (
                        <span key={income} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {income}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Targeting */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center mb-4">
                  <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Location</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Countries</h4>
                    <div className="flex flex-wrap gap-2">
                      {['United States', 'Canada', 'United Kingdom'].map((country) => (
                        <span key={country} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {country}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Cities</h4>
                    <div className="flex flex-wrap gap-2">
                      {['New York', 'Los Angeles', 'Chicago', 'Houston'].map((city) => (
                        <span key={city} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {city}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interests & Behaviors */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center mb-4">
                  <Tag className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Interests & Behaviors</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {['Technology', 'Gaming', 'Sports', 'Fashion', 'Travel', 'Food'].map((interest) => (
                        <span key={interest} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Purchase Intent</h4>
                    <div className="flex flex-wrap gap-2">
                      {['In-Market', 'Recent Searchers', 'Cart Abandoners'].map((intent) => (
                        <span key={intent} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {intent}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Targeting */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center mb-4">
                  <Monitor className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Technical Targeting</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Devices</h4>
                    <div className="flex gap-2">
                      {[
                        { label: 'Desktop', icon: <Monitor className="w-4 h-4" /> },
                        { label: 'Mobile', icon: <Smartphone className="w-4 h-4" /> },
                        { label: 'Tablet', icon: <Tablet className="w-4 h-4" /> }
                      ].map((device) => (
                        <span key={device.label} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                          {device.icon} {device.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Browsers</h4>
                    <div className="flex flex-wrap gap-2">
                      {['Chrome', 'Safari', 'Firefox', 'Edge'].map((browser) => (
                        <span key={browser} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {browser}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Type</h4>
                    <div className="flex flex-wrap gap-2">
                      {['Wifi', '4G', '5G', 'Broadband'].map((connection) => (
                        <span key={connection} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {connection}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Budget Configuration */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center mb-4">
                  <DollarSign className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Budget Configuration</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Total Campaign Budget</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input
                          type="text"
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md"
                          value="50,000"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">$23,450 remaining</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Daily Budget Limit</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input
                          type="text"
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md"
                          value="2,500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Bidding Strategy</h4>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                      <option>CPM (Cost per Thousand Impressions)</option>
                      <option>CPC (Cost per Click)</option>
                      <option>CPA (Cost per Acquisition)</option>
                      <option>ROAS (Return on Ad Spend)</option>
                    </select>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Max Bid</h4>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <input
                        type="text"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md"
                        value="12.50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Configuration */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center mb-4">
                  <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Campaign Schedule</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Campaign Duration</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value="2024-03-15"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value="2024-06-15"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Day Parting</h4>
                    <div className="border border-gray-200 rounded-md p-4">
                      <div className="grid grid-cols-8 gap-2 text-center text-xs font-medium">
                        <div className="col-span-2">Time</div>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                          <div key={day}>{day}</div>
                        ))}
                      </div>
                      <div className="mt-2 space-y-1">
                        {['00:00-06:00', '06:00-12:00', '12:00-18:00', '18:00-24:00'].map(timeSlot => (
                          <div key={timeSlot} className="grid grid-cols-8 gap-2">
                            <div className="col-span-2 text-xs">{timeSlot}</div>
                            {[1, 2, 3, 4, 5, 6, 7].map(day => (
                              <div key={day} className="flex items-center justify-center">
                                <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Settings */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center mb-4">
                  <Sliders className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Delivery Settings</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Pacing</h4>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                      <option>Even (Standard)</option>
                      <option>Accelerated</option>
                      <option>Front-loaded</option>
                      <option>Custom</option>
                    </select>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Frequency Capping</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                          value="5"
                        />
                        <span className="text-sm text-gray-600">impressions per</span>
                        <select className="px-3 py-2 border border-gray-300 rounded-md bg-white">
                          <option>Day</option>
                          <option>Week</option>
                          <option>Month</option>
                        </select>
                        <span className="text-sm text-gray-600">per user</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Allocation */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Budget Allocation</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Display Ads</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value="40"
                        className="w-32"
                      />
                      <span className="text-sm text-gray-600">40%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Video Ads</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value="35"
                        className="w-32"
                      />
                      <span className="text-sm text-gray-600">35%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Native Ads</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value="25"
                        className="w-32"
                      />
                      <span className="text-sm text-gray-600">25%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'creatives' && (
          <div className="p-6">
            {/* Creatives Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Ad Creatives</h3>
                <p className="text-sm text-gray-500">Manage your campaign creatives</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Creative
                </button>
              </div>
            </div>

            {/* Creative Type Filters */}
            <div className="flex gap-4 mb-6">
              {[
                { icon: ImageIcon, label: 'Display Ads (4)', active: true },
                { icon: Video, label: 'Video Ads (2)', active: false },
                { icon: FileText, label: 'Native Ads (3)', active: false },
              ].map((type) => (
                <button
                  key={type.label}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                    type.active 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <type.icon className="w-4 h-4 mr-2" />
                  {type.label}
                </button>
              ))}
            </div>

            {/* Creatives Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Display Ad Creative Cards */}
              {displayAds.map((ad) => (
                <div key={ad.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Creative Preview */}
                  <div className="aspect-video bg-gray-100 relative">
                    <img 
                      src={ad.preview} 
                      alt={ad.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      {ad.status === 'Active' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-md flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Creative Info */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{ad.name}</h4>
                        <p className="text-sm text-gray-500">{ad.size} • {ad.format}</p>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-1 text-gray-400 hover:text-gray-500">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-500">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-3 gap-4 py-2 border-t border-gray-100 mt-2">
                      <div>
                        <p className="text-xs text-gray-500">Impressions</p>
                        <p className="font-medium">{ad.impressions}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">CTR</p>
                        <p className="font-medium">{ad.ctr}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Conversions</p>
                        <p className="font-medium">{ad.conversions}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Upload Creative Modal - Add this component later */}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="p-6">
            {/* Analytics Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Campaign Analytics</h3>
                <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </button>
                <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
                <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Performance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <AnalyticsStat
                label="Total Impressions"
                value="1.2M"
                change="+12.3%"
                trend="up"
                subtext="vs. last period"
              />
              <AnalyticsStat
                label="Click-Through Rate"
                value="3.75%"
                change="-0.8%"
                trend="down"
                subtext="vs. last period"
              />
              <AnalyticsStat
                label="Conversion Rate"
                value="2.1%"
                change="+1.4%"
                trend="up"
                subtext="vs. last period"
              />
              <AnalyticsStat
                label="Cost per Conversion"
                value="$12.40"
                change="-2.3%"
                trend="up"
                subtext="vs. last period"
              />
            </div>

            {/* Detailed Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Key Performance Metrics</h4>
                <div className="space-y-4">
                  {[
                    { label: 'Cost per Mile (CPM)', value: '$4.20', change: '+5.2%' },
                    { label: 'Cost per Click (CPC)', value: '$0.85', change: '-2.1%' },
                    { label: 'Click-through Rate (CTR)', value: '3.75%', change: '+0.8%' },
                    { label: 'Conversion Rate', value: '2.1%', change: '+1.4%' },
                    { label: 'Return on Ad Spend (ROAS)', value: '3.2x', change: '+0.5x' },
                  ].map((metric) => (
                    <div key={metric.label} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{metric.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{metric.value}</span>
                        <span className={`text-sm ${
                          metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {metric.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audience Insights */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Audience Insights</h4>
                <div className="space-y-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Age Distribution</h5>
                    <div className="space-y-2">
                      {[
                        { age: '18-24', percentage: 15 },
                        { age: '25-34', percentage: 35 },
                        { age: '35-44', percentage: 25 },
                        { age: '45-54', percentage: 15 },
                        { age: '55+', percentage: 10 },
                      ].map((group) => (
                        <div key={group.age} className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 w-16">{group.age}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${group.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12">{group.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Device Performance */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Device Performance</h4>
                <div className="space-y-4">
                  {[
                    { device: 'Desktop', impressions: '520K', clicks: '18.2K', conversions: '850' },
                    { device: 'Mobile', impressions: '580K', clicks: '22.5K', conversions: '920' },
                    { device: 'Tablet', impressions: '100K', clicks: '4.5K', conversions: '180' },
                  ].map((device) => (
                    <div key={device.device} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{device.device}</span>
                      <div className="grid grid-cols-3 gap-8">
                        <div className="text-right">
                          <div className="text-sm font-medium">{device.impressions}</div>
                          <div className="text-xs text-gray-500">Impressions</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{device.clicks}</div>
                          <div className="text-xs text-gray-500">Clicks</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{device.conversions}</div>
                          <div className="text-xs text-gray-500">Conversions</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographic Performance */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Geographic Performance</h4>
                <div className="space-y-4">
                  {[
                    { location: 'United States', impressions: '800K', ctr: '3.8%', conversions: '1.2K' },
                    { location: 'United Kingdom', impressions: '250K', ctr: '3.5%', conversions: '450' },
                    { location: 'Canada', impressions: '150K', ctr: '3.2%', conversions: '280' },
                  ].map((location) => (
                    <div key={location.location} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{location.location}</span>
                      <div className="grid grid-cols-3 gap-8">
                        <div className="text-right">
                          <div className="text-sm font-medium">{location.impressions}</div>
                          <div className="text-xs text-gray-500">Impressions</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{location.ctr}</div>
                          <div className="text-xs text-gray-500">CTR</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{location.conversions}</div>
                          <div className="text-xs text-gray-500">Conversions</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const QuickStat = ({ label, value, change, icon }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
        <div className="p-2 bg-blue-50 rounded-lg">
          {React.cloneElement(icon, { className: "w-4 h-4 text-blue-600" })}
        </div>
      </div>
      <div className="flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className="ml-2 text-sm font-medium text-green-600">{change}</p>
      </div>
    </div>
  );
};

// Add this new component for analytics stats
const AnalyticsStat = ({ label, value, change, trend, subtext }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
        <div className={`flex items-center ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend === 'up' ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          <span className="text-sm font-medium ml-1">{change}</span>
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtext}</p>
    </div>
  );
};

// Sample campaign data
const campaigns = [
  {
    id: 1,
    name: 'Summer Sale 2024',
    status: 'Active',
    budget: '5,000',
    spend: '3,240',
    performance: '+22% CTR',
  },
  {
    id: 2,
    name: 'Brand Awareness',
    status: 'Active',
    budget: '3,500',
    spend: '2,180',
    performance: '+15% Reach',
  },
  {
    id: 3,
    name: 'Product Launch',
    status: 'Paused',
    budget: '2,800',
    spend: '1,950',
    performance: '+8% Conversions',
  },
];

// Add this sample data near your campaigns data
const displayAds = [
  {
    id: 1,
    name: 'Summer Collection Banner',
    size: '728x90',
    format: 'Leaderboard',
    status: 'Active',
    preview: 'https://via.placeholder.com/728x90',
    impressions: '245K',
    ctr: '2.4%',
    conversions: '850'
  },
  {
    id: 2,
    name: 'Product Showcase',
    size: '300x250',
    format: 'Rectangle',
    status: 'Active',
    preview: 'https://via.placeholder.com/300x250',
    impressions: '180K',
    ctr: '1.8%',
    conversions: '620'
  },
  {
    id: 4,
    name: 'Brand Awareness',
    size: '970x250',
    format: 'Billboard',
    status: 'Active',
    preview: 'https://via.placeholder.com/970x250',
    impressions: '95K',
    ctr: '1.9%',
    conversions: '380'
  }
];

export default CampaignDetails; 