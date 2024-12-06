import React, {useCallback, useState, useMemo} from 'react';
import { Chatbot } from '../components/Chatbot';
import { ChatInterface } from '../components/CustomChatbot/Chatbot';
import {useAiChatApi} from '@nlux/react';


const socketUrl = process.env.REACT_APP_DEMO_INFERENCE_WEBSOCKET_URL || 'wss://default.url/ws'; // Fallback URL



const DemoSection = () => {

  const api1 = useAiChatApi();
  const api2 = useAiChatApi();
  const api3 = useAiChatApi();
  const api4 = useAiChatApi();

  const apis = useMemo(() => [
    api1,
    api2,
    api3,
    api4
  ], [api1, api2, api3, api4]);

  const [inputValue, setInputValue] = useState('');
  const [adType, setAdType] = useState('native');

  const handleSubmit = useCallback(() => {
    apis.forEach(api => {
      api.composer.send(inputValue);
    });
    setInputValue('');
  }, [apis, inputValue]);

  const handleAdTypeChange = (e) => {
    setAdType(e.target.value);
  };

  return (
    <section id="samples" className="w-full py-8 md:py-16 lg:py-20 bg-gray-50">
      <div className="container mx-auto space-y-12 px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">

            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-900">
              See How It Works
            </h2>

            <p className="text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Watch how our platform seamlessly integrates ads into AI conversations.
            </p>

            <div className="my-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => setAdType('native')}
                  className={`p-2 border border-gray-300 rounded-lg ${adType === 'native' ? 'bg-blue-500 text-white' : ''}`}
                >
                  Native
                </button>
                <button
                  onClick={() => setAdType('boxed')}
                  className={`p-2 border border-gray-300 rounded-lg ${adType === 'boxed' ? 'bg-blue-500 text-white' : ''}`}
                >
                  Boxed
                </button>
                <button
                  onClick={() => setAdType('queries')}
                  className={`p-2 border border-gray-300 rounded-lg ${adType === 'queries' ? 'bg-blue-500 text-white' : ''}`}
                >
                  Queries
                </button>
                <button
                  onClick={() => setAdType('banners')}
                  className={`p-2 border border-gray-300 rounded-lg ${adType === 'banners' ? 'bg-blue-500 text-white' : ''}`}
                >
                  Banners
                </button>
              </div>
            </div>

            {adType === 'native' && <ChatInterface title="Native Ads" socketUrl={`${socketUrl}/native`} />}
            {adType === 'boxed' && <ChatInterface title="Boxed Ads" socketUrl={`${socketUrl}/boxed`} />}
            {adType === 'queries' && <ChatInterface title="Queries Ads" socketUrl={`${socketUrl}/queries`} />}
            {adType === 'banners' && <ChatInterface title="Banner Ads" socketUrl={`${socketUrl}/banners`} />}

          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
              <div className="w-full aspect-video bg-gray-200" />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};


export default function VideoPlatform() {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center">
        <img src="https://i.ibb.co/rv8yHK6/laneo-black.png" alt="Laneo" className="h-6 w-6" />
        <span className="text-lg font-semibold ml-2">Laneo</span>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a href="#features" className="text-sm font-medium hover:underline underline-offset-4" onClick={(e) => {
            e.preventDefault();
            scrollToSection('features');
          }}>
            Features
          </a>
          <a href="#samples" className="text-sm font-medium hover:underline underline-offset-4" onClick={(e) => {
            e.preventDefault();
            scrollToSection('samples');
          }}>
            Demo
          </a>
        </nav>
      </header>

      <main className="flex-1">

        <DemoSection />

      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500">&copy; 2024 Laneo. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          {/* Footer navigation links can be added here if needed */}
        </nav>
      </footer>
    </div>
  );
}
