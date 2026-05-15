import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { IoSchoolOutline, IoArrowForwardCircleOutline } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onLoginClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLoginClick }) => {
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
          <Image src="/logo-circle.png" alt="Home Experience" width={40} height={40} priority className="w-10 h-10 group-hover:scale-105 transition-transform" />
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

        <div className="hidden lg:flex items-center">
          <button
            onClick={onLoginClick}
            className="campus-cta group relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A9CE]/60 focus-visible:ring-offset-2"
            data-interactive="true"
            aria-label="Acceder al Campus"
          >
            {/* Halo glow detrás del botón */}
            <span aria-hidden="true" className="campus-cta__halo" />
            {/* Borde gradiente animado */}
            <span aria-hidden="true" className="campus-cta__ring" />
            {/* Fondo interior */}
            <span aria-hidden="true" className="campus-cta__bg" />
            {/* Sweep shine on hover */}
            <span aria-hidden="true" className="campus-cta__shine" />

            <IoSchoolOutline className="campus-cta__icon relative z-10 w-[18px] h-[18px]" />
            <span className="campus-cta__label relative z-10 text-[12px] font-bold uppercase tracking-[0.18em]">
              Campus
            </span>
            <IoArrowForwardCircleOutline className="campus-cta__arrow relative z-10 w-[16px] h-[16px]" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
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
              className="flex items-center gap-3 text-left pt-4 border-t border-slate-100 group"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#00A9CE] to-blue-500 text-white shadow-md shadow-[#00A9CE]/30 group-hover:scale-105 transition-transform">
                <IoSchoolOutline className="w-5 h-5" />
              </span>
              <span className="text-slate-900 text-lg font-bold tracking-wide">
                Campus
                <span className="block text-xs font-medium text-slate-500 uppercase tracking-[0.18em]">Acceder</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;