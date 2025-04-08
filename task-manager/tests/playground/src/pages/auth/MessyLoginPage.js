import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/LoginForm';
import GoogleOAuth from '../../components/GoogleOAuth';
import StagedLoginForm from '../../components/StagedLoginForm';
import InstantLoginForm from '../../components/InstantLoginForm';
import LoginWithInstantOption from '../../components/LoginWithInstantOption';

const MessyLoginPage = ({
  showEmailPassword = false,
  showGoogleAuth = false,
  showStagedLogin = false,
  showInstantLogin = false,
  showCombinedInstantLogin = false
}) => {
  const navigate = useNavigate();
  const [counter, setCounter] = useState(0);
  const [fakeNotifications, setFakeNotifications] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showAdditionalPopup, setShowAdditionalPopup] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [maintenanceCountdown, setMaintenanceCountdown] = useState(300);
  const [floatingIcons, setFloatingIcons] = useState([]);
  const [blinkingAlerts, setBlinkingAlerts] = useState([]);
  const [fakeWeather, setFakeWeather] = useState({
    temperature: Math.floor(Math.random() * 30) + 10,
    condition: ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Snowy'][Math.floor(Math.random() * 5)],
    location: ['New York', 'London', 'Tokyo', 'Sydney', 'Paris'][Math.floor(Math.random() * 5)]
  });
  const [uselessStats, setUselessStats] = useState({
    serverLoad: Math.random() * 100,
    connections: Math.floor(Math.random() * 1000),
    sessionTimeout: Math.floor(Math.random() * 60) + 30,
    randomMetric: Math.random().toString(36).substring(2, 8),
    cpuUsage: Math.random() * 100,
    memoryUsage: Math.random() * 100,
    networkLatency: Math.floor(Math.random() * 500),
    databaseQueries: Math.floor(Math.random() * 10000),
    activeSessions: Math.floor(Math.random() * 500),
    pendingRequests: Math.floor(Math.random() * 50),
  });
  const [newsItems] = useState([
    "System upgrade scheduled for next week",
    "New features coming soon",
    "User interface improvements in progress",
    "Security patches have been applied",
    "Database optimization completed",
    "Maintenance planned for tomorrow",
    "System performance improvements",
    "New user registration is temporarily paused",
    "Password policy updated",
    "Session timeout increased to improve user experience"
  ]);
  const [fakeStocks] = useState([
    { symbol: 'AAPL', price: 150 + Math.random() * 20, change: (Math.random() * 5 - 2.5).toFixed(2) },
    { symbol: 'GOOG', price: 2500 + Math.random() * 200, change: (Math.random() * 5 - 2.5).toFixed(2) },
    { symbol: 'MSFT', price: 300 + Math.random() * 30, change: (Math.random() * 5 - 2.5).toFixed(2) },
    { symbol: 'AMZN', price: 3000 + Math.random() * 300, change: (Math.random() * 5 - 2.5).toFixed(2) },
    { symbol: 'FB', price: 250 + Math.random() * 25, change: (Math.random() * 5 - 2.5).toFixed(2) }
  ]);

  useEffect(() => {
    // Check if user is already logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
      navigate('/success');
    }

    // Add useless timer
    const timer = setInterval(() => {
      setCounter(prev => prev + 1);

      // Add random fake notifications
      if (Math.random() > 0.7) {
        setFakeNotifications(prev => [
          ...prev,
          `System event ${Math.floor(Math.random() * 1000)}: ${Math.random().toString(36).substring(2, 10)}`
        ].slice(-5));
      }

      // Update useless stats
      setUselessStats(prev => ({
        ...prev,
        serverLoad: Math.random() * 100,
        connections: Math.floor(Math.random() * 1000),
        sessionTimeout: Math.floor(Math.random() * 60) + 30,
        randomMetric: Math.random().toString(36).substring(2, 8),
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        networkLatency: Math.floor(Math.random() * 500),
        databaseQueries: prev.databaseQueries + Math.floor(Math.random() * 100),
        activeSessions: Math.floor(Math.random() * 500),
        pendingRequests: Math.floor(Math.random() * 50),
      }));

      // Random floating icons
      if (Math.random() > 0.8) {
        const newIcon = {
          id: Date.now(),
          x: Math.random() * 100,
          y: Math.random() * 100,
          icon: ['⚠️', '🔒', '🔄', '📊', '⚙️', '🔔', '🔍', '📈', '🛠️', '📡'][Math.floor(Math.random() * 10)],
        };
        setFloatingIcons(prev => [...prev, newIcon].slice(-8));
      }

      // Random blinking alerts
      if (Math.random() > 0.85) {
        const newAlert = {
          id: Date.now(),
          message: `Alert: ${Math.random().toString(36).substring(2, 10)}`,
        };
        setBlinkingAlerts(prev => [...prev, newAlert].slice(-3));
        setTimeout(() => {
          setBlinkingAlerts(prev => prev.filter(alert => alert.id !== newAlert.id));
        }, 5000);
      }

      // Random error banner
      if (Math.random() > 0.9) {
        setShowErrorBanner(true);
        setTimeout(() => setShowErrorBanner(false), 4000);
      }

      // Update maintenance countdown
      setMaintenanceCountdown(prev => {
        if (prev <= 1) return 300;
        return prev - 1;
      });

      // Update fake weather occasionally
      if (counter % 20 === 0) {
        setFakeWeather({
          temperature: Math.floor(Math.random() * 30) + 10,
          condition: ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Snowy'][Math.floor(Math.random() * 5)],
          location: ['New York', 'London', 'Tokyo', 'Sydney', 'Paris'][Math.floor(Math.random() * 5)]
        });
      }
    }, 3000);

    // Random popup
    // setTimeout(() => {
    //   setShowPopup(true);
    // }, 11000);

    // Additional random popup
    // setTimeout(() => {
    //   setShowAdditionalPopup(true);
    // }, 10000);

    return () => clearInterval(timer);
  }, [navigate, counter]);

  const handleLoginSuccess = () => {
    navigate('/success');
  };

  const handleSwitchToRegular = () => {
    if (showEmailPassword) {
      // This would be handled by component state in a real app
      // For this demo, just reload the page with the email_password route
      navigate('/auth/email_password/messy');
    } else {
      // Otherwise redirect to error
      navigate('/error');
    }
  };

  const generateRandomColorText = (text) => {
    return text.split('').map((char, i) => (
      <span key={i} style={{ color: `hsl(${Math.random() * 360}, 70%, 50%)` }}>
        {char}
      </span>
    ));
  };

  return (
    <div className="w-full h-screen overflow-auto bg-white shadow-md relative">
      {/* Background noise */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23000000' d='M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-1.5C87,13.4,81.3,26.8,73.6,38.6C65.9,50.4,56.1,60.6,44.2,67.1C32.4,73.7,18.6,76.7,4.7,74.9C-9.2,73.1,-23.1,66.6,-33.8,58.6C-44.4,50.7,-51.9,41.3,-58.9,31.1C-65.9,20.9,-72.4,10.4,-74.9,-1.5C-77.5,-13.4,-76.1,-26.8,-69.7,-37.2C-63.3,-47.6,-51.9,-55,-39.9,-62.5C-27.9,-69.9,-14,-77.5,1,-79.2C16,-80.8,32,-83.6,44.7,-76.4Z' transform='translate(100 100)' /%3E%3C/svg%3E")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'spin 120s linear infinite',
        }}
      />

      {/* Loading spinner that never stops */}
      <div className="fixed top-10 left-10 animate-spin text-4xl opacity-70">⏳</div>
      <div className="fixed bottom-10 right-10 animate-spin text-4xl opacity-70">⚙️</div>

      {/* Session info */}
      <div className="absolute top-0 right-0 bg-yellow-100 p-2 text-xs animate-pulse">
        Session timer: {counter}s | System health: {Math.floor(Math.random() * 100)}% | Users online: {Math.floor(Math.random() * 1000)}
      </div>

      {/* Maintenance countdown */}
      <div className="absolute top-0 left-0 bg-orange-100 p-2 text-xs">
        <span className="font-bold blink">⚠️ Server maintenance in: </span>
        <span>{Math.floor(maintenanceCountdown / 60)}:{(maintenanceCountdown % 60).toString().padStart(2, '0')}</span>
      </div>

      {/* News ticker */}
      <div className="absolute top-8 left-0 right-0 bg-blue-100 text-xs overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-marquee">
          {newsItems.map((item, i) => (
            <span key={i} className="mx-4">📣 {item} </span>
          ))}
          {newsItems.map((item, i) => (
            <span key={i + 'dup'} className="mx-4">📣 {item} </span>
          ))}
        </div>
      </div>

      {/* Floating icons */}
      {floatingIcons.map(icon => (
        <div
          key={icon.id}
          className="fixed text-2xl pointer-events-none z-10"
          style={{
            left: `${icon.x}%`,
            top: `${icon.y}%`,
            animation: `float ${5 + Math.random() * 10}s infinite`
          }}
        >
          {icon.icon}
        </div>
      ))}

      {/* Blinking alerts */}
      {blinkingAlerts.map(alert => (
        <div
          key={alert.id}
          className="fixed left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded z-20"
          style={{
            top: `${Math.random() * 30 + 15}%`,
            animation: 'blink 0.5s infinite'
          }}
        >
          {alert.message}
        </div>
      ))}

      {/* Error banner */}
      {showErrorBanner && (
        <div className="fixed top-16 left-0 right-0 bg-red-500 text-white text-center py-1 z-20">
          Error code {Math.floor(Math.random() * 1000)}: Error while loading the weather data
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 h-full pt-24">
        {/* Left sidebar */}
        <div className="col-span-1 bg-gray-50 p-4 overflow-y-auto h-full">
          <h3 className="text-lg font-bold mb-2">System Notices</h3>
          <div className="text-xs">
            {Array(20).fill(0).map((_, i) => (
              <div key={i} className="mb-2 p-1 border-b border-gray-200">
                Notice #{i+1}: {Math.random().toString(36).substring(2, 10)}
              </div>
            ))}
          </div>

          {/* Weather widget */}
          <div className="mt-6 p-3 bg-blue-50 rounded">
            <h4 className="font-bold text-sm">Current Weather</h4>
            <div className="flex items-center mt-1">
              <span className="text-2xl mr-2">
                {fakeWeather.condition === 'Sunny' ? '☀️' :
                 fakeWeather.condition === 'Cloudy' ? '☁️' :
                 fakeWeather.condition === 'Rainy' ? '🌧️' :
                 fakeWeather.condition === 'Stormy' ? '⛈️' : '❄️'}
              </span>
              <div>
                <div>{fakeWeather.location}</div>
                <div>{fakeWeather.temperature}°C, {fakeWeather.condition}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Login column */}
        <div className="col-span-2 flex flex-col justify-center items-center relative">
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
            {Array(50).fill(0).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${Math.random() * 50 + 10}px`,
                  height: `${Math.random() * 50 + 10}px`,
                  backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animation: `float ${5 + Math.random() * 15}s infinite linear`
                }}
              />
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 relative">
            {generateRandomColorText("Login Portal v3.8.2")}
            <span className="absolute -top-4 right-0 text-xs bg-green-100 px-1 rounded animate-pulse">BETA</span>
          </h2>

          <div className="mb-6 bg-blue-50 p-3 rounded text-xs w-full max-w-md">
            <p>Last login attempt: {new Date().toLocaleString()}</p>
            <p>Login server: SRV-{Math.floor(Math.random() * 100)}</p>
            <p>Session ID: {Math.random().toString(36).substring(2, 15)}</p>
            <p>IP Address: 192.168.{Math.floor(Math.random() * 255)}.{Math.floor(Math.random() * 255)}</p>
            <p>Browser fingerprint: {Math.random().toString(36).substring(2, 10)}-{Math.random().toString(36).substring(2, 6)}</p>
            <p>Authentication protocol: OAuth2-JWT-{Math.random().toString(36).substring(2, 6).toUpperCase()}</p>
          </div>

          <div className="w-full max-w-md relative">
            {/* Fake loading overlay */}
            <div
              className="absolute inset-0 bg-white bg-opacity-30 flex items-center justify-center z-10"
              style={{
                opacity: Math.random() > 0.85 ? '1' : '0',
                transition: 'opacity 0.5s ease',
                pointerEvents: 'none'
              }}
            >
              <div className="animate-spin text-2xl">🔄</div>
            </div>

            {/* Conditional rendering of auth components */}
            {showEmailPassword && !showStagedLogin && !showInstantLogin && !showCombinedInstantLogin && (
              <LoginForm onLoginSuccess={handleLoginSuccess} />
            )}

            {showStagedLogin && !showInstantLogin && !showCombinedInstantLogin && (
              <StagedLoginForm onLoginSuccess={handleLoginSuccess} />
            )}

            {showInstantLogin && !showCombinedInstantLogin && (
              <InstantLoginForm
                onLoginSuccess={handleLoginSuccess}
                onSwitchToRegular={handleSwitchToRegular}
              />
            )}

            {showCombinedInstantLogin && (
              <LoginWithInstantOption onLoginSuccess={handleLoginSuccess} />
            )}

            {showGoogleAuth && (
              <div className="mt-4">
                <GoogleOAuth onSuccess={handleLoginSuccess} />
              </div>
            )}
          </div>

          <div className="mt-4 text-center text-xs text-gray-400">
            Login page rendered in {(Math.random() * 1.5).toFixed(2)}s |
            Auth service latency: {Math.floor(Math.random() * 200)}ms |
            Session timeout: {Math.floor(Math.random() * 30) + 30} minutes
          </div>

          {/* Stock ticker */}
          <div className="mt-8 w-full max-w-md bg-gray-100 p-2 rounded overflow-hidden">
            <div className="text-xs font-bold mb-1">Market Updates (Completely Irrelevant)</div>
            <div className="flex justify-between text-xs">
              {fakeStocks.map((stock, i) => (
                <div key={i} className={stock.change > 0 ? "text-green-600" : "text-red-600"}>
                  {stock.symbol}: {stock.price.toFixed(2)}
                  <span className="ml-1">
                    {stock.change > 0 ? '↑' : '↓'} {Math.abs(stock.change)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="col-span-1 bg-gray-50 p-4 overflow-y-auto h-full">
          <h3 className="text-lg font-bold mb-2">System Metrics</h3>
          {Object.entries(uselessStats).map(([key, value]) => (
            <div key={key} className="flex justify-between mb-2 text-xs">
              <span>{key}:</span>
              <span className={value > 80 ? "text-red-600 font-bold" : (value > 50 ? "text-yellow-600" : "text-green-600")}>
                {typeof value === 'number' ? value.toFixed(2) : value}
                {key.includes('Usage') ? '%' : ''}
                {key.includes('Latency') ? 'ms' : ''}
              </span>
            </div>
          ))}

          <div className="mt-4">
            <h4 className="font-bold">Recent Activity</h4>
            <ul className="text-xs">
              {fakeNotifications.map((notif, i) => (
                <li key={i} className="p-1 border-b border-gray-200">{notif}</li>
              ))}
            </ul>
          </div>

          {/* Security alerts */}
          <div className="mt-4 bg-red-50 p-2 rounded">
            <h4 className="font-bold text-sm text-red-700">Security Alerts</h4>
            <ul className="text-xs text-red-600">
              <li className="mt-1">⚠️ {Math.floor(Math.random() * 10)} failed login attempts</li>
              <li className="mt-1">⚠️ Unusual activity detected from {['China', 'Russia', 'Nigeria', 'Unknown'][Math.floor(Math.random() * 4)]}</li>
              <li className="mt-1">⚠️ System scan: {Math.floor(Math.random() * 5)} potential vulnerabilities</li>
            </ul>
          </div>

          {/* Active users */}
          <div className="mt-4 bg-green-50 p-2 rounded">
            <h4 className="font-bold text-sm">Active Users</h4>
            <div className="flex flex-wrap mt-1">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center m-1 text-xs">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center m-1 text-xs">
                +{Math.floor(Math.random() * 100)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main popup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-20 z-50">
          <div className="bg-white p-4 rounded shadow-lg max-w-sm">
            <h3 className="font-bold">Important Notice</h3>
            <p className="my-2">This is a completely irrelevant popup that appears during login.</p>
            <button
              className="bg-blue-500 text-white px-3 py-1 rounded"
              onClick={() => setShowPopup(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Additional popup */}
      {showAdditionalPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-20 z-50">
          <div className="bg-white p-4 rounded shadow-lg max-w-sm">
            <h3 className="font-bold flex items-center">
              <span className="text-yellow-500 mr-2">⭐</span>
              Rate your experience
            </h3>
            <p className="my-2">How would you rate your login experience so far?</p>
            <div className="flex justify-center my-3">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className="text-2xl mx-1 cursor-pointer">⭐</span>
              ))}
            </div>
            <button
              className="bg-blue-500 text-white px-3 py-1 rounded"
              onClick={() => setShowAdditionalPopup(false)}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Bottom footer */}
      <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs text-gray-400">
        <span>Environment: TEST-{Math.random() * 100}</span>
        <span>API Version: {Math.random().toString(36).substring(2, 6)}</span>
        <span>Build: {Date.now().toString().substring(0, 10)}</span>
        <span>Deployment: {new Date().toISOString().split('T')[0]}</span>
        <span>Cache: {Math.random() > 0.5 ? 'MISS' : 'HIT'}</span>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(10px, -10px); }
          50% { transform: translate(0, 5px); }
          75% { transform: translate(-10px, -5px); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .blink {
          animation: blink 1s infinite;
        }

        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default MessyLoginPage;
