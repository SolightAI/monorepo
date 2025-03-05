import React, { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-black/50 backdrop-blur-sm z-20">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-white font-bold text-lg flex items-center">
          <img 
            src="https://landing.s3.fr-par.scw.cloud/laneo_logo.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=SCWB7NFAJGFMCHH3VF0F%2F20250305%2Ffr-par%2Fs3%2Faws4_request&X-Amz-Date=20250305T002257Z&X-Amz-Expires=3597&X-Amz-Signature=8e8ea8d5b6ee05a80416924e3cf8ade8b47a0bcb5b49c4e94dc0fd10fa0acf42&X-Amz-SignedHeaders=host&x-id=GetObject" 
            alt="Laneo Logo" 
            className="h-9 w-auto mr-2 invert brightness-0" 
          />
          Laneo
        </a>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Desktop navigation */}
        <nav className="hidden md:flex space-x-8 md:space-x-12 mx-auto">
          <a href="/" className="text-white hover:text-laneo-400 transition-colors font-medium text-base py-1">
            Home
          </a>
          <a href="/#features" className="text-white hover:text-laneo-400 transition-colors font-medium text-base py-1">
            Features
          </a>
          <a href="/#demo" className="text-white hover:text-laneo-400 transition-colors font-medium text-base py-1">
            Demo
          </a>
          <a href="/about" className="text-white hover:text-laneo-400 transition-colors font-medium text-base py-1 px-1 leading-relaxed">
            About Us
          </a>
        </nav>

        {/* CTA button - hidden on mobile */}
        <div className="hidden md:flex items-center">
          <a
            href="https://calendly.com/antoinelevy"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1.5 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors text-white text-xs font-medium"
          >
            Request a Demo
          </a>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-black/90 py-4">
          <nav className="flex flex-col space-y-4 px-4">
            <a href="/" className="text-white hover:text-laneo-400 transition-colors font-medium text-base py-1">
              Home
            </a>
            <a href="/#features" className="text-white hover:text-laneo-400 transition-colors font-medium text-base py-1">
              Features
            </a>
            <a href="/#demo" className="text-white hover:text-laneo-400 transition-colors font-medium text-base py-1">
              Demo
            </a>
            <a href="/about" className="text-white hover:text-laneo-400 transition-colors font-medium text-base py-1">
              About Us
            </a>
            <a
              href="https://calendly.com/antoinelevy"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors text-white text-xs font-medium w-fit"
            >
              Request a Demo
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}