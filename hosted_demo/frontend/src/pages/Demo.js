import React, { useState, useRef, useEffect } from 'react';
import { ChatInterface } from '../components/CustomChatbot/Chatbot';
import { motion } from 'framer-motion';

const socketUrl = process.env.REACT_APP_DEMO_INFERENCE_WEBSOCKET_URL || 'wss://default.url/ws';

const DemoSection = () => {
  const [adType, setAdType] = useState('native');

  const [nativeHistory, setNativeHistory] = useState([]);
  const [boxedHistory, setBoxedHistory] = useState([]);
  const [queriesHistory, setQueriesHistory] = useState([]);
  
  const [nativeNewMessage, setNativeNewMessage] = useState({ content: '' });
  const [boxedNewMessage, setBoxedNewMessage] = useState({ content: '' });
  const [queriesNewMessage, setQueriesNewMessage] = useState({ content: '' });

  const nativeHistoryRef = useRef(nativeHistory);
  const boxedHistoryRef = useRef(boxedHistory);
  const queriesHistoryRef = useRef(queriesHistory);
  
  const nativeNewMessageRef = useRef(nativeNewMessage);
  const boxedNewMessageRef = useRef(boxedNewMessage);
  const queriesNewMessageRef = useRef(queriesNewMessage);

  useEffect(() => {
    nativeHistoryRef.current = nativeHistory;
    boxedHistoryRef.current = boxedHistory;
    queriesHistoryRef.current = queriesHistory;
    
    nativeNewMessageRef.current = nativeNewMessage;
    boxedNewMessageRef.current = boxedNewMessage;
    queriesNewMessageRef.current = queriesNewMessage;
  }, [nativeHistory, boxedHistory, queriesHistory, nativeNewMessage, boxedNewMessage, queriesNewMessage]);

  const AdTypeButton = ({ type, label, icon }) => (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setAdType(type)}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
        ${adType === type 
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30' 
          : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400'}
      `}
    >
      {icon}
      {label}
    </motion.button>
  );

  return (
    <section className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text mb-6">
            Experience the Future of AI Advertising
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover how our platform seamlessly integrates intelligent advertising into AI conversations,
            creating natural and engaging user experiences.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <AdTypeButton 
                type="native" 
                label="Native Ads"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              />
              <AdTypeButton 
                type="boxed" 
                label="Boxed Ads"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
              />
              <AdTypeButton 
                type="queries" 
                label="Smart Queries"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl transform -rotate-1" />
              <div className="relative bg-white rounded-xl shadow-sm p-4">
                {adType === 'native' && (
                  <ChatInterface 
                    title="Native Advertising" 
                    socketUrl={`${socketUrl}/native`}
                    history={nativeHistory}
                    setHistory={setNativeHistory}
                    newMessage={nativeNewMessage}
                    setNewMessage={setNativeNewMessage}
                    historyRef={nativeHistoryRef}
                    newMessageRef={nativeNewMessageRef}
                    showQueries={false}
                  />
                )}
                {adType === 'boxed' && (
                  <ChatInterface 
                    title="Boxed Advertising" 
                    socketUrl={`${socketUrl}/boxed`}
                    history={boxedHistory}
                    setHistory={setBoxedHistory}
                    newMessage={boxedNewMessage}
                    setNewMessage={setBoxedNewMessage}
                    historyRef={boxedHistoryRef}
                    newMessageRef={boxedNewMessageRef}
                    showQueries={false}
                  />
                )}
                {adType === 'queries' && (
                  <ChatInterface 
                    title="Smart Queries" 
                    socketUrl={`${socketUrl}/queries`}
                    history={queriesHistory}
                    setHistory={setQueriesHistory}
                    newMessage={queriesNewMessage}
                    setNewMessage={setQueriesNewMessage}
                    historyRef={queriesHistoryRef}
                    newMessageRef={queriesNewMessageRef}
                    showQueries={true}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default function Demo() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/80 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="https://i.ibb.co/rv8yHK6/laneo-black.png" alt="Laneo" className="h-8 w-8" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
                Laneo
              </span>
            </div>
            <nav className="flex items-center space-x-8">
              {/* <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://docs.laneo.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 font-medium"
              >
                Documentation
              </motion.a>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg shadow-blue-500/30"
              >
                Get Started
              </motion.button> */}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        <DemoSection />
      </main>

      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">© 2024 Laneo. All rights reserved.</p>
            <div className="flex space-x-6">
              {/* <a href="#" className="text-gray-500 hover:text-blue-600">Privacy Policy</a>
              <a href="#" className="text-gray-500 hover:text-blue-600">Terms of Service</a>
              <a href="#" className="text-gray-500 hover:text-blue-600">Contact</a> */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
