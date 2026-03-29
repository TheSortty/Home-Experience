import React, { useState, useEffect } from 'react';
import UserIcon from './icons/UserIcon';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onLoginClick: () => void;
  onStartClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLoginClick, onStartClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { role } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#coaching', label: 'Coaching' },
    { href: '#programs', label: 'Programas' },
    { href: '#retreats', label: 'Retiros' },
    { href: '#impact', label: 'Impacto' },
  ];

  // Add Testimonios link only for sysadmin
  if (role === 'sysadmin') {
    navLinks.push({ href: '#voices', label: 'Testimonios' });
  }

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    if (!href) return;

    if (href === '#home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsMenuOpen(false);
      return;
    }

    const targetElement = document.querySelector(href);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMenuOpen(false);
  };

  return (
    <header
      className={`w-full transition-all duration-300 ${isScrolled || isMenuOpen ? 'bg-white/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'
        }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <a href="#home" className="flex items-center gap-3 group" onClick={handleSmoothScroll} data-interactive="true">
          <img src="/logo-circle.png" alt="Home Experience" className="w-10 h-10 group-hover:scale-105 transition-transform" />
          <span className="text-xl font-bold tracking-widest text-slate-900">
            HOME<span className="text-blue-600">.</span>
          </span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={handleSmoothScroll}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors uppercase tracking-wide"
              data-interactive="true"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center space-x-4">
          <button
            onClick={onLoginClick}
            className="text-slate-600 hover:text-slate-900 flex items-center gap-2"
            data-interactive="true"
          >
            <span className="text-sm font-medium">Admin</span>
            <UserIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onStartClick}
            className="btn-join flex items-center justify-center text-sm px-6 py-2.5"
            data-interactive="true"
          >
            Empezar
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-slate-900 focus:outline-none"
            data-interactive="true"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-slate-100 shadow-xl lg:hidden">
          <div className="flex flex-col p-6 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleSmoothScroll}
                className="text-slate-900 text-lg font-medium"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={onLoginClick}
              className="text-left text-slate-900 text-lg font-medium pt-4 border-t border-slate-100"
            >
              Admin Login
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;