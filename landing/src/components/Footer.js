import React from 'react';

export default function Footer() {
  return (
    <footer className="py-8 border-t border-white/10 bg-black relative z-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">&copy; 2025 Laneo. All rights reserved.</p>

          {/* Sign Up button in center */}
          <div className="my-4 md:my-0 relative z-10">
          </div>

          <div className="text-gray-400 text-sm">
            <a href="mailto:contact@laneo.io" className="text-blue-400 hover:text-white transition-colors">contact@laneo.io</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
