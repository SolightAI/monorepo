import React from 'react';
import { ChevronRight, MessageSquare, Shield, Zap } from 'lucide-react';

const SolightLanding = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <svg viewBox="0 0 100 100" className="w-10 h-10">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#0066FF" strokeWidth="8" />
            <path d="M30 50 L70 50" stroke="#0066FF" strokeWidth="8" strokeLinecap="round" />
          </svg>
          <span className="ml-2 text-2xl font-bold text-gray-900">Solight</span>
        </div>
        <button className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
          Contact Us
        </button>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 pt-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              World's First AdTech Leveraging LLM Outputs
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              As Artificial Intelligence revolutionizes the way consumers interact with information,
              we're enabling advertisers to reach consumers on LLM applications with highly relevant,
              non-obtrusive media opportunities.
            </p>
            <button className="px-8 py-3 bg-blue-600 text-white rounded-full text-lg hover:bg-blue-700 transition-colors flex items-center">
              Get Started
              <ChevronRight className="ml-2" />
            </button>
          </div>
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-xl p-4 max-w-sm mx-auto">
              <div className="bg-blue-600 rounded-2xl p-4 text-white mb-4">
                <p>What is the weather in Lisbon?</p>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4 mb-4">
                <p>The weather in Lisbon is 32 degrees.</p>
              </div>
              <div className="bg-blue-100 rounded-2xl p-4">
                <p className="text-sm text-gray-800">
                  Sunscreen is essential to protect your skin in this kind of weather.
                </p>
                <div className="mt-2 text-xs text-blue-600">Sponsored</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">Enabling ads for LLM applications</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Native Integration</h3>
              <p className="text-gray-600">
                Seamlessly integrate advertising within LLM conversations
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Real-time Targeting</h3>
              <p className="text-gray-600">
                Deliver relevant ads based on conversation context
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Privacy First</h3>
              <p className="text-gray-600">
                Non-obtrusive advertising respecting user privacy
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-8">
            The internet is changing and Solight is powering the change.
          </h2>
          <button className="px-8 py-3 bg-white text-blue-600 rounded-full text-lg hover:bg-gray-100 transition-colors">
            Join the Revolution
          </button>
        </div>
      </div>
    </div>
  );
};

export default SolightLanding;
